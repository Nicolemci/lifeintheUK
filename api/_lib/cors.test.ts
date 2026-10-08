import { describe, expect, it } from "vitest";
import {
  getPublicAppOrigin,
  isNativeShellOrigin,
} from "./cors.js";

describe("cors helpers for Capacitor", () => {
  it("detects native shell origins", () => {
    expect(isNativeShellOrigin("https://localhost")).toBe(true);
    expect(isNativeShellOrigin("capacitor://localhost")).toBe(true);
    expect(isNativeShellOrigin("https://www.lifeintheukprep.co")).toBe(false);
  });

  it("never uses Capacitor localhost for Stripe return URLs", () => {
    const origin = getPublicAppOrigin({
      headers: { origin: "https://localhost" },
    });
    expect(origin).toBe("https://www.lifeintheukprep.co");
  });
});
