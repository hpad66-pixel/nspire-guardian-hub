/**
 * Adapter: render a Stack A (project_contracts) invoice/pay-app as the existing
 * AIA G702/G703 PDF. This is what makes "every pay app comes out in the A1A
 * format" true on the live contracts stack — we reuse generatePayAppPdf rather
 * than maintaining a second generator.
 */
import { generatePayAppPdf, downloadPayAppPdf, type PayAppPdfInput } from "./payApp";
import type { ProjectContract, ContractSovItem } from "@/hooks/useProjectContracts";
import type { ContractInvoice, ContractChangeOrder } from "@/hooks/useContractFinancials";

export function buildPayAppInput(args: {
  contract: ProjectContract;
  invoice: ContractInvoice;
  sovItems?: ContractSovItem[];
  changeOrders?: ContractChangeOrder[];
  tenantName?: string;
}): PayAppPdfInput {
  const { contract, invoice, sovItems = [], changeOrders = [], tenantName } = args;

  const original = contract.base_contract_amount ?? 0;
  const executedCo = changeOrders
    .filter((co) => co.status === "approved")
    .reduce((s, co) => s + (co.amount ?? 0), 0);

  // Owner contracts store the counterparty (R4) in subcontractor_name and APAS
  // in prime_contractor_name. Bill is FROM us (gc) TO the owner.
  const lines =
    sovItems.length > 0
      ? sovItems.map((it) => ({
          line_no: it.item_number,
          cost_code: it.budget_code ?? "",
          description: it.description,
          scheduled_value: it.subtotal ?? 0,
          work_this_period: it.billed_to_date ?? 0,
          materials_stored: 0,
          pct_complete: it.completed_pct ?? null,
        }))
      : [
          {
            line_no: 1,
            cost_code: "",
            description: invoice.notes ?? invoice.invoice_number ?? "Work this period",
            scheduled_value: invoice.amount,
            work_this_period: invoice.amount,
            materials_stored: 0,
            pct_complete: null,
          },
        ];

  return {
    tenantName,
    contract: {
      contract_no: contract.contract_number ?? "—",
      title: contract.contract_title,
      original_value: original,
      executed_co_value: executedCo,
      revised_contract_value: original + executedCo,
      retainage_pct: contract.retainage_percent ?? 0,
    },
    payApp: {
      pay_app_no: invoice.pay_app_no ?? 0,
      period_end: invoice.period_end ?? invoice.invoice_date ?? "",
      status: invoice.status,
      submitted_amount: invoice.amount,
      approved_amount: invoice.status === "approved" || invoice.status === "paid" ? invoice.amount : null,
      retainage_held: invoice.retainage,
    },
    project: { name: contract.contract_title, address: contract.project_address },
    owner: { name: contract.subcontractor_name, address: contract.subcontractor_address },
    gc: { name: contract.prime_contractor_name, address: contract.prime_contractor_address },
    architect: undefined,
    lines,
  };
}

export function generateContractPayAppPdf(args: Parameters<typeof buildPayAppInput>[0]) {
  return generatePayAppPdf(buildPayAppInput(args));
}

export async function downloadContractPayAppPdf(
  args: Parameters<typeof buildPayAppInput>[0],
  filename?: string,
) {
  const input = buildPayAppInput(args);
  await downloadPayAppPdf(input, filename ?? `PayApp-${input.payApp.pay_app_no}-${input.contract.contract_no}.pdf`);
}
