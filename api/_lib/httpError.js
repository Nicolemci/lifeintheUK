function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = error.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

function logApiFailure(scope, error, context = {}) {
  const message = getErrorMessage(error, "Unknown error");
  const details =
    typeof error === "object" && error !== null
      ? {
          name: error.name,
          code: error.code,
          type: error.type,
          statusCode: error.statusCode,
          raw: error,
        }
      : { raw: error };

  console.error(`[${scope}] ${message}`, {
    ...context,
    details,
  });
}

module.exports = {
  getErrorMessage,
  logApiFailure,
};
