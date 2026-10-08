const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
const {
  applyCorsHeaders,
  handleCorsPreflight,
} = require("./_lib/cors");
const { getErrorMessage, logApiFailure } = require("./_lib/httpError");
const { findOrCreateUserByEmail } = require("./_lib/findOrCreateUserByEmail");
const { buildPremiumGrant, getCheckoutEmail } = require("./_lib/premiumGrant");
const { getPurchaseActivationConfig } = require("./_lib/stripeConfig");

function parseBody(request) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return request.body || {};
}

module.exports = async function activatePurchase(request, response) {
  applyCorsHeaders(request, response);

  if (handleCorsPreflight(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const body = parseBody(request);
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!sessionId.startsWith("cs_")) {
    return response.status(400).json({ error: "A valid Checkout Session ID is required." });
  }

  if (password.length < 6) {
    return response.status(400).json({ error: "Password must be at least 6 characters." });
  }

  let serverConfig;

  try {
    serverConfig = getPurchaseActivationConfig();
  } catch (configurationError) {
    logApiFailure("activate-purchase", configurationError, { stage: "config" });
    return response.status(500).json({
      error: "Purchase activation is not configured.",
      details: getErrorMessage(configurationError, "Missing environment variables"),
    });
  }

  try {
    const stripe = new Stripe(serverConfig.secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return response.status(400).json({ error: "This checkout has not been paid." });
    }

    const email = getCheckoutEmail(session);

    if (!email) {
      return response.status(400).json({ error: "No email was collected during checkout." });
    }

    const grant = buildPremiumGrant(session, session.created || Math.floor(Date.now() / 1000));
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

    const resolved = await findOrCreateUserByEmail(supabase, email);
    const { error: passwordError } = await supabase.auth.admin.updateUserById(resolved.userId, {
      password,
      email_confirm: true,
    });

    if (passwordError) {
      throw passwordError;
    }

    const { error: grantError } = await supabase.rpc("grant_premium_access_from_stripe", {
      p_user_id: resolved.userId,
      p_plan: grant.plan,
      p_purchase_date: grant.purchaseDate,
      p_expires_at: grant.expiresAt,
      p_is_lifetime: grant.isLifetime,
      p_stripe_checkout_session_id: grant.stripeCheckoutSessionId,
      p_stripe_customer_id: grant.stripeCustomerId,
    });

    if (grantError) {
      throw grantError;
    }

    return response.status(200).json({
      email,
      userId: resolved.userId,
    });
  } catch (error) {
    logApiFailure("activate-purchase", error, { stage: "activate", sessionId });
    return response.status(500).json({
      error: "Unable to finish account setup.",
      details: getErrorMessage(error, "Unknown activation error"),
    });
  }
};
