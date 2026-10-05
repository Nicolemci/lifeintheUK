import type { PremiumPlanId } from "../config/premium";

type CheckoutResponse = {
  url?: unknown;
  error?: unknown;
  details?: unknown;
  code?: unknown;
};

function extractErrorMessage(payload: CheckoutResponse, fallback: string): string {
  if (typeof payload.error === "string" && payload.error.trim()) {
    if (typeof payload.details === "string" && payload.details.trim()) {
      return `${payload.error} (${payload.details})`;
    }

    return payload.error;
  }

  return fallback;
}

export async function createCheckoutSession(plan: PremiumPlanId): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const { getSupabaseClient } = await import("./supabase");
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Guest checkout is allowed when Supabase session is unavailable.
  }

  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers,
    body: JSON.stringify({ plan }),
  });

  const rawBody = await response.text();
  let data: CheckoutResponse = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody) as CheckoutResponse;
    } catch {
      throw new Error(
        `Unable to start Stripe Checkout. The API returned a non-JSON response (${response.status}).`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, "Unable to start Stripe Checkout."));
  }

  if (typeof data.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe returned an invalid Checkout URL.");
  }

  return data.url;
}

export type CheckoutSessionSummary = {
  id: string;
  paymentStatus: string;
  plan: PremiumPlanId | null;
  email: string | null;
  guestCheckout: boolean;
};

export async function fetchCheckoutSession(sessionId: string): Promise<CheckoutSessionSummary> {
  const response = await fetch(
    `/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
  );
  const data = (await response.json()) as CheckoutSessionSummary & CheckoutResponse;

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, "Unable to load checkout details."));
  }

  return data;
}

export async function activateGuestPurchase(
  sessionId: string,
  password: string,
): Promise<{ email: string }> {
  const response = await fetch("/api/activate-purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, password }),
  });
  const data = (await response.json()) as { email?: string } & CheckoutResponse;

  if (!response.ok) {
    throw new Error(extractErrorMessage(data, "Unable to finish account setup."));
  }

  if (typeof data.email !== "string" || !data.email) {
    throw new Error("Purchase activation did not return an email address.");
  }

  return { email: data.email };
}
