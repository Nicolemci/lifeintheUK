import type { ContentSection } from "./ContentPage";

export const privacySections: ContentSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    paragraphs: [
      "Life in the UK Prep is an online educational platform helping users prepare for the official Life in the UK Test through practice questions, mock tests, revision tools and progress tracking.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    bullets: [
      "Email address and account information.",
      "Quiz progress, answers and mock-test results.",
      "Premium access and purchase status.",
      "Device and browser information where reasonably required for security, fraud prevention and reliable operation.",
      "Support messages and other information you choose to send us.",
      "Payment information is processed securely by Stripe and is never stored by Life in the UK Prep.",
    ],
  },
  {
    id: "how-we-use-information",
    title: "How we use your information",
    bullets: [
      "Create, secure and manage your account.",
      "Save and synchronise your learning progress.",
      "Process Premium purchases and confirm access.",
      "Operate, troubleshoot and improve our services.",
      "Prevent misuse, fraud and security incidents.",
      "Respond to support and data-rights enquiries.",
    ],
  },
  {
    id: "legal-basis",
    title: "Our legal basis",
    paragraphs: [
      "We process account and learning information where it is necessary to provide the service you request, to meet legal obligations, and for legitimate interests such as service security and improvement. Where consent is required, you may withdraw it at any time.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services",
    paragraphs: [
      "We use trusted service providers to operate the platform. They process information only for their relevant service and under their own privacy and security obligations.",
    ],
    bullets: [
      "Supabase — authentication and PostgreSQL database services.",
      "Stripe — secure payment processing and payment confirmation.",
      "Vercel — website hosting, serverless functions and delivery.",
    ],
  },
  {
    id: "retention",
    title: "Data retention",
    paragraphs: [
      "Account and learning information is normally retained while your account remains active. You may request deletion, after which information will be removed or anonymised unless retention is required for legal, security, fraud-prevention or financial-record obligations.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Subject to UK data-protection law, you may ask us to exercise applicable rights concerning your personal information.",
    ],
    bullets: [
      "Access the personal data we hold about you.",
      "Correct inaccurate or incomplete information.",
      "Request deletion of your account and personal data.",
      "Request restriction of, or object to, certain processing.",
      "Receive portable data where the right to data portability applies.",
      "Complain to the UK Information Commissioner's Office.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [
      "For privacy enquiries or to exercise your rights, email nicolemci@hotmail.com.",
      "This policy is intended to comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.",
    ],
  },
];

