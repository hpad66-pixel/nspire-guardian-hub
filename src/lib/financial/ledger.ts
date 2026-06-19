/**
 * Pure helpers for the unified financial ledger (F0).
 * Repointed to the `v_project_financial_ledger` view shape. Kept free of
 * React/Supabase so it can be unit-tested directly.
 */

export type LedgerDirection = "receivable" | "payable";
export type LedgerEntryType =
  | "prime_contract" | "commitment" | "change_order"
  | "pay_app" | "invoice" | "payment" | "lien_release";

/** One row of `v_project_financial_ledger`. */
export interface LedgerEntry {
  ledger_id: string;
  tenant_id: string;
  project_id: string;
  cost_code_id: string | null;
  direction: LedgerDirection;
  entry_type: LedgerEntryType;
  entry_date: string | null;
  party_name: string | null;
  reference: string | null;
  description: string | null;
  amount: number;
  status: string | null;
  artifact_id: string | null;
  created_at: string;
}

/** Minimal shape needed to summarize — keeps callers loosely coupled. */
export interface LedgerSummable {
  entry_type: string;
  direction: LedgerDirection | string;
  amount: number;
}

export interface LedgerSummary {
  arBilled: number;       // pay apps to the owner
  arReceived: number;     // AR cash in
  arOutstanding: number;
  apBilled: number;       // vendor invoices
  apPaid: number;         // AP cash out
  apOutstanding: number;
  netCash: number;        // received − paid
}

const isReceivable = (d: string) => d === "receivable";
const isPayable = (d: string) => d === "payable";

export function summarizeLedger(entries: LedgerSummable[]): LedgerSummary {
  const sum = (pred: (e: LedgerSummable) => boolean) =>
    entries.filter(pred).reduce((s, e) => s + (e.amount ?? 0), 0);

  // AR billings = pay apps; AP billings = vendor invoices. Contract/CO rows are
  // contract value, not billings; payments are cash; liens are informational.
  const arBilled = sum((e) => isReceivable(e.direction) && e.entry_type === "pay_app");
  const arReceived = sum((e) => isReceivable(e.direction) && e.entry_type === "payment");
  const apBilled = sum((e) => isPayable(e.direction) && e.entry_type === "invoice");
  const apPaid = sum((e) => isPayable(e.direction) && e.entry_type === "payment");

  return {
    arBilled,
    arReceived,
    arOutstanding: round2(arBilled - arReceived),
    apBilled,
    apPaid,
    apOutstanding: round2(apBilled - apPaid),
    netCash: round2(arReceived - apPaid),
  };
}

/** Remaining balance after partial payments. */
export function balanceDue(b: { net_due?: number | null; paid_to_date?: number | null }): number {
  return round2((b.net_due ?? 0) - (b.paid_to_date ?? 0));
}

export function round2(n: number): number {
  return Number(n.toFixed(2));
}
