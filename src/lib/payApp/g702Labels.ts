/**
 * Shared plain-English G702 line labels for the PDF cover, live sidebar,
 * and submitted summary table. Keep these in one place so every surface
 * explains the nine lines the same way.
 */
import type { G702Summary } from "@/lib/financial/payAppContinuation";

export type G702LineKey = keyof Pick<
  G702Summary,
  | "original_contract_sum"
  | "net_change_orders"
  | "contract_sum_to_date"
  | "completed_stored_to_date"
  | "retainage_total"
  | "total_earned_less_retainage"
  | "less_previous_certificates"
  | "current_payment_due"
  | "balance_to_finish"
>;

export interface G702LineCopy {
  no: string;
  key: G702LineKey;
  /** Short label (tables / sidebar). */
  label: string;
  /** Optional sub-line explaining the math / meaning. */
  sub?: string;
  /** Highlight the current-due row. */
  highlight?: boolean;
}

/** Standard (progress) invoice wording. */
export const G702_LINE_COPY: G702LineCopy[] = [
  {
    no: "1.",
    key: "original_contract_sum",
    label: "Original Contract Sum",
    sub: "The original agreed contract amount",
  },
  {
    no: "2.",
    key: "net_change_orders",
    label: "Net change by change orders",
    sub: "Approved additions less deductions",
  },
  {
    no: "3.",
    key: "contract_sum_to_date",
    label: "Contract Sum to date (Line 1 ± 2)",
    sub: "Original contract plus net change orders",
  },
  {
    no: "4.",
    key: "completed_stored_to_date",
    label: "Total completed and stored to date",
    sub: "Work billed through this application (Column G on detail sheet)",
  },
  {
    no: "5.",
    key: "retainage_total",
    label: "Retainage",
    sub: "Amount held back from completed work",
  },
  {
    no: "6.",
    key: "total_earned_less_retainage",
    label: "Total earned less retainage",
    sub: "Line 4 less Line 5 Total — amount earned and releasable to date",
  },
  {
    no: "7.",
    key: "less_previous_certificates",
    label: "Less previous certificates for payment (paid to date)",
    sub: "Prior certificates already paid by the Owner/Client",
  },
  {
    no: "8.",
    key: "current_payment_due",
    label: "Current payment due",
    sub: "Amount now requested on this application (Line 6 − Line 7)",
    highlight: true,
  },
  {
    no: "9.",
    key: "balance_to_finish",
    label: "Balance to finish, including retainage",
    sub: "Line 3 less Line 6 — remaining contract work still to finish",
  },
];

/** Final-invoice overrides — Line 9 must not imply more work will be billed. */
const FINAL_LINE_OVERRIDES: Partial<Record<G702LineKey, Pick<G702LineCopy, "label" | "sub">>> = {
  less_previous_certificates: {
    label: "Less previous certificates for payment (paid to date)",
    sub: "Cash / certificates already paid by the Owner/Client through prior applications",
  },
  current_payment_due: {
    label: "Current payment due (FINAL)",
    sub: "Remaining balance now due — this is the final invoice",
  },
  balance_to_finish: {
    label: "Unbilled contract balance (not billed)",
    sub: "Quantities/credits left on the table — will not be billed. This FINAL invoice closes the project.",
  },
};

/** Resolve the nine G702 lines for UI / PDF (final vs progress). */
export function g702LineCopy(isFinalInvoice = false): G702LineCopy[] {
  if (!isFinalInvoice) return G702_LINE_COPY;
  return G702_LINE_COPY.map((row) => {
    const over = FINAL_LINE_OVERRIDES[row.key];
    return over ? { ...row, ...over } : row;
  });
}

/** Compact sidebar / submitted-table labels (number + short label). */
export function g702SidebarRows(isFinalInvoice = false): Array<[string, G702LineKey]> {
  return g702LineCopy(isFinalInvoice).map((r) => [`${r.no} ${r.label}`, r.key]);
}
