/**
 * Server-side Premium plan allow-list for Vercel serverless functions.
 */

const PREMIUM_PLAN_IDS = ["one_week", "two_weeks", "four_weeks", "lifetime"];

function isPremiumPlanId(value) {
  return PREMIUM_PLAN_IDS.includes(value);
}

module.exports = {
  PREMIUM_PLAN_IDS,
  isPremiumPlanId,
};
