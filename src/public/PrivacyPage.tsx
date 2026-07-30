import ContentPage from "./ContentPage";
import { privacySections } from "./legalContent";

export default function PrivacyPage() {
  const today = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <ContentPage
      eyebrow="Your information"
      title="Privacy Policy"
      introduction="How Life in the UK Prep collects, uses, protects and retains personal information."
      metaDescription="Read the Life in the UK Prep privacy policy, including UK GDPR rights, data use, retention, Stripe payments and service providers."
      updatedAt={`Last updated: ${today}`}
      sections={privacySections}
    />
  );
}
