import { describe, expect, it } from "vitest";
import { derivePremiumStatus, type PremiumAccessRow } from "./PremiumContext";

const now = Date.UTC(2026, 6, 28, 12, 0, 0);

function access(overrides: Partial<PremiumAccessRow> = {}): PremiumAccessRow {
  return {
    plan: "one_week",
    expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    is_lifetime: false,
    ...overrides,
  };
}

describe("centralized Premium status", () => {
  it("treats lifetime access as active without an expiry", () => {
    expect(
      derivePremiumStatus(
        access({ plan: "lifetime", expires_at: null, is_lifetime: true }),
        now,
      ),
    ).toMatchObject({
      hasPremium: true,
      isLifetime: true,
      isExpired: false,
      activePlan: "lifetime",
    });
  });

  it("treats a future expiry as active", () => {
    expect(derivePremiumStatus(access(), now)).toMatchObject({
      hasPremium: true,
      isLifetime: false,
      isExpired: false,
      activePlan: "one_week",
    });
  });

  it("treats an elapsed expiry as free and expired", () => {
    expect(
      derivePremiumStatus(
        access({ expires_at: new Date(now - 1000).toISOString() }),
        now,
      ),
    ).toMatchObject({
      hasPremium: false,
      isLifetime: false,
      isExpired: true,
      activePlan: null,
      latestPlan: "one_week",
    });
  });

  it("treats a user without an entitlement as free but not expired", () => {
    expect(derivePremiumStatus(null, now)).toEqual({
      hasPremium: false,
      isLifetime: false,
      isExpired: false,
      activePlan: null,
      latestPlan: null,
      expiresAt: null,
    });
  });
});
