/**
 * Pure helpers for the financial ledger. Kept free of React/Supabase so they
 * can be unit-tested directly (see src/hooks/__tests__/ledger.test.ts).
 */
import type { LedgerEntry, InvoiceBalance } from "@/hooks/useContractFinancials";

export interface LedgerSummary {
  arBilled: number;
  arReceived: number;
  arOutstanding: number;
  apBilled: number;
  apPaid: number;
  apOutstanding: number;
  /** Cash position: received from owner minus paid to subs. */
  netCash: number;
}

const isBill = (e: Pick<LedgerEntry, "entry_type">) =>
  e.entry_type === "invoice" || e.entry_type === "pay_app";

export function summarizeLedger(entries: LedgerEntry[]): LedgerSummary {
  const sum = (pred: (e: LedgerEntry) => boolean) =>
    entries.filter(pred).reduce((s, e) => s + (e.amount ?? 0), 0);

  const arBilled = sum((e) => e.direction === "receivable" && isBill(e));
  const arReceived = sum((e) => e.direction === "receivable" && e.entry_type === "payment");
  const apBilled = sum((e) => e.direction === "payable" && isBill(e));
  const apPaid = sum((e) => e.direction === "payable" && e.entry_type === "payment");

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

/** Remaining balance on an invoice after partial payments. */
export function balanceDue(b: Pick<InvoiceBalance, "net_due" | "paid_to_date">): number {
  return round2((b.net_due ?? 0) - (b.paid_to_date ?? 0));
}

export function round2(n: number): number {
  return Number(n.toFixed(2));
}
