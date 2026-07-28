import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { buildPremiumGrant } from "./premiumGrant";

const userId = "7b26ba2e-98f4-4d79-a523-7f31e16cb6f4";
const paidAt = Date.UTC(2026, 6, 28, 12, 0, 0) / 1000;

function checkoutSession(
  plan: string,
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_example",
    object: "checkout.session",
    payment_status: "paid",
    client_reference_id: userId,
    customer: "cus_example",
    metadata: {
      user_id: userId,
      plan,
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("Premium webhook grants", () => {
  it.each([
    ["one_week", 7],
    ["two_weeks", 14],
    ["four_weeks", 28],
  ])("calculates %s expiry from the verified payment time", (plan, days) => {
    const grant = buildPremiumGrant(checkoutSession(plan), paidAt);

    expect(grant.expiresAt).toBe(
      new Date((paidAt + days * 24 * 60 * 60) * 1000).toISOString(),
    );
    expect(grant.isLifetime).toBe(false);
  });

  it("creates lifetime access without an expiry", () => {
    const grant = buildPremiumGrant(checkoutSession("lifetime"), paidAt);

    expect(grant.expiresAt).toBeNull();
    expect(grant.isLifetime).toBe(true);
  });

  it("rejects unpaid, invalid, or mismatched sessions", () => {
    expect(() =>
      buildPremiumGrant(checkoutSession("one_week", { payment_status: "unpaid" }), paidAt),
    ).toThrow("not paid");
    expect(() => buildPremiumGrant(checkoutSession("unknown"), paidAt)).toThrow(
      "invalid plan",
    );
    expect(() =>
      buildPremiumGrant(
        checkoutSession("one_week", { client_reference_id: "different-user" }),
        paidAt,
      ),
    ).toThrow("do not match");
    expect(() =>
      buildPremiumGrant(checkoutSession("one_week", { customer: null }), paidAt),
    ).toThrow("no Stripe Customer ID");
  });
});
