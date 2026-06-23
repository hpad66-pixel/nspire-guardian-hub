/**
 * useFinancialReportData — one read-only pull of everything the Financial Reports
 * center needs for a project: prime contract, change orders, pay apps, payments
 * received, commitments + their payments, and lien releases. RLS keeps it
 * tenant-scoped; nothing here writes.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import type { ReportData } from "@/lib/reports/financialReports";

export function useFinancialReportData(projectId: string | null) {
  const { data: contract, isLoading: contractLoading } = usePrimeContract(projectId);
  const primeContractId = contract?.id ?? null;

  const query = useQuery<ReportData | null>({
    queryKey: ["financial-report-data", projectId, primeContractId],
    enabled: Boolean(projectId) && Boolean(primeContractId) && Boolean(contract),
    queryFn: async () => {
      if (!contract || !primeContractId || !projectId) return null;

      const [cos, payApps, primePayments, commitments, liens] = await Promise.all([
        supabase.from("change_orders" as any)
          .select("co_no, co_type, title, amount, status, commitment_id").eq("project_id", projectId),
        supabase.from("prime_contract_pay_apps" as any)
          .select("pay_app_no, period_end, status, submitted_amount, approved_amount, pay_app_data")
          .eq("prime_contract_id", primeContractId),
        supabase.from("prime_contract_payments" as any)
          .select("amount, received_date").eq("prime_contract_id", primeContractId),
        supabase.from("commitments" as any)
          .select("id, title, original_value").eq("project_id", projectId),
        supabase.from("lien_releases" as any)
          .select("direction, status").eq("project_id", projectId),
      ]);

      const commitmentRows = (commitments.data ?? []) as any[];
      const commitmentIds = commitmentRows.map((c) => c.id);
      const commitmentPayments = commitmentIds.length
        ? await supabase.from("commitment_payments" as any)
            .select("commitment_id, amount, paid_date").in("commitment_id", commitmentIds)
        : { data: [] as any[] };

      return {
        contract: { original_value: Number(contract.original_value), retainage_pct: Number(contract.retainage_pct ?? 0) },
        changeOrders: ((cos.data ?? []) as any[]).map((c) => ({
          co_no: Number(c.co_no), co_type: c.co_type, title: c.title ?? "",
          amount: Number(c.amount), status: c.status, commitment_id: c.commitment_id ?? null,
        })),
        payApps: ((payApps.data ?? []) as any[]).map((p) => ({
          pay_app_no: Number(p.pay_app_no), period_end: p.period_end, status: p.status,
          submitted_amount: p.submitted_amount, approved_amount: p.approved_amount, pay_app_data: p.pay_app_data,
        })),
        primePayments: ((primePayments.data ?? []) as any[]).map((p) => ({ amount: Number(p.amount), received_date: p.received_date })),
        commitments: commitmentRows.map((c) => ({ id: c.id, title: c.title ?? "Commitment", original_value: Number(c.original_value) })),
        commitmentPayments: ((commitmentPayments.data ?? []) as any[]).map((p) => ({
          commitment_id: p.commitment_id, amount: Number(p.amount), paid_date: p.paid_date,
        })),
        liens: ((liens.data ?? []) as any[]).map((l) => ({ direction: l.direction, status: l.status })),
      } as ReportData;
    },
  });

  return { contract, data: query.data ?? null, isLoading: contractLoading || query.isLoading };
}
