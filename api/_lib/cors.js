const PUBLIC_SITE_ORIGIN = "https://www.lifeintheukprep.co";

const NATIVE_SHELL_ORIGINS = new Set([
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
]);

function getHeaderValue(headers, name) {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function isNativeShellOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    if (NATIVE_SHELL_ORIGINS.has(parsed.origin)) {
      return true;
    }

    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.protocol === "capacitor:" ||
      parsed.protocol === "ionic:"
    );
  } catch {
    return false;
  }
}

/**
 * Origin used for Stripe success/cancel URLs and absolute redirects.
 * Never return Capacitor/localhost origins — those are not reachable after Checkout.
 */
function getPublicAppOrigin(request) {
  const configured =
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();

  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.hostname === "lifeintheukprep.co") {
        parsed.hostname = "www.lifeintheukprep.co";
      }
      return parsed.origin;
    } catch {
      // Fall through.
    }
  }

  const originHeader = getHeaderValue(request.headers, "origin");
  if (originHeader && !isNativeShellOrigin(originHeader)) {
    try {
      const parsed = new URL(originHeader);
      const isHttps = parsed.protocol === "https:";
      const isLocalDev =
        parsed.protocol === "http:" &&
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
      if (isHttps || isLocalDev) {
        return parsed.origin;
      }
    } catch {
      // Fall through.
    }
  }

  const forwardedHost = getHeaderValue(request.headers, "x-forwarded-host");
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    return `https://${forwardedHost}`;
  }

  return PUBLIC_SITE_ORIGIN;
}

function applyCorsHeaders(request, response) {
  const origin = getHeaderValue(request.headers, "origin");

  if (!origin) {
    return;
  }

  let allowOrigin = null;

  try {
    const parsed = new URL(origin);
    if (isNativeShellOrigin(origin)) {
      allowOrigin = parsed.origin;
    } else if (
      parsed.hostname === "www.lifeintheukprep.co" ||
      parsed.hostname === "lifeintheukprep.co" ||
      parsed.hostname.endsWith(".vercel.app") ||
      ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        (parsed.protocol === "http:" || parsed.protocol === "https:"))
    ) {
      allowOrigin = parsed.origin;
    }
  } catch {
    return;
  }

  if (!allowOrigin) {
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", allowOrigin);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Vary", "Origin");
}

function handleCorsPreflight(request, response) {
  if (request.method !== "OPTIONS") {
    return false;
  }

  applyCorsHeaders(request, response);
  response.status(204).end();
  return true;
}

module.exports = {
  PUBLIC_SITE_ORIGIN,
  applyCorsHeaders,
  getPublicAppOrigin,
  handleCorsPreflight,
  isNativeShellOrigin,
};
