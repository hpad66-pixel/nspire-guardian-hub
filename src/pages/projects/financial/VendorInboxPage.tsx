import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { ProjectIntakeCard } from "@/components/financial/ProjectIntakeCard";
import { VendorSubmissionInbox } from "@/components/financial/VendorSubmissionInbox";
import { RequestVendorPayApp } from "@/components/financial/RequestVendorPayApp";
import { Inbox } from "lucide-react";

export default function VendorInboxPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start gap-2">
        <Inbox className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Vendor Inbox</h1>
          <p className="text-muted-foreground text-sm">
            Electronic vendor submittals — auto-ingested invoices &amp; lien releases, plus manual upload.
          </p>
        </div>
      </div>
      <RequestVendorPayApp projectId={projectId} />
      <ProjectIntakeCard projectId={projectId} />
      <VendorSubmissionInbox projectId={projectId} />
    </div>
  );
}
