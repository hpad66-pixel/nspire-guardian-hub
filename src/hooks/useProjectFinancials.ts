/**
 * F0 · useProjectFinancials — the mega-dashboard's single source.
 * Reads v_project_financial_summary + v_project_financial_ledger and the
 * per-record balance views.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LedgerEntry } from "@/lib/financial/ledger";

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
      return (data ?? null) as unknown as ProjectFinancialSummary | null;
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
      return (data ?? []) as unknown as LedgerEntry[];
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
      return (data ?? []) as unknown as PayAppBalance[];
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
      return (data ?? []) as unknown as CommitmentInvoiceBalance[];
    },
  });

  return { summary, ledger, payAppBalances, invoiceBalances };
}
