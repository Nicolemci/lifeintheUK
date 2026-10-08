const Stripe = require("stripe");
const {
  applyCorsHeaders,
  handleCorsPreflight,
} = require("./_lib/cors");
const { getErrorMessage, logApiFailure } = require("./_lib/httpError");
const { getCheckoutEmail } = require("./_lib/premiumGrant");
const { getStripeServerConfig } = require("./_lib/stripeConfig");

module.exports = async function getCheckoutSession(request, response) {
  applyCorsHeaders(request, response);

  if (handleCorsPreflight(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET, OPTIONS");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const sessionId =
    typeof request.query?.session_id === "string" ? request.query.session_id.trim() : "";

  if (!sessionId.startsWith("cs_")) {
    return response.status(400).json({ error: "A valid Checkout Session ID is required." });
  }

  try {
    const config = getStripeServerConfig();
    const stripe = new Stripe(config.secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = getCheckoutEmail(session);

    return response.status(200).json({
      id: session.id,
      paymentStatus: session.payment_status,
      plan: typeof session.metadata?.plan === "string" ? session.metadata.plan : null,
      email,
      guestCheckout: session.metadata?.guest_checkout === "true" || !session.metadata?.user_id,
    });
  } catch (error) {
    logApiFailure("checkout-session", error, { stage: "retrieve", sessionId });
    return response.status(500).json({
      error: "Unable to load checkout details.",
      details: getErrorMessage(error, "Unknown Stripe error"),
    });
  }
};
