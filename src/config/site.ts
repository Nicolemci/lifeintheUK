import seoRoutes from "./seo-routes.json";

const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

export const SITE_NAME = seoRoutes.siteName;
export const SITE_URL = (configuredUrl || seoRoutes.defaultSiteUrl).replace(/\/+$/, "");
export const DEFAULT_DESCRIPTION = seoRoutes.defaultDescription;
export const DEFAULT_OG_IMAGE_PATH = seoRoutes.defaultOgImagePath;
export const SUPPORT_EMAIL = "support@lifeintheukprep.co";

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
}

export function absoluteAssetUrl(path: string): string {
  return absoluteUrl(path);
}
