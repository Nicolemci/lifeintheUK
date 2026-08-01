import { Link } from "react-router-dom";
import { usePageMetadata } from "../seo/usePageMetadata";

export default function PaymentCancelledPage() {
  usePageMetadata({
    title: "Payment cancelled",
    description: "Your Life in the UK Prep checkout was cancelled and no payment was taken.",
    path: "/payment-cancelled",
    noIndex: true,
  });

  return (
    <main className="payment-page">
      <section className="card payment-card cancelled">
        <span className="payment-icon" aria-hidden="true">
          ×
        </span>
        <p className="eyebrow">Checkout closed</p>
        <h1>Payment cancelled</h1>
        <p>No payment has been taken. You can choose a plan whenever you are ready.</p>
        <Link className="secondary-button" to="/pricing">
          Return to Pricing
        </Link>
      </section>
    </main>
  );
}
