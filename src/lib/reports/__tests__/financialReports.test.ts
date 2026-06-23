import { describe, it, expect } from "vitest";
import {
  financialSummary, billingHistory, changeOrderLog, cashFlow, commitmentStatus, lienCompliance,
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
