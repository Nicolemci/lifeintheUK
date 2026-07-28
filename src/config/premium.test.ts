import { describe, expect, it } from "vitest";
import {
  FREE_MOCK_TEST_LIMIT,
  isPremiumPlanId,
  PREMIUM_PLANS,
} from "./premium";

describe("Premium configuration", () => {
  it("keeps the free mock-test limit in one exported constant", () => {
    expect(FREE_MOCK_TEST_LIMIT).toBe(5);
  });

  it("defines all four required plans and prices", () => {
    expect(PREMIUM_PLANS.map(({ id, price }) => ({ id, price }))).toEqual([
      { id: "week", price: "£0.99" },
      { id: "two_weeks", price: "£1.99" },
      { id: "four_weeks", price: "£2.99" },
      { id: "lifetime", price: "£9.99" },
    ]);
  });

  it("validates plan IDs before sending them to Stripe", () => {
    expect(isPremiumPlanId("week")).toBe(true);
    expect(isPremiumPlanId("lifetime")).toBe(true);
    expect(isPremiumPlanId("free")).toBe(false);
  });
});
