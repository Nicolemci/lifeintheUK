export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: string;
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

export function logApiFailure(
  scope: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const message = getErrorMessage(error, "Unknown error");
  const details =
    typeof error === "object" && error !== null
      ? {
          name: (error as { name?: unknown }).name,
          code: (error as { code?: unknown }).code,
          type: (error as { type?: unknown }).type,
          statusCode: (error as { statusCode?: unknown }).statusCode,
          raw: error,
        }
      : { raw: error };

  console.error(`[${scope}] ${message}`, {
    ...context,
    details,
  });
}
