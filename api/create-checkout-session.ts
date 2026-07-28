import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { isPremiumPlanId } from "../src/config/premium";
import { getStripeServerConfig } from "./_lib/stripeConfig";

type CheckoutRequestBody = {
  plan?: unknown;
};

function getBearerToken(request: VercelRequest): string | null {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function getRequestOrigin(request: VercelRequest): string {
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

function parseBody(request: VercelRequest): CheckoutRequestBody {
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as CheckoutRequestBody;
    } catch {
      return {};
    }
  }

  return (request.body ?? {}) as CheckoutRequestBody;
}

export default async function createCheckoutSession(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return response.status(401).json({ error: "Authentication is required." });
  }

  const { plan } = parseBody(request);

  if (typeof plan !== "string" || !isPremiumPlanId(plan)) {
    return response.status(400).json({ error: "A valid Premium plan is required." });
  }

  try {
    const config = getStripeServerConfig();
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
      return response.status(401).json({ error: "Your session is invalid or has expired." });
    }

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

    return response.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Unable to create Stripe Checkout Session:", error);
    return response.status(500).json({
      error: "Unable to start checkout. Please try again.",
    });
  }
}
