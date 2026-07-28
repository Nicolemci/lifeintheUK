import { Navigate, Route, Routes } from "react-router-dom";
import App from "../App";
import ForgotPasswordPage from "../auth/ForgotPasswordPage";
import LoginPage from "../auth/LoginPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import ResetPasswordPage from "../auth/ResetPasswordPage";
import SignUpPage from "../auth/SignUpPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<App />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
