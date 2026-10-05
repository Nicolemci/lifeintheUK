import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FREE_MOCK_TEST_LIMIT } from "../config/premium";
import { usePageMetadata } from "../seo/usePageMetadata";
import { usePremium } from "./PremiumContext";
import PricingCards from "./PricingCards";

type UpgradeLocationState = {
  upgradeReason?: "mock-limit" | "expired" | "premium-required";
};

export default function UpgradePage() {
  const location = useLocation();
  const { user } = useAuth();
  const { hasPremium, isExpired } = usePremium();

  usePageMetadata({
    title: "Premium plans",
    description:
      "Compare Life in the UK Prep Premium plans by price and duration. Create an account or log in, then pay with Stripe.",
    path: "/upgrade",
  });

  const upgradeReason = (location.state as UpgradeLocationState | null)?.upgradeReason;
  const showLimitMessage = upgradeReason === "mock-limit";
  const showExpiredMessage = upgradeReason === "expired" || isExpired;
  const showPremiumRequiredMessage = upgradeReason === "premium-required";

  return (
    <main className="upgrade-page">
      <header className="pricing-hero">
        <Link className="ghost-button" to="/">
          Back to study
        </Link>
        <p className="british-kicker">Premium access</p>
        <h1>Choose your Premium plan</h1>
        <p>
          See prices and access length below. Choose a plan, create an account or log in, then
          continue to Stripe Checkout to pay.
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

      <section className="card upgrade-benefits" aria-labelledby="premium-benefits-title">
        <p className="eyebrow">Continue your preparation</p>
        <h2 id="premium-benefits-title">Premium includes</h2>
        <ul>
          <li>✓ Unlimited mock tests</li>
          <li>✓ Unlimited practice questions</li>
          <li>✓ Full question bank</li>
          <li>✓ Detailed explanations</li>
          <li>✓ Progress saved across devices</li>
        </ul>
      </section>

      <section aria-labelledby="upgrade-plans-title">
        <div className="section-heading">
          <p className="eyebrow">Plans and prices</p>
          <h2 id="upgrade-plans-title">Buy Premium now</h2>
          <p>
            Pick a duration, then create an account or log in. After that, Stripe Checkout opens so
            you can pay securely.
          </p>
        </div>
        <PricingCards />
      </section>

      {!user && !hasPremium ? (
        <p className="pricing-footnote">
          Already have an account?{" "}
          <Link to="/login" state={{ from: { pathname: "/upgrade" } }}>
            Sign in
          </Link>{" "}
          first, then choose a plan to go straight to payment.
        </p>
      ) : null}
    </main>
  );
}
