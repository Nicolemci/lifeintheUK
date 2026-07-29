import ContentPage from "./ContentPage";
import { termsSections } from "./legalContent";

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Using our service"
      title="Terms & Conditions"
      introduction="The terms that apply when you create an account, study, or purchase Premium access."
      metaDescription="Review the Life in the UK Prep terms and conditions covering accounts, acceptable use, Premium access, payments and governing law."
      sections={termsSections}
    />
  );
}
