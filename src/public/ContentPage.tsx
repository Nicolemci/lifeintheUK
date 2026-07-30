import type { ReactNode } from "react";
import PublicPageLayout from "./PublicPageLayout";
import { usePageMetadata } from "./usePageMetadata";

export type ContentSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  extra?: ReactNode;
};

type ContentPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  metaDescription: string;
  sections: ContentSection[];
  updatedAt?: string;
};

function renderText(text: string): ReactNode {
  const email = "support@lifeintheukprep.co";
  const parts = text.split(email);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 ? <a href={`mailto:${email}`}>{email}</a> : null}
    </span>
  ));
}

export default function ContentPage({
  eyebrow,
  title,
  introduction,
  metaDescription,
  sections,
  updatedAt,
}: ContentPageProps) {
  usePageMetadata(title, metaDescription);

  return (
    <PublicPageLayout
      eyebrow={eyebrow}
      title={title}
      introduction={introduction}
      updatedAt={updatedAt}
    >
      <div className="content-section-grid">
        {sections.map((section) => (
          <section className="card content-section-card" id={section.id} key={section.id}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{renderText(paragraph)}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{renderText(bullet)}</li>
                ))}
              </ul>
            ) : null}
            {section.extra}
          </section>
        ))}
      </div>
    </PublicPageLayout>
  );
}
