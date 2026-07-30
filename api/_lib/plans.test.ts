import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { isPremiumPlanId } = require("./plans.js");

describe("server Premium plan allow-list", () => {
  it("accepts only known plan IDs", () => {
    expect(isPremiumPlanId("one_week")).toBe(true);
    expect(isPremiumPlanId("lifetime")).toBe(true);
    expect(isPremiumPlanId("free")).toBe(false);
  });
});
