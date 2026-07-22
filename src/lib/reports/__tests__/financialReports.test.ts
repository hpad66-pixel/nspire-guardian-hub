import { describe, it, expect } from "vitest";
import {
  financialSummary, billingHistory, changeOrderLog, cashFlow, commitmentStatus, lienCompliance,
  paymentsReceived, subcontractorPayments,
  type ReportData,
} from "../financialReports";

const base: ReportData = {
  contract: { original_value: 523061, retainage_pct: 5 },
  changeOrders: [
    { co_no: 1, co_type: "PCO", title: "Storm", amount: 24050, status: "executed", commitment_id: null },
    { co_no: 7, co_type: "PCO", title: "Permit", amount: 12600, status: "out_for_signature", commitment_id: null },
    { co_no: 5, co_type: "CCO", title: "Dshin sewer", amount: 101817.69, status: "executed", commitment_id: "dshin" },
  ],
  payApps: [
    { pay_app_no: 1, period_end: "2025-07-15", status: "paid", submitted_amount: 78459.15, approved_amount: null,
      pay_app_data: { completed_stored_to_date: 78459.15, retainage_total: 2611.21, total_earned_less_retainage: 75847.94, current_payment_due: 75847.94 } },
    { pay_app_no: 2, period_end: "2026-03-31", status: "submitted", submitted_amount: null, approved_amount: null,
      pay_app_data: { completed_stored_to_date: 444464.90, retainage_total: 19253.25, total_earned_less_retainage: 425211.65, current_payment_due: 349363.71 } },
  ],
  primePayments: [
    { amount: 63459.15, received_date: "2025-07-07" },
    { amount: 40000, received_date: "2026-05-22" },
  ],
  commitments: [{ id: "dshin", title: "D'SHIN Plumbing", original_value: 429510 }],
  commitmentPayments: [
    { commitment_id: "dshin", amount: 390779.39, paid_date: "2026-04-24" },
    { commitment_id: "dshin", amount: 25000, paid_date: "2026-05-08" },
  ],
  liens: [
    { direction: "outbound", status: "approved" },
    { direction: "outbound", status: "sent" },
    { direction: "inbound", status: "approved" },
  ],
};

describe("financialSummary", () => {
  it("revises by approved PCOs only and takes billed/retainage from the latest pay app", () => {
    const s = financialSummary(base);
    expect(s.originalValue).toBe(523061);
    expect(s.approvedCoValue).toBe(24050); // PCO#7 pending excluded; CCO excluded
    expect(s.revisedValue).toBe(547111);
    expect(s.billedToDate).toBe(444464.90); // latest pay app (#2)
    expect(s.retainageHeld).toBe(19253.25);
    expect(s.paidToDate).toBe(103459.15);
    expect(s.balanceToFinish).toBe(102646.10);
  });
});

describe("billingHistory", () => {
  it("derives this-period as the delta of completed-to-date", () => {
    const rows = billingHistory(base.payApps);
    expect(rows.map((r) => r.payAppNo)).toEqual([1, 2]);
    expect(rows[0].thisPeriod).toBe(78459.15);
    expect(rows[1].thisPeriod).toBe(366005.75); // 444464.90 − 78459.15
  });
});

describe("changeOrderLog", () => {
  it("splits approved vs pending and defaults to prime (PCO) only", () => {
    const log = changeOrderLog(base.changeOrders);
    expect(log.rows.every((r) => r.co_type === "PCO")).toBe(true);
    expect(log.approvedValue).toBe(24050);
    expect(log.pendingValue).toBe(12600);
  });
});

describe("cashFlow", () => {
  it("buckets money in/out by month with a running cumulative", () => {
    const cf = cashFlow(base.primePayments, base.commitmentPayments);
    const may = cf.find((r) => r.month === "2026-05")!;
    expect(may.in).toBe(40000);
    expect(may.out).toBe(25000);
    expect(cf[cf.length - 1].cumulative).toBe(63459.15 - 390779.39 + 40000 - 25000);
  });
});

