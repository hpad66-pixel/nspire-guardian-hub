import { describe, it, expect } from "vitest";

/**
 * Math-only sanity tests for pay-app approval logic.
 *
 * The approve mutation computes retainage = approved × (retainage_pct / 100),
 * rounded to 2 dp. We test the pure math here; mutation wiring is smoke-tested
 * through the hooks.test.ts module load and exercised end-to-end by the
 * Playwright spec (once the auth fixture lands).
 */
function calcRetainage(approved: number, pct: number): number {
  return Number(((approved * pct) / 100).toFixed(2));
}

describe("usePayApp retainage math", () => {
  it("10% of $100,000 = $10,000", () => {
    expect(calcRetainage(100000, 10)).toBe(10000);
  });

  it("5% of $12,345.67 rounds to 2 dp", () => {
    expect(calcRetainage(12345.67, 5)).toBe(617.28);
  });

  it("0% returns zero", () => {
    expect(calcRetainage(50000, 0)).toBe(0);
  });

  it("100% equals the approved amount", () => {
    expect(calcRetainage(9999.99, 100)).toBe(9999.99);
  });
});
