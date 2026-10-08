import seoRoutes from "./seo-routes.json";

const configuredUrl = import.meta.env.VITE_SITE_URL?.trim();

export const SITE_NAME = seoRoutes.siteName;
export const SITE_URL = (configuredUrl || seoRoutes.defaultSiteUrl).replace(/\/+$/, "");
export const DEFAULT_DESCRIPTION = seoRoutes.defaultDescription;
export const DEFAULT_OG_IMAGE_PATH = seoRoutes.defaultOgImagePath;
export const SUPPORT_EMAIL = "support@lifeintheukprep.co";

/** Prefer the www host for auth emails — apex redirects and dead preview URLs break reset links. */
export const AUTH_SITE_URL = (() => {
  try {
    const parsed = new URL(SITE_URL);
    if (parsed.hostname === "lifeintheukprep.co") {
      parsed.hostname = "www.lifeintheukprep.co";
    }
    return parsed.origin;
  } catch {
    return "https://www.lifeintheukprep.co";
  }
})();

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

export function authRedirectUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${AUTH_SITE_URL}${normalized}`;
}

/**
 * Absolute API URL for Capacitor / native shells.
 * Relative `/api/...` paths resolve against capacitor:// or https://localhost
 * and miss the Vercel backend — always call the live site origin instead.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${AUTH_SITE_URL}${normalized}`;
}
