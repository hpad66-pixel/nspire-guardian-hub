import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { FinancialOverview } from "@/components/financial/FinancialOverview";
import { ConsultingFinancialOverview } from "@/components/financial/ConsultingFinancialOverview";
import { MarginOverviewCard } from "@/components/financial/MarginOverviewCard";
import { BookOpen } from "lucide-react";
import { useProject } from "@/hooks/useProjects";
import { projectKind } from "@/lib/projectKind";

export default function FinancialOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const consulting = projectKind(project ?? {}) === "consulting";

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      {consulting ? (
        projectId ? (
          <ConsultingFinancialOverview projectId={projectId} projectName={project?.name} />
        ) : null
      ) : (
        <>
          <div className="flex items-start gap-2">
            <BookOpen className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
            <div>
              <h1 className="text-2xl font-bold">Financial Overview</h1>
              <p className="text-muted-foreground text-sm">
                One home for the whole job — contract, change orders, billings, payments, and lien status.
              </p>
            </div>
          </div>
          {projectId && <MarginOverviewCard projectId={projectId} />}
          {projectId && <FinancialOverview projectId={projectId} />}
        </>
      )}
    </div>
  );
}
