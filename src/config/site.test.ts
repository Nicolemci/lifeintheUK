import { describe, expect, it } from "vitest";
import { AUTH_SITE_URL, authRedirectUrl } from "./site";

describe("auth redirect helpers", () => {
  it("uses the www host for password-reset links", () => {
    expect(AUTH_SITE_URL).toBe("https://www.lifeintheukprep.co");
    expect(authRedirectUrl("/reset-password")).toBe(
      "https://www.lifeintheukprep.co/reset-password",
    );
  });
});
