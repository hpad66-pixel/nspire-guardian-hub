import { describe, it, expect } from "vitest";
import { summarizeLedger, balanceDue, round2 } from "@/lib/financial/ledger";
import { buildPayAppInput } from "@/lib/pdf/payAppFromContract";
import type { LedgerEntry } from "@/hooks/useContractFinancials";

function entry(p: Partial<LedgerEntry>): LedgerEntry {
  return {
    ledger_id: "x", project_id: "p", contract_id: "c", contract_number: null,
    contract_title: "t", contract_type: "prime", direction: "receivable",
    entry_type: "invoice", entry_date: "2026-06-15", party_name: "R4",
    reference: null, description: null, amount: 0, status: null,
    invoice_id: null, change_order_id: null, artifact_id: null, created_at: "",
    ...p,
  };
}

describe("summarizeLedger", () => {
  it("separates A/R billings from A/R cash received", () => {
    const s = summarizeLedger([
      entry({ direction: "receivable", entry_type: "pay_app", amount: 91857.43 }),
      entry({ direction: "receivable", entry_type: "payment", amount: 40000 }),
    ]);
    expect(s.arBilled).toBe(91857.43);
    expect(s.arReceived).toBe(40000);
    expect(s.arOutstanding).toBe(51857.43);
  });

  it("separates A/P billings from A/P cash paid", () => {
    const s = summarizeLedger([
      entry({ direction: "payable", entry_type: "invoice", amount: 2075 }),
      entry({ direction: "payable", entry_type: "payment", amount: 2075 }),
    ]);
    expect(s.apBilled).toBe(2075);
    expect(s.apPaid).toBe(2075);
    expect(s.apOutstanding).toBe(0);
  });

  it("does NOT count change orders as billings", () => {
    const s = summarizeLedger([
      entry({ direction: "receivable", entry_type: "change_order", amount: 5000 }),
    ]);
    expect(s.arBilled).toBe(0);
  });

  it("computes net cash position (received − paid)", () => {
    const s = summarizeLedger([
      entry({ direction: "receivable", entry_type: "payment", amount: 40000 }),
      entry({ direction: "payable", entry_type: "payment", amount: 2075 }),
    ]);
    expect(s.netCash).toBe(37925);
  });

  it("is empty-safe", () => {
    expect(summarizeLedger([])).toMatchObject({ arBilled: 0, apOutstanding: 0, netCash: 0 });
  });
});

describe("balanceDue (partial payments)", () => {
  it("returns remaining after a partial payment", () => {
    expect(balanceDue({ net_due: 91857.43, paid_to_date: 40000 })).toBe(51857.43);
  });
  it("is zero when fully paid", () => {
    expect(balanceDue({ net_due: 2075, paid_to_date: 2075 })).toBe(0);
  });
  it("handles nulls", () => {
    expect(balanceDue({ net_due: null as any, paid_to_date: 0 })).toBe(0);
  });
});

describe("round2", () => {
  it("rounds to two decimals", () => {
    expect(round2(51857.426)).toBe(51857.43);
  });
});

describe("buildPayAppInput (AIA G702/G703 adapter)", () => {
  const contract: any = {
    id: "c1", contract_number: "OWN-R4", contract_title: "Glorieta — Owner",
    base_contract_amount: 523061, retainage_percent: 5,
    prime_contractor_name: "APAS Consulting LLC", prime_contractor_address: "FL",
    subcontractor_name: "R4 Capital", subcontractor_address: "NY",
    project_address: "Opa-locka",
  };
  const invoice: any = {
    id: "i1", invoice_number: "INV-26-34", amount: 91857.43, retainage: 0,
    status: "submitted", invoice_kind: "pay_app", pay_app_no: 5,
    period_end: "2026-06-30", invoice_date: "2026-06-15", notes: "Pay App #5",
  };

  it("maps a Stack A pay app into the AIA input shape", () => {
    const out = buildPayAppInput({ contract, invoice });
    expect(out.payApp.pay_app_no).toBe(5);
    expect(out.payApp.submitted_amount).toBe(91857.43);
    expect(out.contract.contract_no).toBe("OWN-R4");
    expect(out.owner?.name).toBe("R4 Capital"); // counterparty billed
    expect(out.gc?.name).toBe("APAS Consulting LLC");
  });

  it("adds executed change orders into the revised contract value", () => {
    const out = buildPayAppInput({
      contract, invoice,
      changeOrders: [
        { status: "approved", amount: 2075 } as any,
        { status: "pending", amount: 9999 } as any, // excluded
      ],
    });
    expect(out.contract.executed_co_value).toBe(2075);
    expect(out.contract.revised_contract_value).toBe(523061 + 2075);
  });

  it("falls back to a single summary line when there is no SOV", () => {
    const out = buildPayAppInput({ contract, invoice });
    expect(out.lines).toHaveLength(1);
    expect(out.lines[0].scheduled_value).toBe(91857.43);
  });
});
