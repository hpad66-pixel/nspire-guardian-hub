/** Workflow status helpers for authored correspondence documents. */

export type DocWorkflowStatus = "uploaded" | "drafting" | "signed" | "sent" | "executed";

export const DOC_WORKFLOW_META: Record<DocWorkflowStatus, {
  label: string;
  short: string;
  tone: string;
  description: string;
}> = {
  uploaded: {
    label: "Uploaded",
    short: "Uploaded",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
    description: "Imported and ready to edit",
  },
  drafting: {
    label: "In editor",
    short: "Editing",
    tone: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Being edited or finalized",
  },
  signed: {
    label: "Signed",
    short: "Signed",
    tone: "bg-violet-100 text-violet-800 border-violet-200",
    description: "Electronically signed — ready to send",
  },
  sent: {
    label: "Sent",
    short: "Sent",
    tone: "bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/20",
    description: "Sent to client for review / signature",
  },
  executed: {
    label: "Executed",
    short: "Executed",
    tone: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Client signed — fully executed",
  },
};

export const DOC_WORKFLOW_FILTERS: Array<DocWorkflowStatus | "all"> = [
  "all", "uploaded", "drafting", "signed", "sent", "executed",
];

export function resolveDocWorkflow(doc: {
  workflow_status?: string | null;
  status?: string | null;
  contractor_signed_at?: string | null;
  sent_to_client_at?: string | null;
  client_signed_at?: string | null;
  has_original?: boolean;
}): DocWorkflowStatus {
  if (doc.client_signed_at) return "executed";
  if (doc.sent_to_client_at) return "sent";
  if (doc.contractor_signed_at) return "signed";
  if (doc.workflow_status && doc.workflow_status in DOC_WORKFLOW_META) {
    return doc.workflow_status as DocWorkflowStatus;
  }
  if (doc.status === "final") return "drafting";
  if (doc.has_original) return "uploaded";
  return "drafting";
}
