import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * Compatibility handoff for pre-consolidation client links. Legacy pages used
 * browser-local sessions; they now route authenticated users to the secure
 * client portal and everyone else to the portal's passwordless access page.
 */
export default function LegacyPortalRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/owner-portal" : `/portal/${slug ?? ""}`} replace />;
}
