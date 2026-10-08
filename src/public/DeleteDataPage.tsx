import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SUPPORT_EMAIL } from "../config/site";
import { useProgress } from "../progress/ProgressContext";
import { usePageMetadata } from "../seo/usePageMetadata";
import PublicPageLayout from "./PublicPageLayout";

export default function DeleteDataPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { resetAllQuizScores, saving } = useProgress();
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  usePageMetadata({
    title: "Delete your data",
    description:
      "Reset quiz scores or request deletion of your Life in the UK Prep account and personal data.",
    path: "/delete-data",
  });

  const handleResetScores = async () => {
    setResetMessage("");
    setResetError("");

    const confirmed = window.confirm(
      "Reset all quiz scores? This clears your answers, wrong-question bank and mock-test history. This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await resetAllQuizScores();
      setResetMessage("All quiz scores and progress have been reset on this device and account.");
    } catch (error) {
      setResetError(
        error instanceof Error ? error.message : "Unable to reset quiz scores. Please try again.",
      );
    }
  };

  const handleDeleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setDeleteMessage("");
    setDeleteError("");

    if (!user) {
      setDeleteError("Sign in first to delete your account from this page.");
      return;
    }

    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Type DELETE to confirm account deletion.');
      return;
    }

    setDeleting(true);

    try {
      const { getSupabaseClient } = await import("../lib/supabase");
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Your session expired. Please log in again.");
      }

      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(
          [payload.error, payload.details].filter(Boolean).join(" ") ||
            "Unable to delete your account.",
        );
      }

      try {
        await resetAllQuizScores();
      } catch {
        // Account is already gone; still clear local device data below via reset attempt.
      }

      await signOut();
      setDeleteMessage(
        "Your account and associated learning data have been deleted. Payment records may be kept where the law requires.",
      );
      setDeleteConfirm("");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete your account. Email support if this continues.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PublicPageLayout
      eyebrow="Privacy controls"
      title="Delete your data"
      introduction="Use this page to reset quiz scores or permanently delete your Life in the UK Prep account. Google Play and privacy laws require a clear way to request data deletion."
    >
      <div className="content-section-grid">
        <section className="card content-section-card" id="reset-scores">
          <h2>Reset all quiz scores</h2>
          <p>
            Clears mock-test results, answer history and your wrong-question list. Your account and
            Premium access stay intact.
          </p>
          <button
            className="secondary-button"
            type="button"
            disabled={saving || authLoading}
            onClick={() => void handleResetScores()}
          >
            {saving ? "Resetting…" : "Reset all quiz scores"}
          </button>
          {resetMessage ? <p className="form-success">{resetMessage}</p> : null}
          {resetError ? <p className="form-error">{resetError}</p> : null}
          <p>
            You can also reset from{" "}
            <Link to="/results-history">Previous mock-test results</Link>.
          </p>
        </section>

        <section className="card content-section-card" id="delete-account">
          <h2>Delete account and personal data</h2>
          <p>Deleting your account removes:</p>
          <ul>
            <li>Your login / email account</li>
            <li>Saved quiz progress and mock-test history</li>
            <li>Profile information stored for the app</li>
          </ul>
          <p>
            Stripe payment records may be retained where required for tax, fraud prevention or
            legal obligations. We do not keep your card details.
          </p>

          {authLoading ? <p className="empty-state">Checking sign-in…</p> : null}

          {!authLoading && !user ? (
            <>
              <p>
                <Link className="primary-button" to="/login" state={{ from: { pathname: "/delete-data" } }}>
                  Log in to delete your account
                </Link>
              </p>
              <p>
                Or email{" "}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Life%20in%20the%20UK%20Prep%20account`}>
                  {SUPPORT_EMAIL}
                </a>{" "}
                from the address on your account and ask us to delete it. We aim to complete
                requests within 30 days.
              </p>
            </>
          ) : null}

          {!authLoading && user ? (
            <form className="delete-account-form" onSubmit={(event) => void handleDeleteAccount(event)}>
              <p>
                Signed in as <strong>{user.email}</strong>. This cannot be undone.
              </p>
              <label htmlFor="delete-confirm">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                name="deleteConfirm"
                autoComplete="off"
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
              />
              <button className="danger-button" type="submit" disabled={deleting}>
                {deleting ? "Deleting…" : "Delete my account and data"}
              </button>
            </form>
          ) : null}

          {deleteMessage ? <p className="form-success">{deleteMessage}</p> : null}
          {deleteError ? <p className="form-error">{deleteError}</p> : null}
        </section>

        <section className="card content-section-card" id="play-store">
          <h2>App store / web</h2>
          <p>
            This page is the public data-deletion URL for the website and Android app:{" "}
            <a href="https://www.lifeintheukprep.co/delete-data">
              https://www.lifeintheukprep.co/delete-data
            </a>
          </p>
          <p>
            Uninstalling the Android app from your phone does not delete your cloud account. Use
            the controls above (or email support) for that.
          </p>
        </section>
      </div>
    </PublicPageLayout>
  );
}
