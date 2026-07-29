import ContentPage from "./ContentPage";
import { refundSections } from "./legalContent";

export default function RefundPolicyPage() {
  return (
    <ContentPage
      eyebrow="Premium purchases"
      title="Refund Policy"
      introduction="Our approach to refunds for Premium plans that provide immediate digital access."
      metaDescription="Read the Life in the UK Prep refund policy for immediate digital Premium access, duplicate payments and technical access issues."
      sections={refundSections}
    />
  );
}
