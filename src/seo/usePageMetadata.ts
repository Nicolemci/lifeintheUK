import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE_PATH,
  SITE_NAME,
  absoluteAssetUrl,
  absoluteUrl,
} from "../config/site";

export type PageMetadataInput = {
  title: string;
  description: string;
  /** Path for the canonical URL. Defaults to the current router location. */
  path?: string;
  ogType?: "website" | "article";
  imagePath?: string;
  noIndex?: boolean;
  /** When false, title is used as-is without the site name suffix. */
  appendSiteName?: boolean;
};

type ManagedNode = {
  element: HTMLElement;
  created: boolean;
  previousContent?: string | null;
  previousHref?: string | null;
};

function upsertMetaByName(name: string, content: string): ManagedNode {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !element;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  const previousContent = element.getAttribute("content");
  element.setAttribute("content", content);
  return { element, created, previousContent };
}

function upsertMetaByProperty(property: string, content: string): ManagedNode {
  let element = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  const created = !element;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  const previousContent = element.getAttribute("content");
  element.setAttribute("content", content);
  return { element, created, previousContent };
}

function upsertLink(rel: string, href: string): ManagedNode {
  let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  const created = !element;

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  const previousHref = element.getAttribute("href");
  element.setAttribute("href", href);
  return { element, created, previousHref };
}

function upsertJsonLd(id: string, data: Record<string, unknown>): ManagedNode {
  let element = document.querySelector<HTMLScriptElement>(`script[data-seo-jsonld="${id}"]`);
  const created = !element;

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.setAttribute("data-seo-jsonld", id);
    document.head.appendChild(element);
  }

  const previousContent = element.textContent;
  element.textContent = JSON.stringify(data);
  return { element, created, previousContent };
}

function restoreNode(node: ManagedNode, kind: "meta" | "link" | "script") {
  if (node.created) {
    node.element.remove();
    return;
  }

  if (kind === "link") {
    if (node.previousHref == null) {
      node.element.removeAttribute("href");
    } else {
      node.element.setAttribute("href", node.previousHref);
    }
    return;
  }

  if (kind === "script") {
    node.element.textContent = node.previousContent ?? "";
    return;
  }

  if (node.previousContent == null) {
    node.element.removeAttribute("content");
  } else {
    node.element.setAttribute("content", node.previousContent);
  }
}

/**
 * Sets document title, description, canonical URL, Open Graph, Twitter card,
 * robots directives, and WebPage JSON-LD for the current view.
 */
export function usePageMetadata({
  title,
  description,
  path,
  ogType = "website",
  imagePath = DEFAULT_OG_IMAGE_PATH,
  noIndex = false,
  appendSiteName = true,
}: PageMetadataInput) {
  const location = useLocation();
  const resolvedPath = path ?? (location.pathname || "/");

  useEffect(() => {
    const previousTitle = document.title;
    const pageTitle = appendSiteName ? `${title} | ${SITE_NAME}` : title;
    const canonical = absoluteUrl(resolvedPath.split("?")[0] || "/");
    const imageUrl = absoluteAssetUrl(imagePath);
    const robotsContent = noIndex ? "noindex, nofollow" : "index, follow";
    const managed: Array<{ node: ManagedNode; kind: "meta" | "link" | "script" }> = [];

    document.title = pageTitle;

    managed.push({ node: upsertMetaByName("description", description || DEFAULT_DESCRIPTION), kind: "meta" });
    managed.push({ node: upsertMetaByName("robots", robotsContent), kind: "meta" });
    managed.push({ node: upsertLink("canonical", canonical), kind: "link" });

    managed.push({ node: upsertMetaByProperty("og:site_name", SITE_NAME), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:type", ogType), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:title", pageTitle), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:description", description), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:url", canonical), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:image", imageUrl), kind: "meta" });
    managed.push({ node: upsertMetaByProperty("og:locale", "en_GB"), kind: "meta" });

    managed.push({ node: upsertMetaByName("twitter:card", "summary_large_image"), kind: "meta" });
    managed.push({ node: upsertMetaByName("twitter:title", pageTitle), kind: "meta" });
    managed.push({ node: upsertMetaByName("twitter:description", description), kind: "meta" });
    managed.push({ node: upsertMetaByName("twitter:image", imageUrl), kind: "meta" });

    managed.push({
      node: upsertJsonLd("webpage", {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageTitle,
        description,
        url: canonical,
        isPartOf: {
          "@type": "WebSite",
          name: SITE_NAME,
          url: absoluteUrl("/"),
        },
      }),
      kind: "script",
    });

    return () => {
      document.title = previousTitle;
      managed.forEach(({ node, kind }) => restoreNode(node, kind));
    };
  }, [appendSiteName, description, imagePath, noIndex, ogType, resolvedPath, title]);
}

/** Backwards-compatible helper used by existing public pages. */
export function useSimplePageMetadata(title: string, description: string, path?: string) {
  usePageMetadata({ title, description, path });
}
