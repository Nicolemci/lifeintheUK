import { type FormEvent, useState } from "react";
import { useAuth } from "./AuthContext";

type SignUpFormProps = {
  onSuccess: () => void;
  submitLabel?: string;
};

export default function SignUpForm({
  onSuccess,
  submitLabel = "Create account",
}: SignUpFormProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await signUp(email.trim(), password);
      onSuccess();
    } catch (signUpError) {
      setError(
        signUpError instanceof Error ? signUpError.message : "Unable to create account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : submitLabel}
      </button>
    </form>
  );
}
