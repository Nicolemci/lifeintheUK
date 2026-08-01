import PublicPageLayout from "./PublicPageLayout";
import { usePageMetadata } from "./usePageMetadata";

export default function ContactPage() {
  usePageMetadata({
    title: "Contact Us",
    description:
      "Contact Life in the UK Prep for help with your account, Premium access, payments or general enquiries.",
    path: "/contact",
  });

  return (
    <PublicPageLayout
      eyebrow="We're here to help"
      title="Contact Us"
      introduction="Need help with your account or Premium access?"
    >
      <section className="card contact-card">
        <div className="contact-illustration" aria-hidden="true">
          <svg viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" />
            <path d="M38 55h84v55H38z" />
            <path d="m40 58 40 31 40-31M40 107l28-27M120 107 92 80" />
          </svg>
        </div>
        <div>
          <p className="eyebrow">Email support</p>
          <h2>How can we help?</h2>
          <p>
            For account access, Premium purchases, payment questions, privacy requests or general
            support, email:
          </p>
          <a className="contact-email" href="mailto:support@lifeintheukprep.co">
            support@lifeintheukprep.co
          </a>
          <p className="contact-response-time">We aim to respond within 2 business days.</p>
        </div>
      </section>
    </PublicPageLayout>
  );
}
