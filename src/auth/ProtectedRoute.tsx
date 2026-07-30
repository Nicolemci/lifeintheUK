import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-status-page">
        <p>Restoring your session…</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="auth-status-page">
        <div className="card auth-status-card">
          <h1>Authentication configuration error</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
