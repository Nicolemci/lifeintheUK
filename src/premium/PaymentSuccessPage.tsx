import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { activateGuestPurchase, fetchCheckoutSession } from "../lib/checkout";
import { usePageMetadata } from "../seo/usePageMetadata";
import { usePremium } from "./PremiumContext";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() ?? "";
  const { user, signIn } = useAuth();
  const { hasPremium, error, refreshPremiumStatus } = usePremium();
  const [timedOut, setTimedOut] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState<string | null>(null);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(Boolean(sessionId));

  usePageMetadata({
    title: "Payment successful",
    description: "Your Life in the UK Prep Premium payment is being confirmed.",
    path: "/payment-success",
    noIndex: true,
  });

  const needsAccountSetup = useMemo(
    () => !user && guestCheckout && Boolean(checkoutEmail),
    [user, guestCheckout, checkoutEmail],
  );

  useEffect(() => {
    if (!sessionId) {
      setLoadingCheckout(false);
      return;
    }

    let cancelled = false;

    void fetchCheckoutSession(sessionId)
      .then((session) => {
        if (cancelled) {
          return;
        }

        setCheckoutEmail(session.email);
        setGuestCheckout(session.guestCheckout);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setSetupError(
            loadError instanceof Error ? loadError.message : "Unable to load checkout details.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCheckout(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (hasPremium) {
      navigate("/", { replace: true });
      return;
    }

    let checking = false;
    const pollTimer = window.setInterval(() => {
      if (!checking) {
        checking = true;
        void refreshPremiumStatus().finally(() => {
          checking = false;
        });
      }
    }, 1000);
    const timeoutTimer = window.setTimeout(() => {
      window.clearInterval(pollTimer);
      setTimedOut(true);
    }, 20_000);

    return () => {
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [hasPremium, navigate, refreshPremiumStatus, user]);

  async function handleAccountSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetupError("");
    setSetupSuccess("");

    if (password !== confirmPassword) {
      setSetupError("Passwords do not match.");
      return;
    }

    if (!sessionId) {
      setSetupError("Missing checkout session. Return from Stripe Checkout and try again.");
      return;
    }

    setSubmitting(true);

    try {
      const activated = await activateGuestPurchase(sessionId, password);
      await signIn(activated.email, password);
      setSetupSuccess("Account created. Premium access is being activated…");
      await refreshPremiumStatus();
      navigate("/", { replace: true });
    } catch (activationError) {
      setSetupError(
        activationError instanceof Error
          ? activationError.message
          : "Unable to finish account setup.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="payment-page">
      <section className="card payment-card success">
        <span className="payment-icon" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Payment successful</p>
        <h1>Thank you for your purchase</h1>

        {loadingCheckout ? <p>Confirming your checkout details…</p> : null}

        {needsAccountSetup ? (
          <>
            <p>
              Payment received for <strong>{checkoutEmail}</strong>. Set a password to finish
              creating your account and unlock Premium.
            </p>
            <form className="auth-form" onSubmit={handleAccountSetup}>
              <PasswordInput
                label="Password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {setupError ? <p className="form-error">{setupError}</p> : null}
              {setupSuccess ? <p className="form-success">{setupSuccess}</p> : null}
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account and continue"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p>
              {timedOut
                ? "Payment was received, but Premium activation is taking longer than expected."
                : "Premium access is being activated. You will return to the application automatically."}
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            {setupError ? <p className="form-error">{setupError}</p> : null}
            <Link className="primary-button" to="/">
              {timedOut ? "Return and check again" : "Return now"}
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
