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
import { getSupabaseClient } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected authentication error occurred.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = getSupabaseClient();
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

      void supabase.auth
        .getSession()
        .then(({ data, error: sessionError }) => {
          if (!mounted) {
            return;
          }

          if (sessionError) {
            setError(sessionError.message);
          } else {
            setSession(data.session);
          }
        })
        .catch((sessionError: unknown) => {
          if (mounted) {
            setError(errorMessage(sessionError));
          }
        })
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (configurationError) {
      setError(errorMessage(configurationError));
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    return {
      requiresEmailConfirmation: data.session === null,
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      throw resetError;
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      password,
    });

    if (updateError) {
      throw updateError;
    }

    setIsPasswordRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();

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
