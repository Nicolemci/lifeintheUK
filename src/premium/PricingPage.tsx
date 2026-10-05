import { Navigate } from "react-router-dom";

/**
 * Legacy /pricing URL — keep for old links, send everyone to /upgrade.
 */
export default function PricingPage() {
  return <Navigate to="/upgrade" replace />;
}
