import { useEffect } from "react";

export function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title;
    let descriptionMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previousDescription = descriptionMeta?.content ?? "";
    const createdMeta = !descriptionMeta;

    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }

    document.title = `${title} | Life in the UK Prep`;
    descriptionMeta.content = description;

    return () => {
      document.title = previousTitle;

      if (createdMeta) {
        descriptionMeta?.remove();
      } else if (descriptionMeta) {
        descriptionMeta.content = previousDescription;
      }
    };
  }, [title, description]);
}
