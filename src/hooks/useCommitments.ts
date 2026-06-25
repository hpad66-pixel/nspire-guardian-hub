/**
 * D2 · Commitments hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface Commitment {
  id: string; tenant_id: string; project_id: string;
  commitment_type: "subcontract"|"purchase_order";
  commitment_no: string; title: string;
  vendor_org_id: string | null;
  executed_date: string | null;
  original_value: number;
  retainage_pct: number;
  status: "draft"|"out_for_signature"|"executed"|"closed"|"terminated"|"void";
  created_at: string; updated_at: string;
}

export interface CommitmentSovLine {
  id: string; commitment_id: string; line_no: number;
  cost_code_id: string; description: string; scheduled_value: number;
}

export interface CommitmentInvoice {
  id: string; commitment_id: string; invoice_no: string;
  period_end: string;
  status: "draft"|"submitted"|"approved"|"paid"|"rejected";
  submitted_amount: number | null;
  approved_amount: number | null;
  retainage_held: number | null;
  rejection_comment: string | null;
}

export function useCommitments(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<Commitment[]>({
    queryKey: ["commitments", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitments" as any).select("*")
        .eq("project_id", projectId!).order("commitment_no");
      if (error) throw error;
      return (data ?? []) as unknown as Commitment[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Commitment> & {
      commitment_type: Commitment["commitment_type"];
      commitment_no: string; title: string; original_value: number;
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("commitments" as any).insert({
        tenant_id, project_id: projectId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as Commitment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments", projectId] }),
  });

  return { ...list, create };
}

export function useCommitmentSov(commitmentId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<CommitmentSovLine[]>({
    queryKey: ["commitment-sov", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_sov_lines" as any).select("*")
        .eq("commitment_id", commitmentId!).order("line_no");
      if (error) throw error;
      return (data ?? []) as unknown as CommitmentSovLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: Omit<CommitmentSovLine, "id" | "commitment_id">) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("commitment_sov_lines" as any).insert({
        tenant_id, commitment_id: commitmentId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as CommitmentSovLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitment-sov", commitmentId] }),
  });

  return { ...list, addLine };
}

export function useCommitmentTotals(commitmentId: string | null) {
  return useQuery({
    queryKey: ["commitment-totals", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_totals" as any).select("*")
        .eq("commitment_id", commitmentId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCommitmentInvoices(commitmentId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<CommitmentInvoice[]>({
    queryKey: ["commitment-invoices", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_invoices" as any).select("*")
        .eq("commitment_id", commitmentId!).order("invoice_no");
      if (error) throw error;
      return (data ?? []) as unknown as CommitmentInvoice[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { invoice_no: string; period_end: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("commitment_invoices" as any).insert({
        tenant_id, commitment_id: commitmentId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as CommitmentInvoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitment-invoices", commitmentId] }),
  });

  return { ...list, create };
}
