/**
 * paymentAllocation — pure helpers for splitting a received payment across the
 * base contract, change orders, and/or specific SOV line items. UI + hooks use
 * these; the DB enforces the same caps (over-allocation + tenant boundary).
 */
export type AllocationKind = "base" | "change_order" | "line_item";

export interface AllocationDraft {
  kind: AllocationKind;
  change_order_id?: string | null;
  sov_line_item_id?: string | null;
  amount: number;
  label?: string; // display only
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const TOL = 0.01;

export function allocatedTotal(allocs: AllocationDraft[]): number {
  return round2(allocs.reduce((s, a) => s + (Number(a.amount) || 0), 0));
}

/** Amount of the payment not yet assigned to a target (never negative for display). */
export function unallocated(paymentAmount: number, allocs: AllocationDraft[]): number {
  return round2((Number(paymentAmount) || 0) - allocatedTotal(allocs));
}

/** Does an allocation point at exactly the right target for its kind? */
export function hasValidTarget(a: AllocationDraft): boolean {
  if (a.kind === "base") return !a.change_order_id && !a.sov_line_item_id;
  if (a.kind === "change_order") return Boolean(a.change_order_id) && !a.sov_line_item_id;
  if (a.kind === "line_item") return Boolean(a.sov_line_item_id) && !a.change_order_id;
  return false;
}

/** Returns a list of human-readable problems; empty array = valid to save. */
export function validateAllocations(paymentAmount: number, allocs: AllocationDraft[]): string[] {
  const errs: string[] = [];
  allocs.forEach((a, i) => {
    if (!(Number(a.amount) > 0)) errs.push(`Row ${i + 1}: amount must be greater than 0.`);
    if (!hasValidTarget(a)) errs.push(`Row ${i + 1}: choose what to apply it to.`);
  });
  if (allocatedTotal(allocs) > round2(paymentAmount) + TOL) {
    errs.push(`Allocations (${allocatedTotal(allocs)}) exceed the payment amount (${round2(paymentAmount)}).`);
  }
  return errs;
}
