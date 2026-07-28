import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FREE_MOCK_TEST_LIMIT, PREMIUM_PLANS, type PremiumPlanId } from "../config/premium";
import { createCheckoutSession } from "../lib/checkout";
import { usePremium } from "./PremiumContext";

type PricingLocationState = {
  upgradeReason?: "mock-limit" | "expired" | "premium-required";
};

export default function PricingPage() {
  const location = useLocation();
  const {
    loading,
    error: statusError,
    hasPremium,
    isExpired,
    completedMockTests,
  } = usePremium();
  const [purchasingPlan, setPurchasingPlan] = useState<PremiumPlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const showLimitMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "mock-limit";
  const showExpiredMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "expired" ||
    isExpired;
  const showPremiumRequiredMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "premium-required";

  async function buyPlan(plan: PremiumPlanId) {
    setPurchasingPlan(plan);
    setCheckoutError("");

    try {
      const checkoutUrl = await createCheckoutSession(plan);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Unable to start checkout.");
      setPurchasingPlan(null);
    }
  }

  return (
    <main className="pricing-page">
      <header className="pricing-hero">
        <Link className="ghost-button" to="/">
          Back to study
        </Link>
        <p className="british-kicker">Premium access</p>
        <h1>Unlock unlimited Life in the UK preparation.</h1>
        <p>
          Choose the access period that suits your study plan. Checkout is securely hosted by
          Stripe.
        </p>
      </header>

      {showLimitMessage ? (
        <section className="card upgrade-notice" role="alert">
          <p className="eyebrow">Free test allowance used</p>
          <h2>You have completed all {FREE_MOCK_TEST_LIMIT} free mock tests.</h2>
          <p>Upgrade to Premium to continue taking unlimited mock tests.</p>
        </section>
      ) : null}

      {showExpiredMessage ? (
        <section className="card upgrade-notice" role="alert">
          <p className="eyebrow">Premium expired</p>
          <h2>Your previous Premium access has ended.</h2>
          <p>Choose a new plan below to restore unlimited access.</p>
        </section>
      ) : null}

      {showPremiumRequiredMessage ? (
        <section className="card upgrade-notice" role="alert">
          <p className="eyebrow">Premium feature</p>
          <h2>This area requires active Premium access.</h2>
          <p>Choose a plan below to unlock all Premium features.</p>
        </section>
      ) : null}

      {hasPremium ? (
        <div className="form-success pricing-status">
          Premium access is active. <Link to="/premium">Open Premium area</Link>
        </div>
      ) : null}
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

      <p className="pricing-footnote">
        Completed free mock tests: {completedMockTests} of {FREE_MOCK_TEST_LIMIT}. Premium access
        is activated only after Stripe confirms payment through the verified webhook.
      </p>
    </main>
  );
}
