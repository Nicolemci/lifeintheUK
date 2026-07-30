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

type AdminContextValue = {
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
}

export function AdminProvider() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = await loadSupabaseClient();
      const { data, error: adminError } = await supabase.rpc("is_admin");

      if (adminError) {
        throw adminError;
      }

      setIsAdmin(data === true);
    } catch (adminError) {
      setIsAdmin(false);
      setError(
        adminError instanceof Error
          ? adminError.message
          : "Unable to verify administrator access.",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshAdminStatus();
  }, [refreshAdminStatus]);

  const value = useMemo<AdminContextValue>(
    () => ({
      loading,
      error,
      isAdmin,
      refreshAdminStatus,
    }),
    [loading, error, isAdmin, refreshAdminStatus],
  );

  return (
    <AdminContext.Provider value={value}>
      <Outlet />
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error("useAdmin must be used inside AdminProvider.");
  }

  return context;
}
