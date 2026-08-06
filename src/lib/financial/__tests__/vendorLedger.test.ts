import { describe, it, expect } from "vitest";
import { buildVendorLedger, openOnInvoices, remainingOnContract } from "../vendorLedger";

// Mirrors the real D'SHIN Plumbing ledger on the Sewer Extension project.
const DSHIN = [
  { id: "p5", amount: 25000, paid_date: "2026-06-30" },
  { id: "p1", amount: 390779.39, paid_date: "2026-04-24" },
  { id: "p3", amount: 5615, paid_date: "2026-05-11" },
  { id: "p2", amount: 25000, paid_date: "2026-05-08" },
  { id: "p4", amount: 25000, paid_date: "2026-05-26" },
  { id: "p2b", amount: 14385, paid_date: "2026-05-08" },
];

describe("buildVendorLedger", () => {
  it("orders payments oldest → newest regardless of input order", () => {
    const { rows } = buildVendorLedger(DSHIN);
    expect(rows.map((r) => r.payment.paid_date)).toEqual([
      "2026-04-24", "2026-05-08", "2026-05-08", "2026-05-11", "2026-05-26", "2026-06-30",
    ]);
  });

  it("accumulates a running total that ends at the grand total", () => {
    const { rows, totalPaid } = buildVendorLedger(DSHIN);
    expect(rows[0].runningTotal).toBeCloseTo(390779.39, 2);
    expect(rows[1].runningTotal).toBeCloseTo(415779.39, 2);
    expect(rows[rows.length - 1].runningTotal).toBeCloseTo(totalPaid, 2);
    expect(totalPaid).toBeCloseTo(485779.39, 2);
  });

  it("breaks same-date ties stably by id so rows don't shuffle", () => {
    const a = buildVendorLedger(DSHIN).rows.map((r) => r.payment.id);
    const b = buildVendorLedger([...DSHIN].reverse()).rows.map((r) => r.payment.id);
    expect(a).toEqual(b);
  });

  it("returns an empty ledger and a zero total for a vendor with no payments", () => {
    const { rows, totalPaid } = buildVendorLedger([]);
    expect(rows).toEqual([]);
    expect(totalPaid).toBe(0);
  });

  it("does not mutate the caller's array", () => {
    const input = [...DSHIN];
    buildVendorLedger(input);
    expect(input.map((p) => p.id)).toEqual(DSHIN.map((p) => p.id));
  });
});

describe("balance helpers", () => {
  it("reports what is still open on invoices", () => {
    expect(openOnInvoices(485779.39, 485779.39)).toBeCloseTo(0, 2);
    expect(openOnInvoices(500000, 485779.39)).toBeCloseTo(14220.61, 2);
  });

  it("goes negative on the contract when a vendor has been overpaid", () => {
    expect(remainingOnContract(400000, 485779.39)).toBeCloseTo(-85779.39, 2);
  });
});
