import { Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import ForgotPasswordPage from "../auth/ForgotPasswordPage";
import LoginPage from "../auth/LoginPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import ResetPasswordPage from "../auth/ResetPasswordPage";
import SignUpPage from "../auth/SignUpPage";
import PaymentCancelledPage from "../premium/PaymentCancelledPage";
import PaymentSuccessPage from "../premium/PaymentSuccessPage";
import { PremiumProvider } from "../premium/PremiumContext";
import PricingPage from "../premium/PricingPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PremiumProvider />}>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/payment-success" element={<PaymentSuccessPage />} />
          <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
          <Route path="/*" element={<App />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
