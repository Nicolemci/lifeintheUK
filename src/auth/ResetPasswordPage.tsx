import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { useAuth } from "./AuthContext";

export default function ResetPasswordPage() {
  const { user, loading, isPasswordRecovery, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      navigate("/", { replace: true });
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure recovery"
      title="Choose a new password."
      description="Open this page from the recovery link sent to your email."
      footer={<Link to="/forgot-password">Request another reset link</Link>}
    >
      {loading ? <p>Validating recovery session…</p> : null}
      {!loading && !user ? (
        <p className="form-error">This recovery link is invalid or has expired.</p>
      ) : null}
      {!loading && user ? (
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isPasswordRecovery ? (
            <p className="auth-notice">
              You are signed in. You can still update your password here.
            </p>
          ) : null}
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
