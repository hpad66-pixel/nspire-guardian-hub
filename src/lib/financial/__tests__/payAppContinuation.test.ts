import { describe, it, expect } from "vitest";
import {
  coToSovLine,
  coPricedRowToSovLine,
  computeLineToDate,
  seedContinuationRows,
  computeG702,
} from "../payAppContinuation";

describe("coToSovLine", () => {
  it("shapes an approved CO as a lump-sum SOV line", () => {
    const line = coToSovLine(
      { id: "co1", co_no: 1, title: "Storm drainage", description: null, amount: 24050 },
      { sortOrder: 17, itemNo: "17" },
    );
    expect(line).toMatchObject({
      item_no: "17",
      kind: "change_order",
      change_order_id: "co1",
      budget_code: "PCO #001",
      description: "Storm drainage",
      unit: "LS",
      scheduled_qty: 1,
      unit_price: 24050,
      scheduled_value: 24050,
      sort_order: 17,
    });
  });

  it("falls back to description then a generic label, and null budget_code without co_no", () => {
    expect(coToSovLine({ id: "c", co_no: null, title: null, description: "Extra work", amount: 100 }, { sortOrder: 1, itemNo: "x" }).description).toBe("Extra work");
    const generic = coToSovLine({ id: "c", co_no: null, title: "  ", description: null, amount: 100 }, { sortOrder: 1, itemNo: "x" });
    expect(generic.description).toBe("Change Order");
    expect(generic.budget_code).toBeNull();
  });
});

describe("coPricedRowToSovLine", () => {
  it("shapes an additive line tied to a base line, inheriting the unit price", () => {
    const line = coPricedRowToSovLine(
      { description: "8\" PVC pipe", unit: "LF", qty: 120, unitPrice: 15, sourceSovLineItemId: "base-8in" },
      { id: "co9", co_no: 9 },
      { sortOrder: 21, itemNo: "21" },
    );
    expect(line).toMatchObject({
      kind: "change_order",
      change_order_id: "co9",
      source_sov_line_item_id: "base-8in",
      budget_code: "PCO #009",
      description: '8" PVC pipe',
      unit: "LF",
      scheduled_qty: 120,
      unit_price: 15,
      scheduled_value: 1800, // 120 × 15
    });
  });

  it("carries a signed negative quantity + value for a deductive line", () => {
    const line = coPricedRowToSovLine(
      { description: "8\" PVC pipe (credit)", unit: "LF", qty: -120, unitPrice: 15, sourceSovLineItemId: "base-8in" },
      { id: "co10", co_no: 10 },
      { sortOrder: 22, itemNo: "22" },
    );
    expect(line.scheduled_qty).toBe(-120);
    expect(line.scheduled_value).toBe(-1800);
    expect(line.source_sov_line_item_id).toBe("base-8in");
  });

  it("defaults a blank unit to EA and null budget_code without a co_no", () => {
    const line = coPricedRowToSovLine(
      { description: "Misc", unit: "", qty: 2, unitPrice: 50, sourceSovLineItemId: "b" },
      { id: "c", co_no: null },
      { sortOrder: 1, itemNo: "x" },
    );
    expect(line.unit).toBe("EA");
    expect(line.budget_code).toBeNull();
    expect(line.scheduled_value).toBe(100);
  });
});

describe("computeLineToDate", () => {
  it("adds this-period to prior and derives pct + retainage", () => {
    const r = computeLineToDate({
      scheduledValue: 1000,
      priorValueToDate: 400,
      priorQtyToDate: 40,
      valueThisPeriod: 100,
      qtyThisPeriod: 10,
      retainagePct: 10,
    });
    expect(r.value_to_date).toBe(500);
    expect(r.qty_to_date).toBe(50);
    expect(r.pct_complete).toBe(50); // 500 / 1000
    expect(r.retainage).toBe(50); // 10% of 500
  });

  it("guards divide-by-zero on a zero-value line", () => {
    const r = computeLineToDate({
      scheduledValue: 0, priorValueToDate: 0, priorQtyToDate: 0,
      valueThisPeriod: 0, qtyThisPeriod: 0, retainagePct: 10,
    });
    expect(r.pct_complete).toBe(0);
  });
});

describe("seedContinuationRows", () => {
  const sovLines = [
    { id: "a", scheduled_value: 1000 },
    { id: "b", scheduled_value: 500 },
  ];

  it("carries forward prior to-date and zeroes this-period", () => {
    const rows = seedContinuationRows({
      payAppId: "pa5",
      tenantId: "ws1",
      sovLines,
      priorByLineId: {
        a: { sov_line_item_id: "a", value_to_date: 400, qty_to_date: 40, retainage: 40 },
      },
    });
    const a = rows.find((r) => r.sov_line_item_id === "a")!;
    expect(a).toMatchObject({
      pay_app_id: "pa5", tenant_id: "ws1",
      value_to_date: 400, qty_to_date: 40, pct_complete: 40,
      qty_this_period: 0, value_this_period: 0, retainage: 40,
    });
    // line "b" has no prior → starts at zero
    const b = rows.find((r) => r.sov_line_item_id === "b")!;
    expect(b.value_to_date).toBe(0);
    expect(b.pct_complete).toBe(0);
  });
});

describe("computeG702", () => {
  it("derives the AIA cover figures (net COs, completed, retainage, current due)", () => {
    const g = computeG702({
      originalContractSum: 523061,
      previousCertificates: 300000,
      lines: [
        { kind: "base", scheduled_value: 523061, value_to_date: 461372, retainage: 46137.2 },
        { kind: "change_order", scheduled_value: 24050, value_to_date: 24050, retainage: 2405 },
        { kind: "change_order", scheduled_value: 132021.23, value_to_date: 100000, retainage: 10000 },
      ],
    });
    expect(g.net_change_orders).toBe(156071.23);
    expect(g.contract_sum_to_date).toBe(679132.23);
    expect(g.completed_stored_to_date).toBe(585422);
    expect(g.retainage_total).toBe(58542.2);
    expect(g.total_earned_less_retainage).toBe(526879.8);
    expect(g.less_previous_certificates).toBe(300000);
    expect(g.current_payment_due).toBe(226879.8);
    // Line 9 = line 3 − line 6 (incl. retainage): 679132.23 − 526879.8
    expect(g.balance_to_finish).toBe(152252.43);
  });

  it("zero lines → all zeros with no NaN", () => {
    const g = computeG702({ originalContractSum: 0, previousCertificates: 0, lines: [] });
    expect(Object.values(g).every((v) => v === 0)).toBe(true);
  });
});
