/**
 * Turn unknown auth failures into a readable string for the UI.
 * Supabase sometimes surfaces JSON.stringify({}) as the message "{}".
 */
export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const useless = new Set(["{}", "[object Object]", "null", "undefined", ""]);

  const fromString = (value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed || useless.has(trimmed)) {
      return null;
    }

    return trimmed;
  };

  const fromRecord = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const record = value as Record<string, unknown>;
    for (const key of ["message", "msg", "error_description", "error", "details"]) {
      const candidate = fromString(record[key]);
      if (candidate) {
        return candidate;
      }
    }

    return null;
  };

  const direct =
    fromString(error) ??
    (error instanceof Error ? fromString(error.message) : null) ??
    fromRecord(error);

  if (direct) {
    return direct;
  }

  const status =
    typeof error === "object" && error !== null
      ? (error as { status?: unknown }).status
      : undefined;

  if (status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (status === 400 || status === 422) {
    return "Unable to complete that request. Check the details and try again.";
  }

  if (typeof status === "number" && status >= 500) {
    return "The authentication service is temporarily unavailable. Please try again shortly.";
  }

  return fallback;
}
