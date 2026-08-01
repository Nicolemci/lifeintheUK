import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePageMetadata } from "../seo/usePageMetadata";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  usePageMetadata({
    title: "Log in",
    description: "Log in to Life in the UK Prep to continue mock tests and sync your study progress.",
    path: "/login",
  });

  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, navigate, redirectPath]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email.trim(), password);
      navigate(redirectPath, { replace: true });
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to continue studying."
      description="Your Supabase session keeps you signed in and restores automatically after refresh."
      footer={
        <>
          <Link to="/forgot-password">Forgot password?</Link>
          <span>
            New here? <Link to="/sign-up">Create an account</Link>
          </span>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={submitting || authLoading}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
