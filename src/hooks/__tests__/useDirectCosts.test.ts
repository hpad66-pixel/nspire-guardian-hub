import { describe, it, expect } from "vitest";
import { buildDirectCostsCsv, type DirectCost, type DirectCostLine } from "@/hooks/useDirectCosts";

describe("buildDirectCostsCsv", () => {
  const costs: DirectCost[] = [
    {
      id: "dc1", tenant_id: "t1", project_id: "p1",
      cost_type: "invoice", reference_no: "INV-1001",
      vendor_org_id: "org1", employee_id: null,
      cost_date: "2026-04-01", amount: 1500, description: "Sheetrock delivery",
      status: "approved", attachment_doc_id: "doc1",
    },
    {
      id: "dc2", tenant_id: "t1", project_id: "p1",
      cost_type: "timecard", reference_no: "TC-2026-015",
      vendor_org_id: null, employee_id: "e1",
      cost_date: "2026-04-02", amount: 2600, description: "Week 15",
      status: "approved", attachment_doc_id: null,
    },
  ];
  const lines: DirectCostLine[] = [
    { id: "l1", direct_cost_id: "dc1", cost_code_id: "cc1", amount: 1500, hours: null, rate: null },
    { id: "l2", direct_cost_id: "dc2", cost_code_id: "cc2", amount: 2600, hours: 40, rate: 65 },
  ];
  const codes = [
    { id: "cc1", code: "09 20 00" },
    { id: "cc2", code: "01 50 00" },
  ];

  it("emits one row per direct_cost_line", () => {
    const csv = buildDirectCostsCsv(costs, lines, codes);
    const rows = csv.split("\n");
    expect(rows[0]).toBe("reference_no,cost_date,vendor_or_employee,amount,cost_code,description");
    expect(rows).toHaveLength(3);
  });

  it("maps cost_code_id to human-readable code", () => {
    const csv = buildDirectCostsCsv(costs, lines, codes);
    expect(csv).toContain("09 20 00");
    expect(csv).toContain("01 50 00");
  });
});
