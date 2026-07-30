const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
const { getErrorMessage, logApiFailure } = require("./_lib/httpError");
const { buildPremiumGrant } = require("./_lib/premiumGrant");
const { getStripeWebhookConfig } = require("./_lib/stripeConfig");

module.exports = async function stripeWebhook(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  let serverConfig;

  try {
    serverConfig = getStripeWebhookConfig();
  } catch (configurationError) {
    logApiFailure("stripe-webhook", configurationError, { stage: "config" });
    return response.status(500).json({
      error: "Webhook is not configured.",
      details: getErrorMessage(configurationError, "Missing webhook environment variables"),
    });
  }

  const signatureHeader = request.headers["stripe-signature"];
  const signature = Array.isArray(signatureHeader)
    ? signatureHeader[0]
    : signatureHeader;

  if (!signature) {
    return response.status(400).json({ error: "Missing Stripe signature." });
  }

  let event;

  try {
    const stripe = new Stripe(serverConfig.secretKey);
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      serverConfig.webhookSecret,
    );
  } catch (signatureError) {
    logApiFailure("stripe-webhook", signatureError, { stage: "signature" });
    return response.status(400).json({ error: "Invalid Stripe signature." });
  }

  if (event.type !== "checkout.session.completed") {
    return response.status(200).json({
      received: true,
      handled: false,
    });
  }

  const session = event.data.object;

  if (session.payment_status !== "paid") {
    return response.status(200).json({
      received: true,
      handled: false,
    });
  }

  let grant;

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
};

// Disable Vercel body parsing so Stripe signature verification receives the raw body.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
