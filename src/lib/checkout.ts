import type { PremiumPlanId } from "../config/premium";

type CheckoutResponse = {
  url?: unknown;
  error?: unknown;
};

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
  const data = (await response.json().catch(() => ({}))) as CheckoutResponse;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Unable to start Stripe Checkout.",
    );
  }

  if (typeof data.url !== "string" || !data.url.startsWith("https://")) {
    throw new Error("Stripe returned an invalid Checkout URL.");
  }

  return data.url;
}
