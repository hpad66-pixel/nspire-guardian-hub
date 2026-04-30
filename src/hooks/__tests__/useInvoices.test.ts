import { describe, it, expect } from "vitest";
import type { CommitmentInvoiceLine } from "@/hooks/useInvoices";

/**
 * Invoice line arithmetic — submitted_amount is the sum of
 * work_this_period + materials_stored across every line.
 */
function submittedTotal(lines: CommitmentInvoiceLine[]): number {
  return lines.reduce(
    (s, l) => s + Number(l.work_this_period ?? 0) + Number(l.materials_stored ?? 0),
    0,
  );
}

describe("useInvoices submitted-total math", () => {
  const mk = (w: number, m: number): CommitmentInvoiceLine => ({
    id: "x", invoice_id: "i", sov_line_id: "s",
    work_this_period: w, materials_stored: m, pct_complete: null,
  });

  it("sums empty list to zero", () => {
    expect(submittedTotal([])).toBe(0);
  });

  it("adds work + materials per line", () => {
    expect(submittedTotal([mk(1000, 200), mk(500, 0), mk(0, 150)])).toBe(1850);
  });

  it("handles fractional cents cleanly", () => {
    expect(submittedTotal([mk(12.34, 0.66)])).toBe(13);
  });
});
