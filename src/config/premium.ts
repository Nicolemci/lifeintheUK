export const FREE_MOCK_TEST_LIMIT = 5;

export const PREMIUM_PLAN_IDS = [
  "one_week",
  "two_weeks",
  "four_weeks",
  "lifetime",
] as const;

export type PremiumPlanId = (typeof PREMIUM_PLAN_IDS)[number];

export type PremiumPlan = {
  id: PremiumPlanId;
  title: string;
  price: string;
  duration: string;
  featured?: boolean;
  features: string[];
};

const unlimitedFeatures = [
  "Unlimited practice questions",
  "Unlimited mock tests",
];

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: "one_week",
    title: "1 Week Access",
    price: "£0.99",
    duration: "7 days",
    features: [...unlimitedFeatures, "Full Premium access for 7 days"],
  },
  {
    id: "two_weeks",
    title: "2 Week Access",
    price: "£1.99",
    duration: "14 days",
    features: [...unlimitedFeatures, "Full Premium access for 14 days"],
  },
  {
    id: "four_weeks",
    title: "4 Week Access",
    price: "£2.99",
    duration: "28 days",
    featured: true,
    features: [...unlimitedFeatures, "Full Premium access for 28 days"],
  },
  {
    id: "lifetime",
    title: "Lifetime Access",
    price: "£9.99",
    duration: "Lifetime",
    features: [
      "Lifetime Premium access",
      ...unlimitedFeatures,
      "All future Premium features included",
    ],
  },
];

export function isPremiumPlanId(value: string): value is PremiumPlanId {
  return PREMIUM_PLAN_IDS.includes(value as PremiumPlanId);
}
