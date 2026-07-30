import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected authentication error occurred.";
}

async function loadSupabaseClient() {
  const { getSupabaseClient } = await import("../lib/supabase");
  return getSupabaseClient();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    void loadSupabaseClient()
      .then(async (supabase) => {
        if (!mounted) {
          return;
        }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setLoading(false);

        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
        } else if (event === "SIGNED_OUT") {
          setIsPasswordRecovery(false);
        }
      });
        unsubscribe = () => subscription.unsubscribe();

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          setError(sessionError.message);
        } else {
          setSession(data.session);
        }
      })
      .catch((configurationError: unknown) => {
        if (mounted) {
          setError(errorMessage(configurationError));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = await loadSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      throw signUpError;
    }

    if (!data.session) {
      throw new Error(
        "Account creation requires immediate sessions. Disable Confirm email in Supabase Authentication settings, then try again.",
      );
    }

    setSession(data.session);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = await loadSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = await loadSupabaseClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      throw resetError;
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = await loadSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      throw updateError;
    }

    setIsPasswordRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = await loadSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw signOutError;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      error,
      isPasswordRecovery,
      signUp,
      signIn,
      sendPasswordReset,
      updatePassword,
      signOut,
    }),
    [
      session,
      loading,
      error,
      isPasswordRecovery,
      signUp,
      signIn,
      sendPasswordReset,
      updatePassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
