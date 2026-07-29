import ContentPage from "./ContentPage";

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="Our purpose"
      title="About Life in the UK Prep"
      introduction="Practical, confidence-building preparation for an important step in your UK journey."
      metaDescription="Learn why Life in the UK Prep was created and how realistic mock tests, practice questions and progress tracking support learners."
      sections={[
        {
          id: "our-story",
          title: "Why we created Life in the UK Prep",
          paragraphs: [
            "Life in the UK Prep was created to help people prepare for the official Life in the UK Test with confidence.",
            "Our goal is to provide high-quality practice questions, realistic mock tests and a simple learning experience that helps users succeed.",
          ],
        },
        {
          id: "who-we-help",
          title: "Designed around your journey",
          paragraphs: [
            "Whether you're applying for British Citizenship or Indefinite Leave to Remain, our platform is designed to make studying easier through realistic practice and progress tracking.",
          ],
          bullets: [
            "Timed mock tests based on the official format.",
            "Focused topic practice and detailed explanations.",
            "Cross-device progress and wrong-question revision.",
            "Affordable Premium options without recurring subscriptions.",
          ],
        },
        {
          id: "mission",
          title: "Our mission",
          paragraphs: [
            "Our mission is to make preparation accessible, affordable and effective.",
            "We want learners to understand the material—not simply memorise answers—so they can approach the official test with greater confidence.",
          ],
        },
      ]}
    />
  );
}
