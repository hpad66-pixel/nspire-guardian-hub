import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { ProjectIntakeCard } from "@/components/financial/ProjectIntakeCard";
import { VendorSubmissionInbox } from "@/components/financial/VendorSubmissionInbox";
import { RequestVendorPayApp } from "@/components/financial/RequestVendorPayApp";
import { UploadParseDocument } from "@/components/financial/UploadParseDocument";
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

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-[12.5px] text-muted-foreground">
        <span className="font-semibold text-foreground">This is your Accounts Payable (A/P)</span> — what you owe your subs &amp; vendors. Invoices they send you get reviewed and paid here.
        <span className="mx-1.5 text-border">|</span>
        <span className="font-semibold text-foreground">Accounts Receivable (A/R)</span> is the opposite — what the owner owes you — and lives under Prime Contract &amp; Payments.
      </div>
      <RequestVendorPayApp projectId={projectId} />
      <UploadParseDocument projectId={projectId} />
      <ProjectIntakeCard projectId={projectId} />
      <VendorSubmissionInbox projectId={projectId} />
    </div>
  );
}
