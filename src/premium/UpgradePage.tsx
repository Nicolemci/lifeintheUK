import { Link } from "react-router-dom";
import PricingCards from "./PricingCards";

const premiumBenefits = [
  "Unlimited mock tests",
  "Unlimited practice questions",
  "Full question bank",
  "Detailed explanations",
  "Progress saved across devices",
];

export default function UpgradePage() {
  return (
    <main className="upgrade-page">
      <header className="card upgrade-hero">
        <p className="british-kicker">A great milestone</p>
        <h1>🎉 You've Completed All 5 Free Mock Tests</h1>
        <p>
          Congratulations on the progress you have made. You have now used all five mock tests
          included with your free account. Premium lets you continue practising without limits
          whenever you feel ready.
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
          <p className="eyebrow">Simple one-off access</p>
          <h2 id="upgrade-plans-title">Choose the plan that suits you</h2>
          <p>Secure payment is handled by hosted Stripe Checkout.</p>
        </div>
        <PricingCards />
      </section>
    </main>
  );
}
