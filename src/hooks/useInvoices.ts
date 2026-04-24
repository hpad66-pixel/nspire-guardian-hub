/**
 * D2 · useInvoices — commitment invoice CRUD + line editing + workflow.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommitmentInvoiceLine {
  id: string; invoice_id: string; sov_line_id: string;
  work_this_period: number; materials_stored: number;
  pct_complete: number | null;
}

export function useInvoice(invoiceId: string | null) {
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_invoices" as any).select("*")
        .eq("id", invoiceId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const lines = useQuery<CommitmentInvoiceLine[]>({
    queryKey: ["invoice-lines", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_invoice_lines" as any).select("*")
        .eq("invoice_id", invoiceId!);
      if (error) throw error;
      return (data ?? []) as CommitmentInvoiceLine[];
    },
  });

  const upsertLine = useMutation({
    mutationFn: async (input: {
      sov_line_id: string;
      work_this_period: number;
      materials_stored: number;
      pct_complete?: number | null;
    }) => {
      if (!invoiceId) throw new Error("No invoice");
      const { data, error } = await supabase
        .from("commitment_invoice_lines" as any)
        .upsert(
          { invoice_id: invoiceId, ...input } as any,
          { onConflict: "invoice_id,sov_line_id" },
        )
        .select().single();
      if (error) throw error;
      return data as CommitmentInvoiceLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice-lines", invoiceId] }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error("No invoice");
      const { data: ll } = await supabase
        .from("commitment_invoice_lines" as any)
        .select("work_this_period, materials_stored")
        .eq("invoice_id", invoiceId);
      const total = (ll ?? []).reduce(
        (s: number, l: any) =>
          s + Number(l.work_this_period ?? 0) + Number(l.materials_stored ?? 0),
        0,
      );
      const { data, error } = await supabase
        .from("commitment_invoices" as any)
        .update({ status: "submitted", submitted_amount: total } as any)
        .eq("id", invoiceId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
  });

  const approve = useMutation({
    mutationFn: async (approvedAmount: number) => {
      if (!invoiceId) throw new Error("No invoice");
      const { data: inv } = await supabase
        .from("commitment_invoices" as any)
        .select("commitment_id").eq("id", invoiceId).single();
      const { data: c } = await supabase
        .from("commitments" as any).select("retainage_pct")
        .eq("id", (inv as any).commitment_id).single();
      const retainage = Number(((approvedAmount * Number((c as any).retainage_pct ?? 0)) / 100).toFixed(2));
      const { data, error } = await supabase
        .from("commitment_invoices" as any)
        .update({
          status: "approved",
          approved_amount: approvedAmount,
          retainage_held: retainage,
        } as any)
        .eq("id", invoiceId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
  });

  const reject = useMutation({
    mutationFn: async (reason: string) => {
      if (!invoiceId) throw new Error("No invoice");
      const { data, error } = await supabase
        .from("commitment_invoices" as any)
        .update({ status: "rejected", rejection_comment: reason } as any)
        .eq("id", invoiceId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", invoiceId] }),
  });

  return { detail, lines, upsertLine, submit, approve, reject };
}
