/**
 * Render smoke test for the Financial Overview dashboard — mounts it with mock
 * financials so a regression in the redesigned KPI grid / tooltips fails CI
 * instead of reaching the page.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useProjectFinancials", () => ({
  useProjectFinancials: () => ({
    summary: {
      data: {
        original_contract: 523061, approved_co_value: 428579.35, revised_contract: 951640.35,
        billed_to_date: 914865.83, received_to_date: 667871.38, ar_outstanding: 246994.45,
        committed_total: 584402.69, paid_to_subs: 485779.39, ap_outstanding: 507854.39,
        ar_retainage_held: 30631.63, ap_retainage_held: 1250, net_cash_position: 182091.99,
      },
    },
    ledger: { data: [], isLoading: false },
    payAppBalances: { data: [] },
    invoiceBalances: { data: [] },
  }),
}));

import { FinancialOverview } from "../FinancialOverview";

describe("FinancialOverview dashboard", () => {
  it("renders the primary contractual KPIs without throwing", () => {
    const { container } = render(
      <MemoryRouter><FinancialOverview projectId="p1" /></MemoryRouter>,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Total Contract");
    expect(text).toContain("$951,640.35"); // revised contract
    expect(text).toContain("Change Orders");
    expect(text).toContain("Billed to Date");
    expect(text).toContain("Paid to Date");
    expect(text).toContain("Outstanding (owed to you)");
    expect(text).toContain("96% of contract"); // 914,865.83 / 951,640.35
    // secondary detail is collapsed by default
    expect(text).toContain("More detail");
    expect(text).not.toContain("Net Cash Position");
  });
});
