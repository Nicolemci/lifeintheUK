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
  recordMockTest: (score: number) => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestAccess, setLatestAccess] = useState<PremiumAccessRow | null>(null);
  const [completedMockTests, setCompletedMockTests] = useState(0);
  const [entitlementNow, setEntitlementNow] = useState(Date.now());

  const refreshPremiumStatus = useCallback(async () => {
    if (!user) {
      setLatestAccess(null);
      setCompletedMockTests(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = await loadSupabaseClient();
      const [premiumResult, mockCountResult] = await Promise.all([
        supabase
          .from("premium_access")
          .select("plan, expires_at, is_lifetime")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("mock_tests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      if (premiumResult.error) {
        throw premiumResult.error;
      }

      if (mockCountResult.error) {
        throw mockCountResult.error;
      }

      const accessRows = (premiumResult.data ?? []) as PremiumAccessRow[];
      setLatestAccess(accessRows[0] ?? null);
      setEntitlementNow(Date.now());
      setCompletedMockTests(mockCountResult.count ?? 0);
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to load Premium access status.",
      );
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

  const recordMockTest = useCallback(
    async (score: number) => {
      if (!user) {
        throw new Error("You must be logged in to save a mock test.");
      }

      const supabase = await loadSupabaseClient();
      const { error: insertError } = await supabase.from("mock_tests").insert({
        user_id: user.id,
        score,
      });

      if (insertError) {
        throw insertError;
      }

      setCompletedMockTests((currentCount) => currentCount + 1);
    },
    [user],
  );

  const value = useMemo<PremiumContextValue>(() => {
    const freeMockTestsRemaining = Math.max(
      0,
      FREE_MOCK_TEST_LIMIT - completedMockTests,
    );
    const premiumStatus = derivePremiumStatus(latestAccess, entitlementNow);

    return {
      isLoggedIn: user !== null,
      loading,
      error,
      ...premiumStatus,
      completedMockTests,
      freeMockTestsRemaining,
      canStartMockTest:
        premiumStatus.hasPremium || completedMockTests < FREE_MOCK_TEST_LIMIT,
      refreshPremiumStatus,
      recordMockTest,
    };
  }, [
    user,
    loading,
    error,
    latestAccess,
    entitlementNow,
    completedMockTests,
    refreshPremiumStatus,
    recordMockTest,
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
