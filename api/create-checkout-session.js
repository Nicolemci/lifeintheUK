const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");
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

function getRequestOrigin(request) {
  const originHeader = request.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const isHttps = parsedOrigin.protocol === "https:";
      const isLocalDevelopment =
        parsedOrigin.protocol === "http:" &&
        (parsedOrigin.hostname === "localhost" || parsedOrigin.hostname === "127.0.0.1");

      if (isHttps || isLocalDevelopment) {
        return parsedOrigin.origin;
      }
    } catch {
      // Fall through to trusted Vercel forwarding headers.
    }
  }

  const forwardedHostHeader = request.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader;

  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }

  return "http://localhost:5173";
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
  console.info("[create-checkout-session] Request received", {
    method: request.method,
    hasAuthorization: Boolean(request.headers.authorization),
    origin: request.headers.origin || null,
    forwardedHost: request.headers["x-forwarded-host"] || null,
  });

  if (request.method !== "POST") {
    console.warn("[create-checkout-session] Rejected non-POST method", {
      method: request.method,
    });
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    console.warn("[create-checkout-session] Missing bearer token");
    return response.status(401).json({ error: "Authentication is required." });
  }

  const { plan } = parseBody(request);

  if (typeof plan !== "string" || !isPremiumPlanId(plan)) {
    console.warn("[create-checkout-session] Invalid plan", { plan });
    return response.status(400).json({ error: "A valid Premium plan is required." });
  }

  try {
    const config = getStripeServerConfig();
    console.info("[create-checkout-session] Config loaded", {
      plan,
      priceId: config.priceIds[plan],
      supabaseHost: new URL(config.supabaseUrl).host,
      secretKeyPrefix: config.secretKey.slice(0, 7),
    });

    const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      logApiFailure("create-checkout-session", userError || "No user returned", {
        stage: "supabase.auth.getUser",
      });
      return response.status(401).json({ error: "Your session is invalid or has expired." });
    }

    console.info("[create-checkout-session] Authenticated user", {
      userId: user.id,
      hasEmail: Boolean(user.email),
    });

    const stripe = new Stripe(config.secretKey);
    const origin = getRequestOrigin(request);
    const metadata = {
      user_id: user.id,
      plan,
    };
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      client_reference_id: user.id,
      customer_email: user.email,
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

    console.info("[create-checkout-session] Checkout Session created", {
      userId: user.id,
      plan,
      checkoutSessionId: checkoutSession.id,
      origin,
    });

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
