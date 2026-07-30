import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import { AdminProvider } from "../admin/AdminContext";
import AdminGuard from "../admin/AdminGuard";
import AdminLoginPage from "../admin/AdminLoginPage";
import ForgotPasswordPage from "../auth/ForgotPasswordPage";
import LoginPage from "../auth/LoginPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import ResetPasswordPage from "../auth/ResetPasswordPage";
import SignUpPage from "../auth/SignUpPage";
import SiteFooter from "../components/SiteFooter";
import PaymentCancelledPage from "../premium/PaymentCancelledPage";
import PaymentSuccessPage from "../premium/PaymentSuccessPage";
import PremiumGuard from "../premium/PremiumGuard";
import PremiumHomePage from "../premium/PremiumHomePage";
import { PremiumProvider } from "../premium/PremiumContext";
import PricingPage from "../premium/PricingPage";
import UpgradePage from "../premium/UpgradePage";
import MockResultsPage from "../progress/MockResultsPage";
import { ProgressProvider } from "../progress/ProgressContext";

const AdminQuestionsPage = lazy(() => import("../admin/AdminQuestionsPage"));
const AboutPage = lazy(() => import("../public/AboutPage"));
const ContactPage = lazy(() => import("../public/ContactPage"));
const CookiePolicyPage = lazy(() => import("../public/CookiePolicyPage"));
const PrivacyPage = lazy(() => import("../public/PrivacyPage"));
const RefundPolicyPage = lazy(() => import("../public/RefundPolicyPage"));
const TermsPage = lazy(() => import("../public/TermsPage"));

function publicPage(element: ReactNode) {
  return <Suspense fallback={<p className="empty-state">Loading page…</p>}>{element}</Suspense>;
}

export default function AppRoutes() {
  return (
    <div className="app-frame">
      <div className="app-frame-content">
        <Routes>
          <Route path="/privacy" element={publicPage(<PrivacyPage />)} />
          <Route path="/terms" element={publicPage(<TermsPage />)} />
          <Route path="/refund-policy" element={publicPage(<RefundPolicyPage />)} />
          <Route path="/cookie-policy" element={publicPage(<CookiePolicyPage />)} />
          <Route path="/about" element={publicPage(<AboutPage />)} />
          <Route path="/contact" element={publicPage(<ContactPage />)} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<AdminProvider />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route element={<AdminGuard />}>
              <Route
                path="/admin/questions"
                element={
                  <Suspense fallback={<p className="empty-state">Loading admin dashboard…</p>}>
                    <AdminQuestionsPage />
                  </Suspense>
                }
              />
              <Route path="/admin" element={<Navigate to="/admin/questions" replace />} />
            </Route>
          </Route>

          <Route element={<ProgressProvider />}>
            <Route element={<PremiumProvider />}>
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/results-history" element={<MockResultsPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />
                <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
                <Route element={<PremiumGuard />}>
                  <Route path="/premium" element={<PremiumHomePage />} />
                </Route>
              </Route>
              <Route path="/*" element={<App />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  );
}
