export type TestInfoSection = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const officialTestInfoSections: TestInfoSection[] = [
  {
    id: "overview",
    title: "Official test overview",
    summary:
      "The Life in the UK Test is required for many British citizenship and settlement applications.",
    bullets: [
      "Use only the official government service to book the test.",
      "You must book online at least 3 days in advance.",
      "The test costs GBP 50.",
      "There are over 30 test centres in the UK, and you choose the centre when booking.",
    ],
  },
  {
    id: "format",
    title: "Test format",
    summary:
      "The test checks knowledge of British traditions, customs and life in the UK.",
    bullets: [
      "You have 45 minutes.",
      "You answer 24 questions.",
      "You are tested only on information from the official Guide for New Residents.",
      "Study the official guide before booking or taking the real test.",
    ],
  },
  {
    id: "booking",
    title: "What you need to book",
    summary:
      "GOV.UK says you need a few details ready before booking the Life in the UK Test.",
    bullets: [
      "An email address.",
      "A debit or credit card.",
      "An accepted form of ID.",
      "The name on your booking must exactly match the name on the ID you use.",
    ],
  },
  {
    id: "id",
    title: "Accepted ID",
    summary:
      "You must use photo ID that looks like you. If you have an eVisa, GOV.UK says to use a share code.",
    bullets: [
      "eVisa share code from your UKVI account, if you have an eVisa.",
      "Valid passport.",
      "Valid EU, Swiss, Icelandic, Liechtenstein or Norwegian ID card.",
      "Valid travel document with a photo, but not an emergency travel document.",
      "BRP or BRC, subject to GOV.UK expiry-date rules.",
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility and special requests",
    summary:
      "You can make special requests when booking if you have a disability or need help accessing the centre.",
    bullets: [
      "Request extra equipment or support during the booking process.",
      "If you have changed gender and do not want previous details shown, contact the Home Office before booking.",
      "Use the official GOV.UK guidance for the latest accessibility and sensitive-booking instructions.",
    ],
  },
  {
    id: "exemptions",
    title: "When you do not need the test",
    summary:
      "Some people do not need to take the Life in the UK Test.",
    bullets: [
      "You are under 18.",
      "You are 65 or over.",
      "You have passed it before.",
      "You have a long-term physical or mental condition and provide the required evidence.",
    ],
  },
  {
    id: "help",
    title: "Official help",
    summary:
      "Use GOV.UK and the official Life in the UK Test Helpline for booking help.",
    bullets: [
      "Life in the UK Test Helpline email: support@lituk.psionline.com.",
      "Telephone: 0800 015 4245.",
      "Opening hours listed by GOV.UK: Monday to Friday, 8am to 8pm.",
      "For nationality enquiries where you do not have accepted ID, GOV.UK lists nationalityenquiries@homeoffice.gov.uk.",
    ],
  },
];
