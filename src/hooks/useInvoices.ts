/**
 * D2 · useInvoices — commitment invoice CRUD + line editing + workflow.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { isPaymentGated, type LienReleaseLike, type PaymentKind } from "@/lib/financial/lien";

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
      return (data ?? []) as unknown as CommitmentInvoiceLine[];
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
      return data as unknown as CommitmentInvoiceLine;
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

  // Per-invoice balance (billed vs paid + lien status) from the view.
  const balance = useQuery({
    queryKey: ["commitment-invoice-balance", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_commitment_invoice_balances" as any)
        .select("*")
        .eq("commitment_invoice_id", invoiceId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return data as any;
      // numeric view fields arrive as strings from PostgREST — coerce
      const num = (v: any) => { const x = parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };
      const d: any = { ...(data as any) };
      for (const k of ["billed_amount", "retainage_held", "paid_to_date", "balance_due", "payment_count"]) if (k in d) d[k] = num(d[k]);
      return d;
    },
  });

  // Inbound lien releases for this invoice (drives UI gate explainer).
  const lienReleases = useQuery<LienReleaseLike[]>({
    queryKey: ["lien-releases-for-invoice", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lien_releases" as any)
        .select("direction, release_type, status")
        .eq("commitment_invoice_id", invoiceId!);
      if (error) throw error;
      return (data ?? []) as unknown as LienReleaseLike[];
    },
  });

  /** UI-side gate mirror; the DB trigger is the hard guard. */
  const isGated = (kind: PaymentKind = "progress") =>
    isPaymentGated(lienReleases.data ?? [], kind);

  // Record an AP disbursement against this invoice.
  const recordPayment = useMutation({
    mutationFn: async (input: {
      amount: number; paid_date: string;
      method?: string | null; reference?: string | null;
      notes?: string | null; artifact_id?: string | null;
    }) => {
      if (!invoiceId) throw new Error("No invoice");
      const { data: inv } = await supabase
        .from("commitment_invoices" as any)
        .select("commitment_id").eq("id", invoiceId).single();
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("commitment_payments" as any)
        .insert({
          tenant_id,
          commitment_id: (inv as any).commitment_id,
          commitment_invoice_id: invoiceId,
          created_by: user?.id,
          ...input,
        } as any)
        .select().single();
      if (error) {
        if (/LIEN_REQUIRED/i.test(error.message))
          throw new Error("An approved lien release is required before paying this invoice.");
        if (/OVERPAYMENT/i.test(error.message))
          throw new Error("Exceeds the invoice's remaining balance.");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commitment-invoice-balance", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commitment-payments", invoiceId] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
    },
  });

  return {
    detail, lines, upsertLine, submit, approve, reject,
    balance, lienReleases, isGated, recordPayment,
  };
}
