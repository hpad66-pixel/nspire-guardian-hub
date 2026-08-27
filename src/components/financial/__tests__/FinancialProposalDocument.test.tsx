import { describe, expect, it } from "vitest";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import type { FinancialProposalLine } from "@/hooks/useFinancialProposals";

const line = (quantity: number, unitCost: number, markup: number): FinancialProposalLine => ({
  id: crypto.randomUUID(), tenant_id: "tenant", proposal_id: "proposal", line_no: 1,
  category: "labor", description: "Consulting services", quantity, unit: "hr",
  unit_cost: unitCost, markup_pct: markup, created_at: new Date().toISOString(),
});

describe("proposalTotals", () => {
  it("recomputes subtotal, overhead, profit, and proposal total like a change order", () => {
    expect(proposalTotals([line(10, 150, 10), line(2, 500, 5)], { overhead_pct: 10, profit_pct: 5 })).toEqual({
      subtotal: 2500,
      overhead: 250,
      profit: 125,
      total: 2875,
    });
  });

  it("returns zeroes for an empty proposal", () => {
    expect(proposalTotals([], { overhead_pct: 10, profit_pct: 5 })).toEqual({ subtotal: 0, overhead: 0, profit: 0, total: 0 });
  });
});
