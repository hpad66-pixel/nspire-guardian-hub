import { describe, it, expect } from "vitest";
import { buildBudgetMatrixCsv, type BudgetMatrixRow } from "@/hooks/useBudget";

describe("buildBudgetMatrixCsv", () => {
  const rows: BudgetMatrixRow[] = [
    {
      project_budget_id: "b1", cost_code_id: "cc1",
      cost_code: "03 30 00", cost_code_desc: "Cast-in-place Concrete",
      original_budget: 100000, approved_budget_mods: -5000, revised_budget: 95000,
      committed_cost: 80000, executed_cco: 5000, direct_cost: 2000,
      pending_exposure: 3000, forecast_to_complete: 90000, variance: 5000,
    },
    {
      project_budget_id: "b1", cost_code_id: "cc2",
      cost_code: "26 00 00", cost_code_desc: "Electrical",
      original_budget: 50000, approved_budget_mods: 5000, revised_budget: 55000,
      committed_cost: 40000, executed_cco: 0, direct_cost: 0,
      pending_exposure: 1000, forecast_to_complete: 41000, variance: 14000,
    },
  ];

  it("emits header + one row per input", () => {
    const csv = buildBudgetMatrixCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("cost_code");
    expect(lines[0]).toContain("revised_budget");
    expect(lines).toHaveLength(3);
  });

  it("quotes descriptions to survive commas", () => {
    const csv = buildBudgetMatrixCsv([{ ...rows[0], cost_code_desc: "Concrete, pre-cast" }]);
    expect(csv).toContain(`"Concrete, pre-cast"`);
  });

  it("preserves numeric values uncommified", () => {
    const csv = buildBudgetMatrixCsv(rows);
    expect(csv).toContain(",95000,");
    expect(csv).not.toContain(",95,000,");
  });
});
