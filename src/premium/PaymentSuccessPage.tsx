import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [secondsRemaining, setSecondsRemaining] = useState(5);

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, 5000);
    const countdownTimer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearTimeout(redirectTimer);
      window.clearInterval(countdownTimer);
    };
  }, [navigate]);

  return (
    <main className="payment-page">
      <section className="card payment-card success">
        <span className="payment-icon" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">Payment successful</p>
        <h1>Thank you for your purchase</h1>
        <p>Premium access is being activated.</p>
        <p>You will return to the application in {secondsRemaining} seconds.</p>
        <Link className="primary-button" to="/">
          Return now
        </Link>
      </section>
    </main>
  );
}
