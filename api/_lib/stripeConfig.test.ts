import { describe, expect, it } from "vitest";
import { getStripeServerConfig } from "./stripeConfig";

const validEnvironment = {
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_PRICE_ONE_WEEK: "price_week",
  STRIPE_PRICE_TWO_WEEKS: "price_two_weeks",
  STRIPE_PRICE_FOUR_WEEKS: "price_four_weeks",
  STRIPE_PRICE_LIFETIME: "price_lifetime",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("Stripe server configuration", () => {
  it("maps trusted server Price IDs to public plan IDs", () => {
    expect(getStripeServerConfig(validEnvironment).priceIds).toEqual({
      week: "price_week",
      two_weeks: "price_two_weeks",
      four_weeks: "price_four_weeks",
      lifetime: "price_lifetime",
    });
  });

  it("reports every missing server variable", () => {
    expect(() => getStripeServerConfig({})).toThrow("STRIPE_SECRET_KEY");
    expect(() => getStripeServerConfig({})).toThrow("STRIPE_PRICE_LIFETIME");
    expect(() => getStripeServerConfig({})).toThrow("VITE_SUPABASE_URL");
  });
});
