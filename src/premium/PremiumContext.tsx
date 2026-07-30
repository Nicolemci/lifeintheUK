import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FREE_MOCK_TEST_LIMIT, type PremiumPlanId } from "../config/premium";
import { useProgress } from "../progress/ProgressContext";

export type PremiumAccessRow = {
  plan: PremiumPlanId;
  expires_at: string | null;
  is_lifetime: boolean;
};

export type DerivedPremiumStatus = {
  hasPremium: boolean;
  isLifetime: boolean;
  isExpired: boolean;
  activePlan: PremiumPlanId | null;
  latestPlan: PremiumPlanId | null;
  expiresAt: string | null;
};

type PremiumContextValue = {
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
  hasPremium: boolean;
  isLifetime: boolean;
  isExpired: boolean;
  activePlan: PremiumPlanId | null;
  latestPlan: PremiumPlanId | null;
  expiresAt: string | null;
  completedMockTests: number;
  freeMockTestsRemaining: number;
  canStartMockTest: boolean;
  refreshPremiumStatus: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
}

function getStatusErrorMessage(error: unknown, fallback: string): string {
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

export function derivePremiumStatus(
  access: PremiumAccessRow | null,
  now: number = Date.now(),
): DerivedPremiumStatus {
  if (!access) {
    return {
      hasPremium: false,
      isLifetime: false,
      isExpired: false,
      activePlan: null,
      latestPlan: null,
      expiresAt: null,
    };
  }

  const isLifetime = access.is_lifetime === true || access.plan === "lifetime";
  const expiryTime =
    access.expires_at === null ? Number.NaN : new Date(access.expires_at).getTime();
  const hasUnexpiredAccess = Number.isFinite(expiryTime) && expiryTime > now;
  const hasPremium = isLifetime || hasUnexpiredAccess;

  return {
    hasPremium,
    isLifetime,
    isExpired: !isLifetime && access.expires_at !== null && !hasUnexpiredAccess,
    activePlan: hasPremium ? access.plan : null,
    latestPlan: access.plan,
    expiresAt: access.expires_at,
  };
}

export function PremiumProvider() {
  const { user } = useAuth();
  const {
    loading: progressLoading,
    error: progressError,
    stats: progressStats,
  } = useProgress();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestAccess, setLatestAccess] = useState<PremiumAccessRow | null>(null);
  const [entitlementNow, setEntitlementNow] = useState(Date.now());

  const refreshPremiumStatus = useCallback(async () => {
    if (!user) {
      setLatestAccess(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = await loadSupabaseClient();
      const premiumResult = await supabase
        .from("premium_access")
        .select("plan, expires_at, is_lifetime")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (premiumResult.error) {
        throw premiumResult.error;
      }

      const accessRows = (premiumResult.data ?? []) as PremiumAccessRow[];
      setLatestAccess(accessRows[0] ?? null);
      setEntitlementNow(Date.now());
    } catch (statusError) {
      const message = getStatusErrorMessage(
        statusError,
        "Unable to load Premium access status.",
      );
      const normalized = message.toLowerCase();
      const schemaMissing =
        normalized.includes("premium_access") ||
        normalized.includes("schema cache") ||
        normalized.includes("pgrst205") ||
        normalized.includes("does not exist");

      if (schemaMissing) {
        // Migrations not applied yet: treat the user as Free instead of blocking study.
        console.warn(
          "[premium] premium_access is missing. Apply supabase/APPLY_ALL.sql in the Supabase SQL Editor, then refresh.",
          statusError,
        );
        setLatestAccess(null);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  useEffect(() => {
    if (!latestAccess?.expires_at || latestAccess.is_lifetime) {
      return;
    }

    const expiryTime = new Date(latestAccess.expires_at).getTime();
    const remainingMilliseconds = expiryTime - Date.now();

    if (remainingMilliseconds <= 0) {
      return;
    }

    const maximumTimerDelay = 2_147_000_000;
    const timer = window.setTimeout(
      () => setEntitlementNow(Date.now()),
      Math.min(remainingMilliseconds + 1000, maximumTimerDelay),
    );

    return () => window.clearTimeout(timer);
  }, [latestAccess, entitlementNow]);

  const value = useMemo<PremiumContextValue>(() => {
    const completedMockTests = progressStats.mockTestsCompleted;
    const freeMockTestsRemaining = Math.max(
      0,
      FREE_MOCK_TEST_LIMIT - completedMockTests,
    );
    const premiumStatus = derivePremiumStatus(latestAccess, entitlementNow);

    return {
      isLoggedIn: user !== null,
      loading: loading || progressLoading,
      error: error ?? progressError,
      ...premiumStatus,
      completedMockTests,
      freeMockTestsRemaining,
      canStartMockTest:
        premiumStatus.hasPremium || completedMockTests < FREE_MOCK_TEST_LIMIT,
      refreshPremiumStatus,
    };
  }, [
    user,
    loading,
    error,
    progressLoading,
    progressError,
    progressStats.mockTestsCompleted,
    latestAccess,
    entitlementNow,
    refreshPremiumStatus,
  ]);

  return (
    <PremiumContext.Provider value={value}>
      <Outlet />
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const context = useContext(PremiumContext);

  if (!context) {
    throw new Error("usePremium must be used inside PremiumProvider.");
  }

  return context;
}
