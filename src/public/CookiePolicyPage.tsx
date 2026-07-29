import ContentPage from "./ContentPage";
import { cookieSections } from "./legalContent";

export default function CookiePolicyPage() {
  return (
    <ContentPage
      eyebrow="Browser technologies"
      title="Cookie Policy"
      introduction="How essential, authentication and security technologies support the website."
      metaDescription="Learn how Life in the UK Prep uses essential, authentication and security cookies and how to manage browser cookie settings."
      sections={cookieSections}
    />
  );
}
