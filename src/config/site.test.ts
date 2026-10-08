import { describe, expect, it } from "vitest";
import { AUTH_SITE_URL, apiUrl, authRedirectUrl } from "./site";

describe("auth redirect helpers", () => {
  it("uses the www host for password-reset links", () => {
    expect(AUTH_SITE_URL).toBe("https://www.lifeintheukprep.co");
    expect(authRedirectUrl("/reset-password")).toBe(
      "https://www.lifeintheukprep.co/reset-password",
    );
  });

  it("builds absolute API URLs for the Capacitor shell", () => {
    expect(apiUrl("/api/create-checkout-session")).toBe(
      "https://www.lifeintheukprep.co/api/create-checkout-session",
    );
    expect(apiUrl("https://example.com/api/x")).toBe("https://example.com/api/x");
  });
});
