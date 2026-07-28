import { useState } from "react";
import { PREMIUM_PLANS, type PremiumPlanId } from "../config/premium";
import { createCheckoutSession } from "../lib/checkout";
import { usePremium } from "./PremiumContext";

export default function PricingCards() {
  const { loading, error: statusError, hasPremium } = usePremium();
  const [purchasingPlan, setPurchasingPlan] = useState<PremiumPlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  async function buyPlan(plan: PremiumPlanId) {
    setPurchasingPlan(plan);
    setCheckoutError("");

    try {
      const checkoutUrl = await createCheckoutSession(plan);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
      setPurchasingPlan(null);
    }
  }

  return (
    <>
      {statusError ? <p className="form-error pricing-status">{statusError}</p> : null}
      {checkoutError ? <p className="form-error pricing-status">{checkoutError}</p> : null}
      <section className="pricing-grid" aria-label="Premium plans">
        {PREMIUM_PLANS.map((plan) => (
          <article
            className={["card", "pricing-card", plan.featured ? "featured" : ""]
              .filter(Boolean)
              .join(" ")}
            key={plan.id}
          >
            {plan.featured ? <span className="pricing-popular">Popular</span> : null}
            <p className="eyebrow">{plan.duration}</p>
            <h2>{plan.title}</h2>
            <p className="pricing-price">{plan.price}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <button
              className={plan.featured ? "primary-button" : "secondary-button"}
              type="button"
              onClick={() => void buyPlan(plan.id)}
              disabled={loading || hasPremium || purchasingPlan !== null}
            >
              {purchasingPlan === plan.id
                ? "Opening Checkout…"
                : hasPremium
                  ? "Premium active"
                  : "Buy now"}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
