import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthLayout from "../auth/AuthLayout";
import { usePageMetadata } from "../seo/usePageMetadata";
import { useAdmin } from "./AdminContext";

export default function AdminLoginPage() {
  const { user, signIn } = useAuth();
  const { loading: adminLoading, isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  usePageMetadata({
    title: "Admin login",
    description: "Administrator sign-in for Life in the UK Prep.",
    path: "/admin/login",
    noIndex: true,
  });

  useEffect(() => {
    if (user && !adminLoading && isAdmin) {
      navigate("/admin/questions", { replace: true });
    }
  }, [user, adminLoading, isAdmin, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signIn(email.trim(), password);
      navigate("/admin/questions", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Restricted access"
      title="Administrator login"
      description="Sign in with an account that has been explicitly added to the administrator allow-list."
      footer={<Link to="/">Return to the learner application</Link>}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Admin email
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
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Admin login"}
        </button>
      </form>
    </AuthLayout>
  );
}
