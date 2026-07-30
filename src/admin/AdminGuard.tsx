import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LogoutButton from "../auth/LogoutButton";
import { useAdmin } from "./AdminContext";

export default function AdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const { loading: adminLoading, error, isAdmin, refreshAdminStatus } = useAdmin();
  const location = useLocation();

  if (authLoading || adminLoading) {
    return (
      <main className="admin-gate-page">
        <section className="card admin-gate-card">
          <p className="eyebrow">Administration</p>
          <h1>Verifying administrator access…</h1>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (error) {
    return (
      <main className="admin-gate-page">
        <section className="card admin-gate-card error">
          <p className="eyebrow">Administration</p>
          <h1>Admin access could not be verified.</h1>
          <p>{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void refreshAdminStatus()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-gate-page">
        <section className="card admin-gate-card denied">
          <p className="eyebrow">Administration</p>
          <h1>Access denied</h1>
          <p>This account is authenticated but is not on the administrator allow-list.</p>
          <LogoutButton />
        </section>
      </main>
    );
  }

  return <Outlet />;
}
