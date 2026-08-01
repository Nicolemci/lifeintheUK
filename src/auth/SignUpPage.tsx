import { Link, useNavigate } from "react-router-dom";
import { usePageMetadata } from "../seo/usePageMetadata";
import AuthLayout from "./AuthLayout";
import SignUpForm from "./SignUpForm";

export default function SignUpPage() {
  const navigate = useNavigate();

  usePageMetadata({
    title: "Create an account",
    description:
      "Create a free Life in the UK Prep account to save progress and unlock Premium mock-test access.",
    path: "/sign-up",
  });

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Save your progress securely."
      description="Create a Supabase account to keep your test progress associated with your login."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" state={{ from: { pathname: "/pricing" } }}>
            Log in
          </Link>
        </span>
      }
    >
      <SignUpForm onSuccess={() => navigate("/pricing", { replace: true })} />
    </AuthLayout>
  );
}
