const { isPremiumPlanId } = require("./plans");

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function getStripeServerConfig(environment = process.env) {
  const values = {
    STRIPE_SECRET_KEY: firstNonEmpty(environment.STRIPE_SECRET_KEY),
    STRIPE_PRICE_ONE_WEEK: firstNonEmpty(
      environment.STRIPE_PRICE_ONE_WEEK,
      environment.STRIPE_PRICE_1_WEEK,
    ),
    STRIPE_PRICE_TWO_WEEKS: firstNonEmpty(
      environment.STRIPE_PRICE_TWO_WEEKS,
      environment.STRIPE_PRICE_2_WEEKS,
    ),
    STRIPE_PRICE_FOUR_WEEKS: firstNonEmpty(
      environment.STRIPE_PRICE_FOUR_WEEKS,
      environment.STRIPE_PRICE_4_WEEKS,
    ),
    STRIPE_PRICE_LIFETIME: firstNonEmpty(environment.STRIPE_PRICE_LIFETIME),
    VITE_SUPABASE_URL: firstNonEmpty(environment.VITE_SUPABASE_URL),
    VITE_SUPABASE_PUBLISHABLE_KEY: firstNonEmpty(
      environment.VITE_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    console.error("[stripeConfig] Missing checkout environment variables", {
      missingVariables,
    });
    throw new Error(
      `Missing required server environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`,
    );
  }

  return {
    secretKey: values.STRIPE_SECRET_KEY,
    supabaseUrl: values.VITE_SUPABASE_URL,
    supabasePublishableKey: values.VITE_SUPABASE_PUBLISHABLE_KEY,
    priceIds: {
      one_week: values.STRIPE_PRICE_ONE_WEEK,
      two_weeks: values.STRIPE_PRICE_TWO_WEEKS,
      four_weeks: values.STRIPE_PRICE_FOUR_WEEKS,
      lifetime: values.STRIPE_PRICE_LIFETIME,
    },
  };
}

function getStripeWebhookConfig(environment = process.env) {
  const values = {
    STRIPE_SECRET_KEY: firstNonEmpty(environment.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: firstNonEmpty(environment.STRIPE_WEBHOOK_SECRET),
    VITE_SUPABASE_URL: firstNonEmpty(environment.VITE_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: firstNonEmpty(environment.SUPABASE_SERVICE_ROLE_KEY),
  };
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    console.error("[stripeConfig] Missing webhook environment variables", {
      missingVariables,
    });
    throw new Error(
      `Missing required webhook environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`,
    );
  }

  return {
    secretKey: values.STRIPE_SECRET_KEY,
    webhookSecret: values.STRIPE_WEBHOOK_SECRET,
    supabaseUrl: values.VITE_SUPABASE_URL,
    supabaseServiceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
  };
}

module.exports = {
  getStripeServerConfig,
  getStripeWebhookConfig,
  isPremiumPlanId,
};
