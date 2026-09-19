import { useParams, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const { data: project, isLoading } = useProject(projectId ?? null);

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-4 px-3 py-4 sm:px-6 lg:px-8">
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
          clientName={project?.client?.name ?? null}
          clientSeed={{
            name: project?.client?.contact_name || project?.client?.name || null,
            company: project?.client?.name || null,
            email: project?.client?.contact_email || null,
            phone: project?.client?.contact_phone || null,
            address: project?.client?.address || null,
            city: project?.client?.city || null,
            state: project?.client?.state || null,
          }}
          autoCreateProposalId={searchParams.get("new") === "1" ? searchParams.get("proposal") : null}
        />
      )}
    </div>
  );
}
