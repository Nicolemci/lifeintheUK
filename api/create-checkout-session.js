const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
const {
  applyCorsHeaders,
  getPublicAppOrigin,
  handleCorsPreflight,
} = require("./_lib/cors");
const { getErrorMessage, logApiFailure } = require("./_lib/httpError");
const { isPremiumPlanId } = require("./_lib/plans");
const { getStripeServerConfig } = require("./_lib/stripeConfig");

function getBearerToken(request) {
  const authorization = request.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function parseBody(request) {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch (error) {
      logApiFailure("create-checkout-session", error, { stage: "parseBody" });
      return {};
    }
  }

  return request.body || {};
}

module.exports = async function createCheckoutSession(request, response) {
  applyCorsHeaders(request, response);

  if (handleCorsPreflight(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const accessToken = getBearerToken(request);
  const { plan } = parseBody(request);

  if (typeof plan !== "string" || !isPremiumPlanId(plan)) {
    return response.status(400).json({ error: "A valid Premium plan is required." });
  }

  try {
    const config = getStripeServerConfig();
    const stripe = new Stripe(config.secretKey);
    // Never use Capacitor https://localhost as Stripe return URLs.
    const origin = getPublicAppOrigin(request);
    let user = null;

    if (accessToken) {
      const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      const {
        data: { user: authenticatedUser },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !authenticatedUser) {
        logApiFailure("create-checkout-session", userError || "No user returned", {
          stage: "supabase.auth.getUser",
        });
        return response.status(401).json({ error: "Your session is invalid or has expired." });
      }

      user = authenticatedUser;
    }

    const metadata = user
      ? {
          user_id: user.id,
          plan,
          guest_checkout: "false",
        }
      : {
          plan,
          guest_checkout: "true",
        };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      ...(user
        ? {
            client_reference_id: user.id,
            customer_email: user.email,
          }
        : {}),
      line_items: [
        {
          price: config.priceIds[plan],
          quantity: 1,
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    return response.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    logApiFailure("create-checkout-session", error, {
      stage: "createSession",
      plan,
    });
    return response.status(500).json({
      error: "Unable to start checkout. Please try again.",
      code: "checkout_session_failed",
      details: getErrorMessage(error, "Unknown checkout failure"),
    });
  }
};
