import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseEnvironment = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
};

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

let client: SupabaseClient | undefined;

export function validateSupabaseConfig(
  environment: SupabaseEnvironment = import.meta.env,
): SupabaseConfig {
  const url = environment.VITE_SUPABASE_URL?.trim();
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const missingVariables = [
    !url ? "VITE_SUPABASE_URL" : null,
    !publishableKey ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
  ].filter((variable): variable is string => variable !== null);

  if (!url || !publishableKey) {
    throw new Error(
      `Missing required Supabase environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}. Add ${missingVariables.length > 1 ? "them" : "it"} to .env.local and Vercel, then restart the app.`,
    );
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
      throw new Error("Supabase URL must use HTTPS.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase URL must use HTTPS.") {
      throw error;
    }

    throw new Error("VITE_SUPABASE_URL must be a valid HTTPS URL.");
  }

  return {
    url,
    publishableKey,
  };
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const config = validateSupabaseConfig();
    client = createClient(config.url, config.publishableKey);
  }

  return client;
}

export async function verifySupabaseConnection(signal?: AbortSignal): Promise<void> {
  getSupabaseClient();
  const { url, publishableKey } = validateSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/`, {
    method: "GET",
    headers: {
      apikey: publishableKey,
      Accept: "application/openapi+json",
    },
    signal,
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Supabase connection failed (${response.status} ${response.statusText})${responseText ? `: ${responseText}` : ""}`,
    );
  }
}
