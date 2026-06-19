/**
 * F0 · useProjectFinancials — the mega-dashboard's single source.
 * Reads v_project_financial_summary + v_project_financial_ledger and the
 * per-record balance views.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LedgerEntry } from "@/lib/financial/ledger";

/**
 * PostgREST serializes Postgres `numeric` as a JSON string ("523061.00").
 * The financial views are all numeric, so coerce the money/count fields to real
 * numbers — otherwise `summarizeLedger`/`money()` do string math and crash,
 * which blanks the whole Financial Overview.
 */
const n = (v: unknown): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : 0;
};
function coerce<T>(row: any, keys: string[]): T {
  if (!row) return row;
  const out = { ...row };
  for (const k of keys) if (k in out) out[k] = n(out[k]);
  return out as T;
}
const SUMMARY_NUMS = [
  "original_contract", "approved_co_value", "revised_contract", "billed_to_date",
  "received_to_date", "ar_outstanding", "ar_retainage_held", "committed_total",
  "commitment_invoiced", "paid_to_subs", "ap_outstanding", "ap_retainage_held",
  "net_cash_position",
];
const PAYAPP_NUMS = ["pay_app_no", "billed_amount", "retainage_held", "received_to_date", "balance_due", "payment_count"];
const INVOICE_NUMS = ["billed_amount", "retainage_held", "paid_to_date", "balance_due", "payment_count"];

export interface ProjectFinancialSummary {
  project_id: string;
  tenant_id: string;
  original_contract: number;
  approved_co_value: number;
  revised_contract: number;
  billed_to_date: number;
  received_to_date: number;
  ar_outstanding: number;
  ar_retainage_held: number;
  committed_total: number;
  commitment_invoiced: number;
  paid_to_subs: number;
  ap_outstanding: number;
  ap_retainage_held: number;
  net_cash_position: number;
}

export interface PayAppBalance {
  pay_app_id: string;
  project_id: string;
  pay_app_no: number;
  status: string;
  billed_amount: number;
  retainage_held: number;
  received_to_date: number;
  balance_due: number;
  payment_count: number;
}

export interface CommitmentInvoiceBalance {
  commitment_invoice_id: string;
  project_id: string;
  commitment_id: string;
  invoice_no: string | null;
  status: string;
  billed_amount: number;
  retainage_held: number;
  paid_to_date: number;
  balance_due: number;
  payment_count: number;
  lien_satisfied: boolean;
}

export function useProjectFinancials(projectId: string | null) {
  const summary = useQuery<ProjectFinancialSummary | null>({
    queryKey: ["project-financials", "summary", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_project_financial_summary" as any)
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data ? coerce<ProjectFinancialSummary>(data, SUMMARY_NUMS) : null;
    },
  });

  const ledger = useQuery<LedgerEntry[]>({
    queryKey: ["project-financials", "ledger", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_project_financial_ledger" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => coerce<LedgerEntry>(r, ["amount"]));
    },
  });

  const payAppBalances = useQuery<PayAppBalance[]>({
    queryKey: ["pay-app-balances", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_pay_app_balances" as any)
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => coerce<PayAppBalance>(r, PAYAPP_NUMS));
    },
  });

  const invoiceBalances = useQuery<CommitmentInvoiceBalance[]>({
    queryKey: ["commitment-invoice-balances", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_commitment_invoice_balances" as any)
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => coerce<CommitmentInvoiceBalance>(r, INVOICE_NUMS));
    },
  });

  return { summary, ledger, payAppBalances, invoiceBalances };
}
