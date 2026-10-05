const { isPremiumPlanId } = require("./plans");

const PLAN_DURATION_DAYS = {
  one_week: 7,
  two_weeks: 14,
  four_weeks: 28,
};

function getStripeCustomerId(customer) {
  if (typeof customer === "string") {
    return customer;
  }

  return customer?.id ?? null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getCheckoutEmail(session) {
  const candidates = [
    session.customer_details?.email,
    session.customer_email,
    session.metadata?.email,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
  }

  return null;
}

function buildPremiumGrant(session, paidAtUnixSeconds) {
  if (session.payment_status !== "paid") {
    throw new Error(`Checkout Session ${session.id} is not paid.`);
  }

  const metadataUserId = session.metadata?.user_id;
  const plan = session.metadata?.plan;
  const customerId = getStripeCustomerId(session.customer);
  const email = getCheckoutEmail(session);
  const isGuestCheckout =
    session.metadata?.guest_checkout === "true" ||
    (!metadataUserId && Boolean(email));

  let userId = null;

  if (metadataUserId) {
    if (!isUuid(metadataUserId)) {
      throw new Error(`Checkout Session ${session.id} has invalid user metadata.`);
    }

    if (session.client_reference_id && session.client_reference_id !== metadataUserId) {
      throw new Error(`Checkout Session ${session.id} user references do not match.`);
    }

    userId = metadataUserId;
  } else if (!isGuestCheckout) {
    throw new Error(`Checkout Session ${session.id} has invalid user metadata.`);
  }

  if (!plan || !isPremiumPlanId(plan)) {
    throw new Error(`Checkout Session ${session.id} has invalid plan metadata.`);
  }

  if (!customerId) {
    throw new Error(`Checkout Session ${session.id} has no Stripe Customer ID.`);
  }

  if (isGuestCheckout && !email) {
    throw new Error(`Checkout Session ${session.id} has no customer email for guest checkout.`);
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
    email,
    isGuestCheckout,
    plan,
    purchaseDate: purchaseDate.toISOString(),
    expiresAt,
    isLifetime,
    stripeCheckoutSessionId: session.id,
    stripeCustomerId: customerId,
  };
}

module.exports = {
  buildPremiumGrant,
  getCheckoutEmail,
};
