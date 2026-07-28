import { describe, expect, it } from "vitest";
import { validateSupabaseConfig } from "./supabase";

describe("Supabase configuration", () => {
  it("returns validated configuration", () => {
    expect(
      validateSupabaseConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
  });

  it("lists missing required environment variables", () => {
    expect(() => validateSupabaseConfig({})).toThrow(
      "VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("rejects invalid and insecure Supabase URLs", () => {
    expect(() =>
      validateSupabaseConfig({
        VITE_SUPABASE_URL: "not-a-url",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toThrow("valid HTTPS URL");

    expect(() =>
      validateSupabaseConfig({
        VITE_SUPABASE_URL: "http://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toThrow("must use HTTPS");
  });
});
