import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import { projectKind } from "@/lib/projectKind";
import { isConsultingFinancialPath } from "@/lib/financial/consultingNav";
import { isModuleVisible } from "@/lib/projects/moduleVisibility";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Redirects consulting projects away from construction-only financial paths
 * (pay apps, budget, commitments…) and blocks financials when the module is off.
 * Use as a React Router layout route around /financials/*.
 */
export function FinancialKindGuard() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { data: project, isLoading } = useProject(projectId ?? null);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project || !projectId) return <Outlet />;

  if (!isModuleVisible(project as never, "financials")) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  const kind = projectKind(project);
  const match = location.pathname.match(/\/financials\/([^/]+)/);
  const segment = match?.[1] ?? "overview";

  if (kind === "consulting" && !isConsultingFinancialPath(segment)) {
    return <Navigate to={`/projects/${projectId}/financials/overview`} replace />;
  }

  return <Outlet />;
}
