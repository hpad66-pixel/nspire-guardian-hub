import { Navigate, useLocation } from "react-router-dom";
import { useClientPortalProject } from "@/components/portal/ClientPortalProjectContext";
import {
  pickOwnerPortalLandingProject,
  rewriteOwnerPortalPath,
} from "@/lib/portal/ownerPortalPaths";

/**
 * Compatibility handoff for pre-project-tab owner portal URLs.
 * /owner-portal/documents → /owner-portal/projects/:projectId/documents
 */
export default function OwnerPortalLegacyRedirect() {
  const location = useLocation();
  const { contracts, projects, selectedProjectId, isLoading } = useClientPortalProject();
  const params = new URLSearchParams(location.search);
  const requested = params.get("project");
  // Prefer explicit ?project=, then any RLS-visible project (including jobs
  // without a prime contract), and only then fall back to contracts.
  const projectId = pickOwnerPortalLandingProject({
    requestedProjectId: requested,
    selectedProjectId,
    projectIds: projects.map((project) => project.id),
    contractProjectIds: contracts.map((contract) => contract.project_id),
  });

  if (isLoading) return <div className="client-dashboard-loading">Loading portal…</div>;

  if (!projectId) {
    return (
      <div className="client-dashboard-empty" data-testid="owner-portal-empty">
        No projects are available in this portal yet.
      </div>
    );
  }

  const next = rewriteOwnerPortalPath(location.pathname, projectId);
  const search = requested ? "" : location.search;
  return <Navigate to={`${next ?? `/owner-portal/projects/${projectId}`}${search}${location.hash}`} replace />;
}
