/**
 * useCoWorkflow — persistence for the change-order generator + signing flow.
 * Generates the .docx + preview PDF from a spec, writes the change_orders row,
 * and exposes sign / send helpers used across the generator and detail pages.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { generateCoDocx } from "@/lib/changeOrder/generateDocx";
import { uploadCoArtifact } from "@/lib/changeOrder/storage";
import { grandTotalNumber } from "@/lib/changeOrder/pricing";
import type { CoSpec } from "@/lib/changeOrder/types";

export interface CreateCoInput {
  projectId: string;
  primeContractId: string | null;
  spec: CoSpec;
  /** Rendered preview PDF blob (unsigned) for quick viewing. */
  previewPdf?: Blob | null;
}

export function useCoWorkflow(projectId: string | null) {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async ({ projectId, primeContractId, spec, previewPdf }: CreateCoInput) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();

      // Artifact generation is best-effort — the spec itself drives the on-screen
      // template, so a docx/pdf hiccup must never block creating the change order.
      let docx_path: string | null = null;
      try {
        const docxBlob = await generateCoDocx(spec);
        docx_path = await uploadCoArtifact(docxBlob, projectId, "change-orders", "docx");
      } catch (e) {
        console.warn("CO .docx generation failed (continuing):", e);
      }
      let pdf_path: string | null = null;
      try {
        if (previewPdf) pdf_path = await uploadCoArtifact(previewPdf, projectId, "change-orders", "pdf");
      } catch (e) {
        console.warn("CO preview PDF upload failed (continuing):", e);
      }

      const coNo = spec.doc.co_number ? parseInt(spec.doc.co_number, 10) : null;
      const row: Record<string, unknown> = {
        tenant_id,
        project_id: projectId,
        prime_contract_id: primeContractId,
        co_type: "PCO",
        title: spec.doc.title || spec.doc.co_label || "Change Order",
        amount: grandTotalNumber(spec.pricing),
        status: "draft",
        days_impact: 0,
        spec,
        docx_path,
        pdf_path,
        created_by: user?.id ?? null,
      };
      if (coNo && Number.isFinite(coNo)) row.co_no = coNo;

      const { data, error } = await supabase.from("change_orders" as any).insert(row as any).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["change-orders"] });
      qc.invalidateQueries({ queryKey: ["procore-change-orders", projectId] });
    },
  });

  /** Persist an edited spec on an existing (unlocked) CO and regenerate the docx. */
  const update = useMutation({
    mutationFn: async ({ coId, spec }: { coId: string; spec: CoSpec }) => {
      const docxBlob = await generateCoDocx(spec);
      const docx_path = await uploadCoArtifact(docxBlob, projectId!, "change-orders", "docx");
      const { error } = await supabase
        .from("change_orders" as any)
        .update({ spec, docx_path, title: spec.doc.title, amount: grandTotalNumber(spec.pricing) } as any)
        .eq("id", coId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["co", v.coId] });
      qc.invalidateQueries({ queryKey: ["change-orders"] });
    },
  });

  return { create, update };
}
