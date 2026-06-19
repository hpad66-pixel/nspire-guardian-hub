/**
 * F0 · useVendorSubmissions — e-submittal inbox; classify → create DRAFT records.
 * Never auto-approves or pays; produces drafts a human reviews.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import type { ParsedFields, DocType } from "@/lib/financial/intake";
import type { ReleaseType } from "@/lib/financial/lien";

export interface VendorSubmission {
  id: string;
  tenant_id: string;
  project_id: string;
  commitment_id: string | null;
  source: "email" | "folder" | "manual_upload" | "portal";
  from_email: string | null;
  subject: string | null;
  received_at: string;
  doc_type: DocType;
  status: "received" | "parsed" | "needs_review" | "processed" | "rejected";
  parsed: ParsedFields | null;
  artifact_id: string | null;
  created_commitment_invoice_id: string | null;
  created_lien_release_id: string | null;
  error: string | null;
  created_at: string;
}

export interface ProcessInput {
  submission: VendorSubmission;
  /** Required when creating an invoice or inbound lien — the matched vendor commitment. */
  commitmentId: string;
  /** Overrides for the extracted fields. */
  invoiceNo?: string;
  amount?: number;
  periodEnd?: string;
  releaseType?: ReleaseType;
  throughDate?: string;
}

export function useVendorSubmissions(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<VendorSubmission[]>({
    queryKey: ["vendor-submissions", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_submissions" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VendorSubmission[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["vendor-submissions", projectId] });

  /** Turn a submission into a DRAFT invoice or lien release and link it back. */
  const process = useMutation({
    mutationFn: async (input: ProcessInput) => {
      const { submission, commitmentId } = input;
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const p = submission.parsed ?? {};

      if (submission.doc_type === "invoice") {
        const { data: inv, error } = await supabase
          .from("commitment_invoices" as any)
          .insert({
            tenant_id,
            commitment_id: commitmentId,
            invoice_no: input.invoiceNo ?? p.invoice_no ?? `SUB-${submission.id.slice(0, 8)}`,
            period_end: input.periodEnd ?? p.period_end ?? new Date().toISOString().slice(0, 10),
            status: "draft",
            submitted_amount: input.amount ?? p.amount ?? 0,
            artifact_id: submission.artifact_id,
            vendor_submission_id: submission.id,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        const { error: upErr } = await supabase
          .from("vendor_submissions" as any)
          .update({ status: "processed", commitment_id: commitmentId, created_commitment_invoice_id: (inv as any).id } as any)
          .eq("id", submission.id);
        if (upErr) throw upErr;
        return { kind: "invoice" as const, id: (inv as any).id };
      }

      if (submission.doc_type === "lien_release") {
        const { data: lr, error } = await supabase
          .from("lien_releases" as any)
          .insert({
            tenant_id,
            project_id: submission.project_id,
            direction: "inbound",
            release_type: input.releaseType ?? p.release_type ?? "conditional_progress",
            commitment_invoice_id: null,
            through_date: input.throughDate ?? p.through_date ?? null,
            amount: input.amount ?? p.amount ?? null,
            status: "pending",
            artifact_id: submission.artifact_id,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        const { error: upErr } = await supabase
          .from("vendor_submissions" as any)
          .update({ status: "processed", commitment_id: commitmentId, created_lien_release_id: (lr as any).id } as any)
          .eq("id", submission.id);
        if (upErr) throw upErr;
        return { kind: "lien_release" as const, id: (lr as any).id };
      }

      throw new Error("Cannot process: classify the document first.");
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from("vendor_submissions" as any)
        .update({ status: "rejected" } as any)
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...list, process, reject };
}
