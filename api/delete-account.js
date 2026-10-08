const { createClient } = require("@supabase/supabase-js");
const { getErrorMessage, logApiFailure } = require("./_lib/httpError");

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function getAccountDeletionConfig(environment = process.env) {
  const values = {
    VITE_SUPABASE_URL: firstNonEmpty(environment.VITE_SUPABASE_URL),
    VITE_SUPABASE_PUBLISHABLE_KEY: firstNonEmpty(environment.VITE_SUPABASE_PUBLISHABLE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: firstNonEmpty(environment.SUPABASE_SERVICE_ROLE_KEY),
  };
  const missingVariables = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required account-deletion environment variable${
        missingVariables.length > 1 ? "s" : ""
      }: ${missingVariables.join(", ")}`,
    );
  }

  return {
    supabaseUrl: values.VITE_SUPABASE_URL,
    supabasePublishableKey: values.VITE_SUPABASE_PUBLISHABLE_KEY,
    supabaseServiceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function getBearerToken(request) {
  const authorization = request.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

module.exports = async function deleteAccount(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return response.status(401).json({ error: "You must be signed in to delete your account." });
  }

  let config;

  try {
    config = getAccountDeletionConfig();
  } catch (configurationError) {
    logApiFailure("delete-account", configurationError, { stage: "config" });
    return response.status(500).json({
      error: "Account deletion is not configured.",
      details: getErrorMessage(configurationError, "Missing environment variables"),
    });
  }

  try {
    const userClient = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      logApiFailure("delete-account", userError || "No user", { stage: "getUser" });
      return response.status(401).json({ error: "Your session is invalid or has expired." });
    }

    const admin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Cascades remove profile, quiz progress, mock tests, premium rows, etc.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      throw deleteError;
    }

    return response.status(200).json({ deleted: true, userId: user.id });
  } catch (error) {
    logApiFailure("delete-account", error, { stage: "deleteUser" });
    return response.status(500).json({
      error: "Unable to delete your account. Please try again or email support.",
      details: getErrorMessage(error, "Unknown deletion error"),
    });
  }
};