describe("commitmentStatus", () => {
  it("adds approved CCOs to committed and subtracts payments", () => {
    const cs = commitmentStatus(base.commitments, base.commitmentPayments, base.changeOrders);
    expect(cs[0].committed).toBe(531327.69);
    expect(cs[0].paid).toBe(415779.39);
    expect(cs[0].remaining).toBe(115548.3);
  });
});

describe("lienCompliance", () => {
  it("tallies by direction and status", () => {
    const lc = lienCompliance(base.liens);
    expect(lc.totalOutbound).toBe(2);
    expect(lc.totalInbound).toBe(1);
  });
});

describe("paymentsReceived", () => {
  it("sorts oldest→newest, accumulates a running total, and rolls up by pay app", () => {
    const r = paymentsReceived([
      { amount: 40000, received_date: "2026-05-22", method: "wire", reference: "W-2", pay_app_no: 2 },
      { amount: 63459.15, received_date: "2025-07-07", method: "check", reference: "1001", pay_app_no: 1 },
      { amount: 10000, received_date: "2026-05-30", method: "ach", reference: null, pay_app_no: 2 },
    ]);
    expect(r.rows.map((x) => x.amount)).toEqual([63459.15, 40000, 10000]); // chronological
    expect(r.rows.map((x) => x.runningTotal)).toEqual([63459.15, 103459.15, 113459.15]);
    expect(r.total).toBe(113459.15);
    expect(r.count).toBe(3);
    expect(r.firstDate).toBe("2025-07-07");
    expect(r.lastDate).toBe("2026-05-30");
    const app2 = r.byPayApp.find((b) => b.payAppNo === 2)!;
    expect(app2.amount).toBe(50000); // 40000 + 10000
  });

  it("handles an empty set", () => {
    const r = paymentsReceived([]);
    expect(r.total).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.firstDate).toBeNull();
  });
});

describe("subcontractorPayments", () => {
  const commitments = [
    { id: "c1", title: "Sitework subcontract", original_value: 200000, vendor_name: "D'SHIN Plumbing" },
    { id: "c2", title: "Bollards PO", original_value: 5000, vendor_name: "D'SHIN Plumbing" }, // same vendor, 2nd commitment
    { id: "c3", title: "Fencing", original_value: 10450, vendor_name: "Acme Fence Co" },
  ];
  const payments = [
    { commitment_id: "c1", amount: 100000, paid_date: "2026-04-24", method: "ach", reference: "P-1" },
    { commitment_id: "c2", amount: 1800, paid_date: "2026-05-08", method: "check", reference: "P-2" },
    { commitment_id: "c3", amount: 10450, paid_date: "2026-05-10", method: "wire", reference: "P-3" },
    { commitment_id: "c1", amount: 25000, paid_date: "2026-06-01", method: "ach", reference: "P-4" },
  ];

  it("groups payments per subcontractor (across commitments) with subtotals + a grand total", () => {
    const r = subcontractorPayments(commitments, payments);
    expect(r.total).toBe(137250); // 100000 + 1800 + 10450 + 25000
    expect(r.count).toBe(4);
    expect(r.vendorCount).toBe(2); // D'SHIN (c1+c2) and Acme
    const dshin = r.byVendor.find((v) => v.vendor === "D'SHIN Plumbing")!;
    expect(dshin.subtotal).toBe(126800); // 100000 + 1800 + 25000
    expect(dshin.count).toBe(3);
    expect(r.byVendor[0].vendor).toBe("D'SHIN Plumbing"); // largest first
    expect(dshin.pctOfTotal).toBeCloseTo(92.39, 1);
  });

  it("falls back to the commitment title, then a placeholder, when the vendor name is missing", () => {
    const r = subcontractorPayments(
      [{ id: "c1", title: "Untitled sub", original_value: 0 }],
      [
        { commitment_id: "c1", amount: 500, paid_date: "2026-01-01" },
        { commitment_id: "missing", amount: 200, paid_date: "2026-01-02" },
      ],
    );
    expect(r.byVendor.find((v) => v.vendor === "Untitled sub")).toBeTruthy();
    expect(r.byVendor.find((v) => v.vendor === "Unassigned vendor")).toBeTruthy();
    expect(r.total).toBe(700);
  });
});
