/**
 * buildPayAppSpec — assemble a PayApplicationSpec from the live continuation data
 * (pay app + contract + CO settings + G702 + lines). Shared by the PDF export
 * button and the sign/send dialog so both render an identical document.
 */
import type { PayApplicationSpec } from "./PayApplicationDocument";
import { withResolvedLine9, type G702Summary } from "@/lib/financial/payAppContinuation";
import type { ContinuationLine } from "@/hooks/usePayAppContinuation";
import type { PrimeContract } from "@/hooks/usePrimeContract";

export interface BuildSpecOpts {
  /** Override the stamped signature (e.g. a just-drawn one not yet persisted). */
  signatureUrl?: string | null;
  signedName?: string | null;
  signedDate?: string | null;
  draft?: boolean;
  reconciled?: boolean;
  /** Force FINAL INVOICE rendering on the G702 cover. */
  isFinalInvoice?: boolean;
}

export function buildPayAppSpec(
  pa: any,
  contract: PrimeContract,
  coSettings: any,
  g702: G702Summary,
  lines: ContinuationLine[],
  opts: BuildSpecOpts = {},
): PayApplicationSpec {
  const s: any = coSettings ?? {};
  const signedAt = pa.signed_at ? new Date(pa.signed_at).toISOString().slice(0, 10) : null;
  const isFinal =
    Boolean(pa?.is_final_invoice) ||
    Boolean(pa?.pay_app_data?.is_final_invoice) ||
    Boolean(opts.isFinalInvoice);
  // Final invoices must show Line 9 = contract − completed (unbuilt), never the
  // AIA "incl. retainage" figure left in an older snapshot.
  const resolvedG702 = withResolvedLine9(g702, isFinal);
  return {
    wordmark: s.wordmark || s.company_name || "APAS CONSULTING",
    footer: s.footer ?? null,
    contractor: {
      name: contract.contractor_name || s.company_name || "APAS Consulting LLC",
      address: contract.contractor_address || s.company_address || null,
      contact: contract.contractor_contact || s.company_contact || null,
      email: contract.contractor_email || s.company_email || null,
      title: s.company_title || "Authorized Representative",
    },
    owner: {
      name: contract.owner_name || "Owner",
      address: contract.owner_address || null,
      contact: contract.owner_contact || null,
      email: contract.owner_email || null,
    },
    project: { name: contract.title, address: contract.project_address || null },
    payAppNo: pa.pay_app_no,
    periodEnd: pa.period_end,
    periodStart: pa.period_start ?? null,
    applicationDate: pa.approved_date || new Date().toISOString().slice(0, 10),
    contractNo: contract.contract_no,
    contractTitle: contract.title,
    retainagePct: Number(contract.retainage_pct ?? 0),
    // Procore cover header fields (fall back inside the document if absent).
    invoiceNo: pa.invoice_no ?? pa.pay_app_no,
    projectNo: (contract as any).project_no ?? contract.contract_no,
    contractDate: (contract as any).contract_date ?? (contract as any).start_date ?? null,
    contractFor: (contract as any).scope_of_work ?? (contract as any).description ?? contract.title,
    engineer: (contract as any).engineer_name ?? null,
    // Prefer an explicit reconciled Amount Certified when the snapshot carries one
    // (final invoice after interim cash); otherwise the document falls back to Line 8.
    amountCertified:
      pa?.pay_app_data?.amount_certified != null
        ? Number(pa.pay_app_data.amount_certified)
        : resolvedG702.current_payment_due,
    g702: resolvedG702,
    lines: lines.map((l) => ({
      item_no: l.item_no,
      description: l.description,
      unit: l.unit,
      kind: l.kind,
      // Coerce every numeric — Supabase `numeric` can arrive as string; the G703
      // grand-total reduce must never string-concatenate into a $90M figure.
      scheduled_qty: Number(l.scheduled_qty) || 0,
      unit_price: Number(l.unit_price) || 0,
      scheduled_value: Number(l.scheduled_value) || 0,
      prev_qty: Number(l.prior_qty_to_date) || 0,
      this_qty: Number(l.qty_this_period) || 0,
      qty_to_date: Number(l.qty_to_date) || 0,
      prev_value: Number(l.prior_value_to_date) || 0,
      this_value: Number(l.value_this_period) || 0,
      value_to_date: Number(l.value_to_date) || 0,
      pct: Number(l.pct_complete) || 0,
      retainage: Number(l.retainage) || 0,
    })),
    signatureUrl: opts.signatureUrl !== undefined ? opts.signatureUrl : (pa.signature_data ?? null),
    signedName: opts.signedName !== undefined ? opts.signedName : (pa.signed_name ?? null),
    signedDate: opts.signedDate !== undefined ? opts.signedDate : signedAt,
    draft: opts.draft ?? false,
    reconciled: opts.reconciled !== undefined ? opts.reconciled : pa.status === "paid",
    isFinalInvoice: isFinal,
  };
}
