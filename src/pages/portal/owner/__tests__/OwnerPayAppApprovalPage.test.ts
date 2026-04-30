import { describe, it, expect } from "vitest";

/**
 * F2 · Pay-app owner-adjustment math.
 *
 * Owner adjusts per-line work_this_period downward (never above submitted).
 * The approved total is the sum of adjusted work + original materials_stored.
 * Retainage on approval = adjusted_total × retainage_pct / 100.
 */
interface AdjustmentInput {
  sovLineId: string;
  submittedWork: number;
  materials: number;
}

function computeAdjustedTotal(
  lines: AdjustmentInput[],
  adjustments: Record<string, number>,
): number {
  return lines.reduce((sum, l) => {
    const work = adjustments[l.sovLineId] ?? l.submittedWork;
    return sum + work + l.materials;
  }, 0);
}

function computeRetainage(adjustedTotal: number, pct: number): number {
  return Number(((adjustedTotal * pct) / 100).toFixed(2));
}

function capAdjustment(submittedWork: number, proposed: number): number {
  if (proposed < 0) return 0;
  if (proposed > submittedWork) return submittedWork;
  return proposed;
}

describe("owner pay-app adjustment math", () => {
  const lines: AdjustmentInput[] = [
    { sovLineId: "a", submittedWork: 10000, materials: 2000 },
    { sovLineId: "b", submittedWork: 5000,  materials: 0 },
    { sovLineId: "c", submittedWork: 3000,  materials: 500 },
  ];

  it("unadjusted total equals sum of submitted + materials", () => {
    const total = computeAdjustedTotal(lines, {});
    expect(total).toBe(10000 + 2000 + 5000 + 0 + 3000 + 500);
  });

  it("adjusting one line down reduces the total", () => {
    const total = computeAdjustedTotal(lines, { a: 7500 });
    // lost 2500 on line a
    expect(total).toBe((10000 + 2000 + 5000 + 3000 + 500) - 2500);
  });

  it("retainage at 10% rounds correctly", () => {
    const t = 20500.123;
    expect(computeRetainage(t, 10)).toBe(2050.01);
  });

  it("caps adjustment at submittedWork — owner cannot bump value up", () => {
    expect(capAdjustment(10000, 15000)).toBe(10000);
    expect(capAdjustment(10000, 0)).toBe(0);
    expect(capAdjustment(10000, -50)).toBe(0);
    expect(capAdjustment(10000, 7500)).toBe(7500);
  });

  it("zero-out a line → retainage recomputes on new smaller total", () => {
    const total = computeAdjustedTotal(lines, { b: 0 });
    expect(total).toBe(10000 + 2000 + 0 + 3000 + 500);
    expect(computeRetainage(total, 5)).toBe(775);
  });
});
