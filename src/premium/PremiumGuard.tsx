import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePremium } from "./PremiumContext";

type PremiumGuardProps = {
  children?: ReactNode;
  redirectTo?: string;
};

export default function PremiumGuard({
  children,
  redirectTo = "/pricing",
}: PremiumGuardProps) {
  const {
    isLoggedIn,
    loading,
    error,
    hasPremium,
    isExpired,
    refreshPremiumStatus,
  } = usePremium();
  const location = useLocation();

  if (loading) {
    return (
      <main className="premium-guard-page">
        <section className="card premium-guard-card">
          <p className="eyebrow">Premium access</p>
          <h1>Checking your Premium status…</h1>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="premium-guard-page">
        <section className="card premium-guard-card error">
          <p className="eyebrow">Premium access</p>
          <h1>We could not verify your access.</h1>
          <p>{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void refreshPremiumStatus()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPremium) {
    return (
      <Navigate
        to={redirectTo}
        state={{
          upgradeReason: isExpired ? "expired" : "premium-required",
          from: location.pathname,
        }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
