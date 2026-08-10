import { describe, expect, it } from "vitest";
import { proposalTotals } from "../FinancialProposalDocument";
import type { FinancialProposalLine } from "@/hooks/useFinancialProposals";

const line = (quantity: number, unitCost: number, markup: number): FinancialProposalLine => ({
  id: crypto.randomUUID(), tenant_id: "tenant", proposal_id: "proposal", line_no: 1,
  category: "labor", description: "Consulting services", quantity, unit: "hr",
  unit_cost: unitCost, markup_pct: markup, created_at: new Date().toISOString(),
});

describe("proposalTotals", () => {
  it("recomputes subtotal, markup, and proposal total from editable rows", () => {
    expect(proposalTotals([line(10, 150, 10), line(2, 500, 5)])).toEqual({
      subtotal: 2500,
      markup: 200,
      total: 2700,
    });
  });

  it("returns zeroes for an empty proposal", () => {
    expect(proposalTotals([])).toEqual({ subtotal: 0, markup: 0, total: 0 });
  });
});
