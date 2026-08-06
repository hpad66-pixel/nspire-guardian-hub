/**
 * Vendor payment ledger math — pure so the running balance a user reads off the
 * screen is unit-tested independently of rendering.
 */

export interface LedgerPaymentInput {
  id: string;
  amount: number;
  paid_date: string;
}

export interface LedgerRow<T extends LedgerPaymentInput> {
  payment: T;
  /** Cumulative total paid through this row, oldest → newest. */
  runningTotal: number;
}

export interface VendorLedgerSummary<T extends LedgerPaymentInput> {
  rows: LedgerRow<T>[];
  totalPaid: number;
}

/**
 * Sort oldest → newest (so the ledger reads like a bank statement) and attach a
 * running total. Ties on date keep a stable order by id so the sequence doesn't
 * shuffle between renders.
 */
export function buildVendorLedger<T extends LedgerPaymentInput>(payments: T[]): VendorLedgerSummary<T> {
  const sorted = [...payments].sort((a, b) => {
    const byDate = (a.paid_date ?? "").localeCompare(b.paid_date ?? "");
    return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
  });

  let running = 0;
  const rows = sorted.map((payment) => {
    running += payment.amount;
    return { payment, runningTotal: running };
  });

  return { rows, totalPaid: running };
}

/** Open balance on invoices: what they've billed minus what we've actually sent. */
export function openOnInvoices(billed: number, totalPaid: number): number {
  return billed - totalPaid;
}

/** Contract value remaining after cash out the door (negative = overpaid). */
export function remainingOnContract(revisedValue: number, totalPaid: number): number {
  return revisedValue - totalPaid;
}
