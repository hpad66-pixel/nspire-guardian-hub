import { describe, it, expect } from "vitest";
import { summarizeLedger, balanceDue, round2, type LedgerEntry } from "@/lib/financial/ledger";

function entry(p: Partial<LedgerEntry>): LedgerEntry {
  return {
    ledger_id: "x", tenant_id: "t", project_id: "p", cost_code_id: null,
    direction: "receivable", entry_type: "pay_app", entry_date: "2026-06-15",
    party_name: "R4", reference: null, description: null, amount: 0,
    status: null, artifact_id: null, created_at: "",
    ...p,
  };
}

describe("summarizeLedger (F0 unified view shape)", () => {
  it("AR billed = pay apps; AR received = receivable payments", () => {
    const s = summarizeLedger([
      entry({ direction: "receivable", entry_type: "pay_app", amount: 93000 }),
      entry({ direction: "receivable", entry_type: "payment", amount: 50000 }),
      // prime_contract / change_order are contract value, NOT billings:
      entry({ direction: "receivable", entry_type: "prime_contract", amount: 523000 }),
      entry({ direction: "receivable", entry_type: "change_order", amount: 40000 }),
    ]);
    expect(s.arBilled).toBe(93000);
    expect(s.arReceived).toBe(50000);
    expect(s.arOutstanding).toBe(43000);
  });

  it("AP billed = vendor invoices; AP paid = payable payments", () => {
    const s = summarizeLedger([
      entry({ direction: "payable", entry_type: "invoice", amount: 2075 }),
      entry({ direction: "payable", entry_type: "payment", amount: 1000 }),
      entry({ direction: "payable", entry_type: "commitment", amount: 523061 }), // not a billing
    ]);
    expect(s.apBilled).toBe(2075);
    expect(s.apPaid).toBe(1000);
    expect(s.apOutstanding).toBe(1075);
  });

  it("net cash = AR received − AP paid", () => {
    const s = summarizeLedger([
      entry({ direction: "receivable", entry_type: "payment", amount: 50000 }),
      entry({ direction: "payable", entry_type: "payment", amount: 1000 }),
    ]);
    expect(s.netCash).toBe(49000);
  });

  it("lien_release rows are informational and never counted", () => {
    const s = summarizeLedger([
      entry({ direction: "payable", entry_type: "lien_release", amount: 99999 }),
    ]);
    expect(s).toMatchObject({ arBilled: 0, apBilled: 0, apPaid: 0, netCash: 0 });
  });

  it("is empty-safe", () => {
    expect(summarizeLedger([])).toMatchObject({ arBilled: 0, apOutstanding: 0, netCash: 0 });
  });
});

describe("balanceDue / round2", () => {
  it("remaining after partial payment", () => {
    expect(balanceDue({ net_due: 93000, paid_to_date: 50000 })).toBe(43000);
  });
  it("zero when fully paid", () => {
    expect(balanceDue({ net_due: 2075, paid_to_date: 2075 })).toBe(0);
  });
  it("handles nulls", () => {
    expect(balanceDue({ net_due: null, paid_to_date: null })).toBe(0);
  });
  it("round2 rounds to two decimals", () => {
    expect(round2(43000.005)).toBe(43000.01);
  });
});
