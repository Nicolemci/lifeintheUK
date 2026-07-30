import { Link } from "react-router-dom";
import { PREMIUM_PLANS } from "../config/premium";
import { usePremium } from "./PremiumContext";

function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}

export default function PremiumHomePage() {
  const { activePlan, isLifetime, expiresAt } = usePremium();
  const plan = PREMIUM_PLANS.find((candidate) => candidate.id === activePlan);

  return (
    <main className="premium-home-page">
      <section className="card premium-home-card">
        <p className="british-kicker">Premium active</p>
        <h1>Your Premium study area</h1>
        <p>
          You have unlimited mock tests, unlimited practice questions, and access to all current
          Premium features.
        </p>
        <dl>
          <div>
            <dt>Plan</dt>
            <dd>{plan?.title ?? "Premium"}</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>
              {isLifetime
                ? "Lifetime"
                : expiresAt
                  ? `Active until ${formatExpiry(expiresAt)}`
                  : "Active"}
            </dd>
          </div>
        </dl>
        <div className="hero-actions">
          <Link className="primary-button" to="/">
            Continue studying
          </Link>
          <Link className="secondary-button" to="/pricing">
            View plans
          </Link>
        </div>
      </section>
    </main>
  );
}
