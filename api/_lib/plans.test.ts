import { describe, expect, it } from "vitest";
import { isPremiumPlanId } from "./plans";

describe("server Premium plan allow-list", () => {
  it("accepts only known plan IDs", () => {
    expect(isPremiumPlanId("one_week")).toBe(true);
    expect(isPremiumPlanId("lifetime")).toBe(true);
    expect(isPremiumPlanId("free")).toBe(false);
  });
});
