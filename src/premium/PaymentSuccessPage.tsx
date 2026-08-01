import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageMetadata } from "../seo/usePageMetadata";
import { usePremium } from "./PremiumContext";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { hasPremium, error, refreshPremiumStatus } = usePremium();
  const [timedOut, setTimedOut] = useState(false);

  usePageMetadata({
    title: "Payment successful",
    description: "Your Life in the UK Prep Premium payment is being confirmed.",
    path: "/payment-success",
    noIndex: true,
  });

  useEffect(() => {
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
  }, [hasPremium, navigate, refreshPremiumStatus]);

  return (
    <main className="payment-page">
      <section className="card payment-card success">
        <span className="payment-icon" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Payment successful</p>
        <h1>Thank you for your purchase</h1>
        <p>
          {timedOut
            ? "Payment was received, but Premium activation is taking longer than expected."
            : "Premium access is being activated. You will return to the application automatically."}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <Link className="primary-button" to="/">
          {timedOut ? "Return and check again" : "Return now"}
        </Link>
      </section>
    </main>
  );
}
