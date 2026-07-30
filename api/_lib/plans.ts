/**
 * Server-side Premium plan allow-list.
 * Kept inside /api so Vercel serverless functions do not import from /src
 * (cross-folder imports commonly cause FUNCTION_INVOCATION_FAILED).
 */

export const PREMIUM_PLAN_IDS = [
  "one_week",
  "two_weeks",
  "four_weeks",
  "lifetime",
] as const;

export type PremiumPlanId = (typeof PREMIUM_PLAN_IDS)[number];

export function isPremiumPlanId(value: string): value is PremiumPlanId {
  return (PREMIUM_PLAN_IDS as readonly string[]).includes(value);
}
