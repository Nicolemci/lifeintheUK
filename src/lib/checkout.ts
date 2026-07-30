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
  const { getSupabaseClient } = await import("./supabase");
  const {
    data: { session },
    error: sessionError,
  } = await getSupabaseClient().auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error("You must be logged in to purchase Premium.");
  }

  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
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
    throw new Error(
      extractErrorMessage(data, "Unable to start Stripe Checkout."),
    );
  }

  if (typeof data.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe returned an invalid Checkout URL.");
  }

  return data.url;
}
