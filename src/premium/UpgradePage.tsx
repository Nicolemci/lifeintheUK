import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import SignUpForm from "../auth/SignUpForm";

const premiumBenefits = [
  "Unlimited mock tests",
  "Unlimited practice questions",
  "Full question bank",
  "Detailed explanations",
  "Progress saved across devices",
];

export default function UpgradePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
        <h1>🎉 You've Completed All 5 Free Mock Tests</h1>
        <p>
          Congratulations on the progress you have made. You have now used all five mock tests
          included for visitors. Create a free account to continue, save this progress to your
          account and choose a Premium plan.
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

      <section className="card upgrade-account" aria-labelledby="upgrade-account-title">
        <div>
          <p className="eyebrow">One quick step</p>
          <h2 id="upgrade-account-title">Create your account</h2>
          <p>
            You only need an email address and password. Your session stays signed in on this
            device, and your anonymous progress will be transferred securely.
          </p>
          <p>
            Already registered?{" "}
            <Link to="/login" state={{ from: { pathname: "/pricing" } }}>
              Sign in instead
            </Link>
          </p>
        </div>
        <SignUpForm
          submitLabel="Create account and view plans"
          onSuccess={() => navigate("/pricing", { replace: true })}
        />
      </section>
    </main>
  );
}
