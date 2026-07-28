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
import { getSupabaseClient } from "../lib/supabase";

type PremiumAccessRow = {
  plan: PremiumPlanId;
  expires_at: string | null;
  is_lifetime: boolean;
};

type PremiumContextValue = {
  loading: boolean;
  error: string | null;
  hasPremium: boolean;
  activePlan: PremiumPlanId | null;
  expiresAt: string | null;
  completedMockTests: number;
  freeMockTestsRemaining: number;
  canStartMockTest: boolean;
  refreshPremiumStatus: () => Promise<void>;
  recordMockTest: (score: number) => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

function isActiveAccess(row: PremiumAccessRow, now: number): boolean {
  if (row.is_lifetime || row.plan === "lifetime") {
    return true;
  }

  return row.expires_at !== null && new Date(row.expires_at).getTime() > now;
}

export function PremiumProvider() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAccess, setActiveAccess] = useState<PremiumAccessRow | null>(null);
  const [completedMockTests, setCompletedMockTests] = useState(0);

  const refreshPremiumStatus = useCallback(async () => {
    if (!user) {
      setActiveAccess(null);
      setCompletedMockTests(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
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

      const now = Date.now();
      const accessRows = (premiumResult.data ?? []) as PremiumAccessRow[];
      setActiveAccess(accessRows.find((row) => isActiveAccess(row, now)) ?? null);
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

  const recordMockTest = useCallback(
    async (score: number) => {
      if (!user) {
        throw new Error("You must be logged in to save a mock test.");
      }

      const { error: insertError } = await getSupabaseClient().from("mock_tests").insert({
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
    const hasPremium = activeAccess !== null;

    return {
      loading,
      error,
      hasPremium,
      activePlan: activeAccess?.plan ?? null,
      expiresAt: activeAccess?.expires_at ?? null,
      completedMockTests,
      freeMockTestsRemaining,
      canStartMockTest: hasPremium || completedMockTests < FREE_MOCK_TEST_LIMIT,
      refreshPremiumStatus,
      recordMockTest,
    };
  }, [loading, error, activeAccess, completedMockTests, refreshPremiumStatus, recordMockTest]);

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
