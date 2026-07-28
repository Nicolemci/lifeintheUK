import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LogoutButton({ className = "ghost-button" }: { className?: string }) {
  const { signOut } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setSubmitting(true);
    setError("");

    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to log out.");
      setSubmitting(false);
    }
  }

  return (
    <span className="logout-control">
      <button className={className} type="button" onClick={() => void handleLogout()} disabled={submitting}>
        {submitting ? "Signing out…" : "Sign out"}
      </button>
      {error ? <small className="form-error">{error}</small> : null}
    </span>
  );
}
