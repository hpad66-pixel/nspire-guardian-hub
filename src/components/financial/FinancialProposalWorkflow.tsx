import { Check, CheckCircle2, Circle, FileText, Lock, Mail, RotateCcw, UserCheck, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FinancialProposal } from "@/hooks/useFinancialProposals";

function when(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function FinancialProposalWorkflow({ proposal }: { proposal: FinancialProposal }) {
  const rejected = proposal.status === "rejected";
  const approved = proposal.status === "approved" || Boolean(proposal.accepted_signed_at);
  const executed = approved && proposal.locked;
  const deliveries = Array.isArray(proposal.delivery_history) ? proposal.delivery_history : [];
  const lastDelivery = deliveries[deliveries.length - 1];
  const steps = [
    { label: "Draft created", detail: when(proposal.created_at), done: true, icon: FileText },
    { label: "Consultant signed", detail: when(proposal.submitted_signed_at) || (executed ? "Included in final executed PDF" : "Awaiting APAS signature"), done: Boolean(proposal.submitted_signed_at) || executed, icon: Lock },
    { label: deliveries.length > 1 ? `Sent ${deliveries.length} times` : "Sent to client", detail: proposal.sent_to_client_at ? `${lastDelivery?.to || proposal.client_email || "Client"} · ${when(proposal.sent_to_client_at)}` : executed ? "Satisfied by returned client-signed copy" : "Not sent", done: Boolean(proposal.sent_to_client_at) || executed, icon: Mail },
    { label: rejected ? "Revision requested" : approved ? "Client approved" : "Client decision", detail: rejected ? (proposal.client_comments || "Changes requested") : approved ? `${proposal.accepted_signed_name || proposal.client_name || "Client"} · ${when(proposal.accepted_signed_at)}${proposal.acceptance_method ? ` · ${proposal.acceptance_method}` : ""}` : "Awaiting response", done: approved || rejected, icon: rejected ? XCircle : UserCheck },
    { label: "Executed", detail: executed ? `${when(proposal.accepted_signed_at)} · approved and locked` : "Awaiting final approval", done: executed, icon: CheckCircle2 },
  ];
  const amendments = Array.isArray(proposal.amendment_history) ? proposal.amendment_history : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Proposal workflow</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Revision {proposal.revision_no ?? 0}</Badge>
            {proposal.locked && <Badge className="bg-emerald-100 text-emerald-800"><Lock className="mr-1 h-3 w-3" />{executed ? "Executed & locked" : "Signed version locked"}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className={`relative rounded-lg border p-3 ${step.done ? "border-emerald-200 bg-emerald-50/50" : "bg-muted/20"}`}>
                {index < steps.length - 1 && <div className="absolute -right-2 top-6 z-10 hidden h-px w-4 bg-border md:block" />}
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${step.done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>{step.done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-sm font-semibold">{step.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
              </div>
            );
          })}
        </div>
        {amendments.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="flex items-center gap-1.5 text-sm font-medium"><RotateCcw className="h-3.5 w-3.5" /> Amendment history</p>
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              {[...amendments].reverse().map((entry, index) => <p key={`${entry.at}-${index}`}>Revision {entry.revision_no ?? amendments.length - index} · {entry.reason} · {new Date(entry.at).toLocaleDateString()}</p>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
