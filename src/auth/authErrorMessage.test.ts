import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "./authErrorMessage";

describe("getAuthErrorMessage", () => {
  it("prefers Error.message when present", () => {
    expect(getAuthErrorMessage(new Error("Reset link failed"))).toBe("Reset link failed");
  });

  it("reads message-like fields from plain objects", () => {
    expect(getAuthErrorMessage({ msg: "Email rate limit exceeded" })).toBe(
      "Email rate limit exceeded",
    );
    expect(getAuthErrorMessage({ error_description: "Redirect not allowed" })).toBe(
      "Redirect not allowed",
    );
  });

  it("ignores useless {} messages from Supabase JSON.stringify fallbacks", () => {
    expect(getAuthErrorMessage(new Error("{}"), "Unable to send reset email.")).toBe(
      "Unable to send reset email.",
    );
    expect(getAuthErrorMessage("{}", "Unable to send reset email.")).toBe(
      "Unable to send reset email.",
    );
    expect(getAuthErrorMessage({}, "Unable to send reset email.")).toBe(
      "Unable to send reset email.",
    );
  });

  it("maps common auth status codes when no message is available", () => {
    expect(getAuthErrorMessage({ status: 429 }, "fallback")).toBe(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    expect(getAuthErrorMessage({ status: 500 }, "fallback")).toBe(
      "The authentication service is temporarily unavailable. Please try again shortly.",
    );
  });
});
