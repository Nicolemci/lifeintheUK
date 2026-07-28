import type Stripe from "stripe";
import { isPremiumPlanId, type PremiumPlanId } from "../../src/config/premium";

const PLAN_DURATION_DAYS: Partial<Record<PremiumPlanId, number>> = {
  one_week: 7,
  two_weeks: 14,
  four_weeks: 28,
};

export type PremiumGrant = {
  userId: string;
  plan: PremiumPlanId;
  purchaseDate: string;
  expiresAt: string | null;
  isLifetime: boolean;
  stripeCheckoutSessionId: string;
  stripeCustomerId: string;
};

function getStripeCustomerId(customer: Stripe.Checkout.Session["customer"]): string | null {
  if (typeof customer === "string") {
    return customer;
  }

  return customer?.id ?? null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function buildPremiumGrant(
  session: Stripe.Checkout.Session,
  paidAtUnixSeconds: number,
): PremiumGrant {
  if (session.payment_status !== "paid") {
    throw new Error(`Checkout Session ${session.id} is not paid.`);
  }

  const userId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const customerId = getStripeCustomerId(session.customer);

  if (!userId || !isUuid(userId)) {
    throw new Error(`Checkout Session ${session.id} has invalid user metadata.`);
  }

  if (session.client_reference_id !== userId) {
    throw new Error(`Checkout Session ${session.id} user references do not match.`);
  }

  if (!plan || !isPremiumPlanId(plan)) {
    throw new Error(`Checkout Session ${session.id} has invalid plan metadata.`);
  }

  if (!customerId) {
    throw new Error(`Checkout Session ${session.id} has no Stripe Customer ID.`);
  }

  const purchaseDate = new Date(paidAtUnixSeconds * 1000);

  if (Number.isNaN(purchaseDate.getTime())) {
    throw new Error("Stripe event has an invalid creation time.");
  }

  const isLifetime = plan === "lifetime";
  const durationDays = PLAN_DURATION_DAYS[plan];
  const expiresAt =
    durationDays === undefined
      ? null
      : new Date(purchaseDate.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    userId,
    plan,
    purchaseDate: purchaseDate.toISOString(),
    expiresAt,
    isLifetime,
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: customerId,
  };
}
