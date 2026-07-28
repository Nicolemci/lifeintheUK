import type { PremiumPlanId } from "../../src/config/premium";

export type StripeServerEnvironment = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ONE_WEEK?: string;
  STRIPE_PRICE_TWO_WEEKS?: string;
  STRIPE_PRICE_FOUR_WEEKS?: string;
  STRIPE_PRICE_LIFETIME?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type StripeServerConfig = {
  secretKey: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  priceIds: Record<PremiumPlanId, string>;
};

export type StripeWebhookConfig = {
  secretKey: string;
  webhookSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

export function getStripeServerConfig(
  environment: StripeServerEnvironment = process.env,
): StripeServerConfig {
  const values = {
    STRIPE_SECRET_KEY: environment.STRIPE_SECRET_KEY?.trim(),
    STRIPE_PRICE_ONE_WEEK: environment.STRIPE_PRICE_ONE_WEEK?.trim(),
    STRIPE_PRICE_TWO_WEEKS: environment.STRIPE_PRICE_TWO_WEEKS?.trim(),
    STRIPE_PRICE_FOUR_WEEKS: environment.STRIPE_PRICE_FOUR_WEEKS?.trim(),
    STRIPE_PRICE_LIFETIME: environment.STRIPE_PRICE_LIFETIME?.trim(),
    VITE_SUPABASE_URL: environment.VITE_SUPABASE_URL?.trim(),
    VITE_SUPABASE_PUBLISHABLE_KEY: environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  };
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required server environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`,
    );
  }

  return {
    secretKey: values.STRIPE_SECRET_KEY!,
    supabaseUrl: values.VITE_SUPABASE_URL!,
    supabasePublishableKey: values.VITE_SUPABASE_PUBLISHABLE_KEY!,
    priceIds: {
      one_week: values.STRIPE_PRICE_ONE_WEEK!,
      two_weeks: values.STRIPE_PRICE_TWO_WEEKS!,
      four_weeks: values.STRIPE_PRICE_FOUR_WEEKS!,
      lifetime: values.STRIPE_PRICE_LIFETIME!,
    },
  };
}

export function getStripeWebhookConfig(
  environment: StripeServerEnvironment = process.env,
): StripeWebhookConfig {
  const values = {
    STRIPE_SECRET_KEY: environment.STRIPE_SECRET_KEY?.trim(),
    STRIPE_WEBHOOK_SECRET: environment.STRIPE_WEBHOOK_SECRET?.trim(),
    VITE_SUPABASE_URL: environment.VITE_SUPABASE_URL?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  };
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required webhook environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`,
    );
  }

  return {
    secretKey: values.STRIPE_SECRET_KEY!,
    webhookSecret: values.STRIPE_WEBHOOK_SECRET!,
    supabaseUrl: values.VITE_SUPABASE_URL!,
    supabaseServiceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY!,
  };
}
