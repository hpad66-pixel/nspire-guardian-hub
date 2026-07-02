// Pure consulting-invoice billing math — no supabase import, so it's directly
// unit-testable. Bill the delta between previously-billed % and this invoice's %.

export interface BillableScope {
  id: string;
  title: string;
  fee_amount: number;
  pct_complete: number;
  pct_billed: number;
}

export interface BillableLine {
  scope_id: string | null;
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

/** Amount to bill for a scope when moving from `prev`% to `thisPct`%. */
export function lineAmount(fee: number, prev: number, thisPct: number): number {
  const clamped = Math.max(prev, Math.min(100, thisPct));
  return Math.round(((Number(fee) || 0) * (clamped - prev)) / 100 * 100) / 100;
}

/** Seed invoice lines from scopes: default "this %" = current completion. */
export function buildBillableLines(scopeRows: BillableScope[]): BillableLine[] {
  return scopeRows.map((s) => {
    const pctPrev = Number(s.pct_billed) || 0;
    const pctThis = Math.max(pctPrev, Number(s.pct_complete) || 0);
    return {
      scope_id: s.id,
      description: s.title,
      fee_amount: Number(s.fee_amount) || 0,
      pct_prev: pctPrev,
      pct_this: pctThis,
      amount: lineAmount(Number(s.fee_amount) || 0, pctPrev, pctThis),
    };
  });
}
