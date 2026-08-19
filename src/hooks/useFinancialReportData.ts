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

export function useFinancialReportData(projectId: string | null, options: { ownerSafe?: boolean } = {}) {
  const { data: contract, isLoading: contractLoading } = usePrimeContract(projectId);
  const primeContractId = contract?.id ?? null;
  const ownerSafe = options.ownerSafe === true;

  const query = useQuery<ReportData | null>({
    queryKey: ["financial-report-data", projectId, primeContractId, ownerSafe ? "owner-safe" : "internal"],
    enabled: Boolean(projectId) && Boolean(primeContractId) && Boolean(contract),
    queryFn: async () => {
      if (!contract || !primeContractId || !projectId) return null;

      const [cos, payApps, primePayments, commitments, liens] = await Promise.all([
        supabase.from("change_orders" as any)
          .select("co_no, co_type, title, amount, status, commitment_id").eq("project_id", projectId),
        supabase.from("prime_contract_pay_apps" as any)
          .select("id, pay_app_no, period_end, status, submitted_amount, approved_amount, pay_app_data")
          .eq("prime_contract_id", primeContractId),
        // Owner → us receipts, with method/reference + the pay app each settles.
        supabase.from("prime_contract_payments" as any)
          .select("amount, received_date, method, reference, pay_app_id").eq("prime_contract_id", primeContractId),
        ownerSafe
          ? Promise.resolve({ data: [] as any[] })
          : supabase.from("commitments" as any)
              .select("id, title, original_value, vendor_org_id").eq("project_id", projectId),
        supabase.from("lien_releases" as any)
          .select("direction, status").eq("project_id", projectId),
      ]);

      const commitmentRows = (commitments.data ?? []) as any[];
      const commitmentIds = commitmentRows.map((c) => c.id);
      const commitmentPayments = commitmentIds.length
        ? await supabase.from("commitment_payments" as any)
            .select("commitment_id, commitment_invoice_id, amount, paid_date, method, reference").in("commitment_id", commitmentIds)
        : { data: [] as any[] };

      // Resolve the invoice behind every AP disbursement.  Keeping this as a
      // separate, keyed read avoids relying on PostgREST relationship aliases
      // and makes the report lineage explicit: payment -> invoice -> commitment.
      const invoiceIds = [...new Set(((commitmentPayments.data ?? []) as any[])
        .map((p) => p.commitment_invoice_id).filter(Boolean))];
      const commitmentInvoices = invoiceIds.length
        ? await supabase.from("commitment_invoices" as any)
            .select("id, invoice_no, status, period_end").in("id", invoiceIds)
        : { data: [] as any[] };
      const invoiceById = new Map<string, any>(
        ((commitmentInvoices.data ?? []) as any[]).map((invoice) => [invoice.id, invoice]),
      );

      // Resolve subcontractor display names from organizations (commitments only
      // carry vendor_org_id). One extra fetch keyed by the distinct vendor ids.
      const vendorIds = [...new Set(commitmentRows.map((c) => c.vendor_org_id).filter(Boolean))];
      const orgs = vendorIds.length
        ? await supabase.from("organizations" as any).select("id, name").in("id", vendorIds)
        : { data: [] as any[] };
      const orgName = new Map<string, string>(((orgs.data ?? []) as any[]).map((o) => [o.id, o.name]));

      // pay_app_id → pay_app_no, so each receipt shows which application it settles.
      const payAppNoById = new Map<string, number>(
        ((payApps.data ?? []) as any[]).map((p) => [p.id, Number(p.pay_app_no)]),
      );

      return {
        contract: { original_value: Number(contract.original_value), retainage_pct: Number(contract.retainage_pct ?? 0) },
        parties: {
          owner: (contract as any).owner_name || "Owner",
          contractor: (contract as any).contractor_name || "Contractor",
        },
        changeOrders: ((cos.data ?? []) as any[]).map((c) => ({
          co_no: Number(c.co_no), co_type: c.co_type, title: c.title ?? "",
          amount: Number(c.amount), status: c.status, commitment_id: c.commitment_id ?? null,
        })),
        payApps: ((payApps.data ?? []) as any[]).map((p) => ({
          pay_app_no: Number(p.pay_app_no), period_end: p.period_end, status: p.status,
          submitted_amount: p.submitted_amount, approved_amount: p.approved_amount, pay_app_data: p.pay_app_data,
        })),
        primePayments: ((primePayments.data ?? []) as any[]).map((p) => ({
          amount: Number(p.amount), received_date: p.received_date,
          method: p.method ?? null, reference: p.reference ?? null,
          pay_app_no: p.pay_app_id != null ? (payAppNoById.get(p.pay_app_id) ?? null) : null,
        })),
        commitments: commitmentRows.map((c) => ({
          id: c.id, title: c.title ?? "Commitment", original_value: Number(c.original_value),
          vendor_name: c.vendor_org_id ? (orgName.get(c.vendor_org_id) ?? null) : null,
        })),
        commitmentPayments: ((commitmentPayments.data ?? []) as any[]).map((p) => ({
          commitment_id: p.commitment_id,
          commitment_invoice_id: p.commitment_invoice_id,
          invoice_no: invoiceById.get(p.commitment_invoice_id)?.invoice_no ?? null,
          invoice_status: invoiceById.get(p.commitment_invoice_id)?.status ?? null,
          invoice_period_end: invoiceById.get(p.commitment_invoice_id)?.period_end ?? null,
          amount: Number(p.amount), paid_date: p.paid_date,
          method: p.method ?? null, reference: p.reference ?? null,
        })),
        liens: ((liens.data ?? []) as any[]).map((l) => ({ direction: l.direction, status: l.status })),
      } as ReportData;
    },
  });

  return { contract, data: query.data ?? null, isLoading: contractLoading || query.isLoading };
}
