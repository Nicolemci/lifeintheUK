import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import SignUpForm from "../auth/SignUpForm";
import { useAuth } from "../auth/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { PREMIUM_PLANS, isPremiumPlanId, type PremiumPlanId } from "../config/premium";
import { createCheckoutSession } from "../lib/checkout";
import { usePageMetadata } from "../seo/usePageMetadata";

type AccountMode = "sign-up" | "log-in";

export default function CheckoutAccountPage() {
  const [searchParams] = useSearchParams();
  const planParam = searchParams.get("plan")?.trim() ?? "";
  const planId = isPremiumPlanId(planParam) ? planParam : null;
  const selectedPlan = useMemo(
    () => PREMIUM_PLANS.find((plan) => plan.id === planId) ?? null,
    [planId],
  );

  const { user, loading: authLoading, signIn } = useAuth();
  const [mode, setMode] = useState<AccountMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState("");
  const checkoutStarted = useRef(false);

  usePageMetadata({
    title: "Account before checkout",
    description:
      "Create an account or log in before paying for Life in the UK Prep Premium.",
    path: "/checkout",
    noIndex: true,
  });

  async function startCheckout(plan: PremiumPlanId) {
    if (checkoutStarted.current) {
      return;
    }

    checkoutStarted.current = true;
    setStartingCheckout(true);
    setError("");

    try {
      const checkoutUrl = await createCheckoutSession(plan);
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      checkoutStarted.current = false;
      setStartingCheckout(false);
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start Stripe Checkout.",
      );
    }
  }

  useEffect(() => {
    if (!planId || authLoading || !user || checkoutStarted.current) {
      return;
    }

    void startCheckout(planId);
  }, [planId, authLoading, user]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email.trim(), password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!planId || !selectedPlan) {
    return <Navigate to="/upgrade" replace />;
  }

  if (authLoading || user || startingCheckout) {
    return (
      <main className="payment-page">
        <section className="card payment-card">
          <p className="eyebrow">Premium checkout</p>
          <h1>
            {user || startingCheckout
              ? "Opening Stripe Checkout…"
              : "Checking your account…"}
          </h1>
          <p>
            {selectedPlan.title} · {selectedPlan.price}
          </p>
          {error ? (
            <>
              <p className="form-error">{error}</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  checkoutStarted.current = false;
                  void startCheckout(planId);
                }}
              >
                Try checkout again
              </button>
              <Link className="secondary-button" to="/upgrade">
                Back to plans
              </Link>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-account-page">
      <header className="pricing-hero">
        <Link className="ghost-button" to="/upgrade">
          Back to plans
        </Link>
        <p className="british-kicker">Almost there</p>
        <h1>Set up your account before payment</h1>
        <p>
          Create an account or log in first. Then we will take you to Stripe Checkout to pay for{" "}
          <strong>
            {selectedPlan.title} ({selectedPlan.price})
          </strong>
          .
        </p>
      </header>

      <section className="card checkout-account-card">
        <div className="checkout-plan-summary">
          <p className="eyebrow">Selected plan</p>
          <h2>{selectedPlan.title}</h2>
          <p className="pricing-price">{selectedPlan.price}</p>
          <p>{selectedPlan.duration} access</p>
        </div>

        <div>
          <div className="checkout-account-tabs" role="tablist" aria-label="Account options">
            <button
              className={mode === "sign-up" ? "primary-button" : "secondary-button"}
              type="button"
              role="tab"
              aria-selected={mode === "sign-up"}
              onClick={() => {
                setMode("sign-up");
                setError("");
              }}
            >
              Create account
            </button>
            <button
              className={mode === "log-in" ? "primary-button" : "secondary-button"}
              type="button"
              role="tab"
              aria-selected={mode === "log-in"}
              onClick={() => {
                setMode("log-in");
                setError("");
              }}
            >
              Log in
            </button>
          </div>

          {mode === "sign-up" ? (
            <>
              <p className="checkout-account-help">
                Use your email and a password. After your account is created, Stripe Checkout opens
                automatically.
              </p>
              <SignUpForm
                submitLabel="Create account and continue to payment"
                onSuccess={() => {
                  // Logged-in effect starts Stripe Checkout.
                }}
              />
            </>
          ) : (
            <>
              <p className="checkout-account-help">
                Log in with your existing account. Stripe Checkout opens automatically after a
                successful login.
              </p>
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <PasswordInput
                  label="Password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                {error ? <p className="form-error">{error}</p> : null}
                <button className="primary-button" type="submit" disabled={submitting}>
                  {submitting ? "Logging in…" : "Log in and continue to payment"}
                </button>
              </form>
              <p className="checkout-account-help">
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
