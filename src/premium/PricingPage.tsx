import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FREE_MOCK_TEST_LIMIT } from "../config/premium";
import { usePageMetadata } from "../seo/usePageMetadata";
import { usePremium } from "./PremiumContext";
import PricingCards from "./PricingCards";

type PricingLocationState = {
  upgradeReason?: "mock-limit" | "expired" | "premium-required";
};

export default function PricingPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { hasPremium, isExpired } = usePremium();

  usePageMetadata({
    title: "Premium plans",
    description:
      "Compare Life in the UK Prep Premium plans by price and duration, then buy before creating an account.",
    path: "/pricing",
  });

  const showLimitMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "mock-limit";
  const showExpiredMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "expired" ||
    isExpired;
  const showPremiumRequiredMessage =
    (location.state as PricingLocationState | null)?.upgradeReason === "premium-required";

  return (
    <main className="pricing-page">
      <header className="pricing-hero">
        <Link className="ghost-button" to="/">
          Back to study
        </Link>
        <p className="british-kicker">Premium access</p>
        <h1>Choose your Premium plan</h1>
        <p>
          See prices and access length below. You can buy now — Stripe Checkout will collect your
          email, and you can set your account password after payment.
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

      <PricingCards />

      {!user && !hasPremium ? (
        <p className="pricing-footnote">
          Already have an account? <Link to="/login" state={{ from: { pathname: "/pricing" } }}>Sign in</Link>{" "}
          before buying if you want Premium linked to your existing login.
        </p>
      ) : null}
    </main>
  );
}
