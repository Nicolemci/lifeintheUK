import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { usePageMetadata } from "../seo/usePageMetadata";
import PricingCards from "./PricingCards";

const premiumBenefits = [
  "Unlimited mock tests",
  "Unlimited practice questions",
  "Full question bank",
  "Detailed explanations",
  "Progress saved across devices",
];

export default function UpgradePage() {
  const { user, loading } = useAuth();

  usePageMetadata({
    title: "Upgrade to Premium",
    description:
      "Continue Life in the UK preparation with unlimited mock tests, full explanations and saved progress.",
    path: "/upgrade",
  });

  if (loading) {
    return <p className="empty-state">Checking your session…</p>;
  }

  if (user) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <main className="upgrade-page">
      <header className="card upgrade-hero">
        <p className="british-kicker">A great milestone</p>
        <h1>Continue with Premium</h1>
        <p>
          You have used the free mock-test allowance. Choose a Premium plan below to keep practising.
          You can pay first — account setup happens during checkout with your email.
        </p>
        <div className="hero-actions">
          <Link className="secondary-button" to="/results-history">
            Review My Previous Results
          </Link>
          <Link className="ghost-button" to="/">
            Return to study
          </Link>
        </div>
      </header>

      <section className="card upgrade-benefits" aria-labelledby="premium-benefits-title">
        <p className="eyebrow">Continue your preparation</p>
        <h2 id="premium-benefits-title">Premium includes</h2>
        <ul>
          {premiumBenefits.map((benefit) => (
            <li key={benefit}>✓ {benefit}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="upgrade-plans-title">
        <div className="section-heading">
          <p className="eyebrow">Plans and prices</p>
          <h2 id="upgrade-plans-title">Buy Premium now</h2>
          <p>
            Pick a duration, pay securely with Stripe, then set your password on the success page to
            finish creating your account.
          </p>
        </div>
        <PricingCards />
      </section>
    </main>
  );
}
