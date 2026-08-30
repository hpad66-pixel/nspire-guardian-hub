import { Navigate, useLocation } from "react-router-dom";
import { useClientPortalProject } from "@/components/portal/ClientPortalProjectContext";
import { rewriteOwnerPortalPath } from "@/lib/portal/ownerPortalPaths";

/**
 * Compatibility handoff for pre-project-tab owner portal URLs.
 * /owner-portal/documents → /owner-portal/projects/:projectId/documents
 */
export default function OwnerPortalLegacyRedirect() {
  const location = useLocation();
  const { contracts, selectedProjectId, isLoading } = useClientPortalProject();
  const requested = new URLSearchParams(location.search).get("project");
  const projectId = (requested && contracts.some((contract) => contract.project_id === requested))
    ? requested
    : selectedProjectId ?? contracts[0]?.project_id ?? null;

  if (isLoading) return <div className="client-dashboard-loading">Loading portal…</div>;

  if (!projectId) {
    return (
      <div className="client-dashboard-empty" data-testid="owner-portal-empty">
        No projects are available in this portal yet.
      </div>
    );
  }

  const next = rewriteOwnerPortalPath(location.pathname, projectId);
  return <Navigate to={`${next ?? `/owner-portal/projects/${projectId}`}${location.hash}`} replace />;
}
