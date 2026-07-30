import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getErrorMessage, logApiFailure } from "./_lib/httpError";
import { buildPremiumGrant } from "./_lib/premiumGrant";
import { getStripeWebhookConfig } from "./_lib/stripeConfig";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(request: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function getStripeSignature(request: VercelRequest): string | null {
  const signature = request.headers["stripe-signature"];

  if (Array.isArray(signature)) {
    return signature[0] ?? null;
  }

  return signature ?? null;
}

export default async function stripeWebhook(request: VercelRequest, response: VercelResponse) {
  console.info("[stripe-webhook] Request received", {
    method: request.method,
    hasSignature: Boolean(request.headers["stripe-signature"]),
  });

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  let serverConfig: ReturnType<typeof getStripeWebhookConfig>;

  try {
    serverConfig = getStripeWebhookConfig();
  } catch (configurationError) {
    logApiFailure("stripe-webhook", configurationError, { stage: "config" });
    return response.status(500).json({
      error: "Webhook is not configured.",
      details: getErrorMessage(configurationError, "Missing webhook environment variables"),
    });
  }

  const signature = getStripeSignature(request);

  if (!signature) {
    console.warn("[stripe-webhook] Missing Stripe signature header");
    return response.status(400).json({ error: "Missing Stripe signature." });
  }

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(serverConfig.secretKey);
    const rawBody = await readRawBody(request);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverConfig.webhookSecret,
    );
  } catch (signatureError) {
    logApiFailure("stripe-webhook", signatureError, { stage: "signature" });
    return response.status(400).json({ error: "Invalid Stripe signature." });
  }

  console.info("[stripe-webhook] Event verified", {
    eventId: event.id,
    type: event.type,
  });

  if (event.type !== "checkout.session.completed") {
    return response.status(200).json({
      received: true,
      handled: false,
    });
  }

  const session = event.data.object;

  if (session.payment_status !== "paid") {
    console.info("[stripe-webhook] Ignoring unpaid completed session", {
      eventId: event.id,
      checkoutSessionId: session.id,
      paymentStatus: session.payment_status,
    });
    return response.status(200).json({
      received: true,
      handled: false,
    });
  }

  let grant: ReturnType<typeof buildPremiumGrant>;

  try {
    grant = buildPremiumGrant(session, event.created);
  } catch (metadataError) {
    logApiFailure("stripe-webhook", metadataError, {
      stage: "metadata",
      eventId: event.id,
      checkoutSessionId: session.id,
    });
    return response.status(400).json({ error: "Invalid Checkout Session metadata." });
  }

  try {
    const supabase = createClient(
      serverConfig.supabaseUrl,
      serverConfig.supabaseServiceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { data: applied, error: grantError } = await supabase.rpc(
      "grant_premium_access_from_stripe",
      {
        p_user_id: grant.userId,
        p_plan: grant.plan,
        p_purchase_date: grant.purchaseDate,
        p_expires_at: grant.expiresAt,
        p_is_lifetime: grant.isLifetime,
        p_stripe_checkout_session_id: grant.stripeCheckoutSessionId,
        p_stripe_customer_id: grant.stripeCustomerId,
      },
    );

    if (grantError) {
      throw grantError;
    }

    console.info("[stripe-webhook] Premium access granted", {
      eventId: event.id,
      checkoutSessionId: grant.stripeCheckoutSessionId,
      userId: grant.userId,
      plan: grant.plan,
      applied,
    });

    return response.status(200).json({
      received: true,
      handled: true,
      applied: applied === true,
    });
  } catch (databaseError) {
    logApiFailure("stripe-webhook", databaseError, {
      stage: "grant_premium_access_from_stripe",
      eventId: event.id,
      checkoutSessionId: grant.stripeCheckoutSessionId,
      userId: grant.userId,
    });
    return response.status(500).json({
      error: "Premium access could not be granted.",
      details: getErrorMessage(databaseError, "Unknown database error"),
    });
  }
}
