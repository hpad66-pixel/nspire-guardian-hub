import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalBySlug } from "@/hooks/usePortal";
import { ownerPortalPath } from "@/lib/portal/ownerPortalPaths";

/**
 * Compatibility handoff for pre-consolidation client links. Legacy pages used
 * browser-local sessions; they now route authenticated users to the secure
 * client portal for that slug's project and everyone else to the portal's
 * passwordless access page.
 */
export default function LegacyPortalRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading } = useAuth();
  const { data: portal, isLoading } = usePortalBySlug(slug);
  if (loading || isLoading) return null;
  if (user) {
    return <Navigate to={ownerPortalPath(portal?.project_id)} replace />;
  }
  return <Navigate to={`/portal/${slug ?? ""}`} replace />;
}