export const termsSections: ContentSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    paragraphs: [
      "These Terms & Conditions govern access to and use of Life in the UK Prep. By creating an account or using the platform, you agree to these terms.",
    ],
  },
  {
    id: "educational-purpose",
    title: "Educational purpose",
    paragraphs: [
      "The platform provides independent educational and revision materials. It is not operated by the UK government, does not administer the official Life in the UK Test, and cannot guarantee that any user will pass.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    paragraphs: [
      "You must provide accurate account information, keep login credentials confidential and notify us if you suspect unauthorised access. You are responsible for activity carried out through your account.",
    ],
  },
  {
    id: "responsibilities",
    title: "User responsibilities",
    bullets: [
      "Use the platform lawfully and for personal study.",
      "Keep account and payment information accurate.",
      "Review current official government guidance before booking a test.",
      "Ensure your device and internet connection are suitable for using the service.",
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    paragraphs: [
      "You must not misuse, disrupt, scrape, reverse engineer or attempt unauthorised access to the platform; share Premium access; automate question extraction; upload malicious material; or use content for unlawful or competing commercial services.",
    ],
  },
  {
    id: "premium-access",
    title: "Premium access",
    paragraphs: [
      "Premium access applies for the purchased period or for the lifetime of the service where Lifetime Access is selected. Premium is personal to the purchasing account and begins after successful payment confirmation.",
    ],
  },
  {
    id: "payments",
    title: "Payments",
    paragraphs: [
      "Prices are shown before Checkout and payments are processed by Stripe. You authorise the displayed one-off charge when confirming Checkout. We do not store full card information.",
    ],
  },
  {
    id: "digital-services",
    title: "Digital services",
    paragraphs: [
      "Premium plans provide digital content and functionality immediately after activation. Availability may occasionally be interrupted for maintenance, security or circumstances outside our reasonable control.",
    ],
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    paragraphs: [
      "The platform design, original questions, explanations, software and branding are protected by intellectual-property law. Access gives you a limited, personal, non-transferable right to use the service for study; it does not transfer ownership.",
    ],
  },
  {
    id: "termination",
    title: "Termination of accounts",
    paragraphs: [
      "We may suspend or terminate accounts involved in fraud, unlawful activity, security threats, account sharing or material breach of these terms. You may stop using the service and request account deletion at any time.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    paragraphs: [
      "We aim to provide accurate, useful preparation materials, but official guidance and test content can change. Users should consult the latest official handbook and GOV.UK information. The service is provided without a guarantee of examination success.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "Nothing in these terms excludes liability that cannot legally be excluded. To the extent permitted by law, we are not liable for indirect or consequential loss, loss caused by misuse, or decisions made solely from revision content. Our total liability relating to a paid plan will not exceed the amount paid for that plan.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    paragraphs: [
      "We may update these terms to reflect service, legal or security changes. Material updates will be identified by a revised date or appropriate notice. Continued use after an update means the revised terms apply.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    paragraphs: [
      "These Terms & Conditions are governed by the laws of England and Wales. The courts of England and Wales will have jurisdiction, subject to any mandatory consumer rights that apply where you live.",
    ],
  },
  {
    id: "terms-contact",
    title: "Contact",
    paragraphs: ["Questions about these terms can be sent to nicolemci@hotmail.com."],
  },
];

export const refundSections: ContentSection[] = [
  {
    id: "digital-access",
    title: "Immediate digital access",
    paragraphs: [
      "Premium plans provide immediate access to digital study features after payment is confirmed. By purchasing and beginning Premium access, you request that digital supply starts immediately.",
    ],
  },
  {
    id: "general-position",
    title: "General refund position",
    paragraphs: [
      "Because Premium access begins immediately, refunds are generally not available once Premium has been activated or used. This does not affect rights that cannot be excluded under applicable consumer law.",
    ],
  },
  {
    id: "considered-refunds",
    title: "When a refund may be considered",
    bullets: [
      "A duplicate payment was taken for the same intended purchase.",
      "A verified technical issue prevented access and we could not resolve it within a reasonable period.",
      "The payment was unauthorised, subject to appropriate verification.",
      "Applicable legal obligations require a refund.",
    ],
  },
  {
    id: "request-refund",
    title: "How to request a review",
    paragraphs: [
      "Email nicolemci@hotmail.com with your account email, payment date, purchased plan and a brief explanation. Do not send full card details. We may request the Stripe receipt or Checkout reference.",
    ],
  },
  {
    id: "refund-times",
    title: "Approved refunds",
    paragraphs: [
      "If approved, a refund will normally be returned through Stripe to the original payment method. Bank processing times vary and are outside our control. Refunded or disputed purchases may result in Premium access being removed.",
    ],
  },
];

export const cookieSections: ContentSection[] = [
  {
    id: "what-are-cookies",
    title: "What cookies are",
    paragraphs: [
      "Cookies and similar browser storage technologies are small pieces of information used to keep websites secure, remember sessions and support functionality.",
    ],
  },
  {
    id: "essential-cookies",
    title: "Essential cookies and storage",
    paragraphs: [
      "Essential technologies are required for core operation, such as maintaining your authenticated session, protecting account access, preserving security state and remembering necessary application settings. The service may not function correctly without them.",
    ],
  },
  {
    id: "authentication-cookies",
    title: "Authentication cookies",
    paragraphs: [
      "Supabase authentication uses browser storage and related session technologies to keep you logged in, refresh secure tokens and restore your account after a page refresh.",
    ],
  },
  {
    id: "security-cookies",
    title: "Security cookies",
    paragraphs: [
      "Security technologies may be used to prevent abuse, verify legitimate requests, protect payment flows and help Vercel, Supabase or Stripe detect malicious activity.",
    ],
  },
  {
    id: "analytics-cookies",
    title: "Analytics cookies",
    paragraphs: [
      "Analytics cookies are not required for basic use. If analytics are enabled in the future, this policy and any consent controls will be updated before non-essential analytics cookies are used where consent is required.",
    ],
  },
  {
    id: "third-party-cookies",
    title: "Third-party services",
    paragraphs: [
      "Supabase, Stripe and Vercel may set or use essential technologies when providing authentication, hosted Checkout, fraud prevention, hosting and security. Their handling is governed by their own policies.",
    ],
  },
  {
    id: "cookie-controls",
    title: "Managing cookies",
    paragraphs: [
      "You can block or delete cookies through your browser's privacy settings. Blocking essential cookies or browser storage may sign you out or prevent authentication, payment and saved-progress features from working.",
      "Questions about cookie use can be sent to nicolemci@hotmail.com.",
    ],
  },
];
