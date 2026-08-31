import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { InvoicingTab } from "@/components/projects/invoicing/InvoicingTab";
import { useProject } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Consulting A/R — client invoices against scopes / custom lines.
 * Mounted under /financials/client-invoices so consulting financial nav
 * can reach the same InvoicingTab used on the project Invoicing module.
 */
export default function ClientInvoicesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId ?? null);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-4">
      <FinancialSubNav />
      {isLoading || !projectId ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <InvoicingTab
          projectId={projectId}
          projectName={project?.name ?? "Project"}
          clientName={(project as { client?: { name?: string } } | null)?.client?.name ?? null}
        />
      )}
    </div>
  );
}
