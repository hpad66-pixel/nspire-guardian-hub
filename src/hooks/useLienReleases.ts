/**
 * F0 · useLienReleases — inbound (from subs) + outbound (to owner) lien waivers.
 * Approval routes through the A4 workflow engine.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { createWorkflowInstance, advanceWorkflow } from "@/lib/workflow";
import type { ReleaseType } from "@/lib/financial/lien";

export interface LienRelease {
  id: string;
  tenant_id: string;
  project_id: string;
  direction: "inbound" | "outbound";
  release_type: ReleaseType;
  commitment_invoice_id: string | null;
  pay_app_id: string | null;
  through_date: string | null;
  amount: number | null;
  status: "pending" | "submitted" | "approved" | "rejected" | "void";
  artifact_id: string | null;
  workflow_instance_id: string | null;
  created_at: string;
}

export interface CreateLienReleaseInput {
  direction: "inbound" | "outbound";
  release_type: ReleaseType;
  commitment_invoice_id?: string | null;
  pay_app_id?: string | null;
  through_date?: string | null;
  amount?: number | null;
  artifact_id?: string | null;
}

export function useLienReleases(
  projectId: string | null,
  filter?: { commitmentInvoiceId?: string; payAppId?: string },
) {
  const qc = useQueryClient();

  const list = useQuery<LienRelease[]>({
    queryKey: ["lien-releases", projectId, filter ?? null],
    enabled: Boolean(projectId),
    queryFn: async () => {
      let q = supabase
        .from("lien_releases" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (filter?.commitmentInvoiceId) q = q.eq("commitment_invoice_id", filter.commitmentInvoiceId);
      if (filter?.payAppId) q = q.eq("pay_app_id", filter.payAppId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LienRelease[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lien-releases", projectId] });
    qc.invalidateQueries({ queryKey: ["commitment-invoice-balances"] });
    qc.invalidateQueries({ queryKey: ["project-financials"] });
  };

  const create = useMutation({
    mutationFn: async (input: CreateLienReleaseInput) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("lien_releases" as any)
        .insert({ ...input, project_id: projectId, tenant_id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as LienRelease;
    },
    onSuccess: invalidate,
  });

  /** Submit for internal approval via the A4 engine. */
  const submitForApproval = useMutation({
    mutationFn: async (lien: LienRelease) => {
      const instanceId = await createWorkflowInstance({
        recordId: lien.id,
        recordType: "lien_release",
        module: "lien_release" as any,
        projectId: lien.project_id,
      });
      const { error } = await supabase
        .from("lien_releases" as any)
        .update({ status: "submitted", workflow_instance_id: instanceId } as any)
        .eq("id", lien.id);
      if (error) throw error;
      return instanceId;
    },
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: async (lien: LienRelease) => {
      if (lien.workflow_instance_id) {
        await advanceWorkflow({ instanceId: lien.workflow_instance_id, action: "approve" as any });
      }
      const { error } = await supabase
        .from("lien_releases" as any)
        .update({ status: "approved" } as any)
        .eq("id", lien.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (lien: LienRelease) => {
      if (lien.workflow_instance_id) {
        await advanceWorkflow({ instanceId: lien.workflow_instance_id, action: "reject" as any });
      }
      const { error } = await supabase
        .from("lien_releases" as any)
        .update({ status: "rejected" } as any)
        .eq("id", lien.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...list, create, submitForApproval, approve, reject };
}
