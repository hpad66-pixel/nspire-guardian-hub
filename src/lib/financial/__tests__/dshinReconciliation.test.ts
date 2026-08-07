import { describe, expect, it } from "vitest";
import { dshinReconciliationV1 as manifest } from "@/test/fixtures/dshinReconciliation.v1";

const cents = (amount: number) => Math.round(amount * 100);
const sumCents = (rows: readonly { amount: number }[]) =>
  rows.reduce((total, row) => total + cents(row.amount), 0);

describe("D'SHIN certified reconciliation manifest", () => {
  it("reconciles 35 bank payments plus the agreed baseline adjustment to $540,479.39", () => {
    const bank = manifest.entries.filter((entry) => entry.kind === "bank_payment");
    const adjustment = manifest.entries.filter((entry) => entry.kind === "baseline_adjustment");

    expect(manifest.entries).toHaveLength(manifest.controls.certifiedEntryCount);
    expect(bank).toHaveLength(manifest.controls.bankPaymentCount);
    expect(adjustment).toHaveLength(manifest.controls.baselineAdjustmentCount);
    expect(sumCents(bank)).toBe(cents(manifest.controls.bankPaymentTotal));
    expect(sumCents(adjustment)).toBe(cents(manifest.controls.baselineAdjustmentTotal));
    expect(sumCents(manifest.entries)).toBe(cents(manifest.controls.certifiedTotal));
    expect(adjustment).toEqual([expect.objectContaining({
      method: "other",
      reference: "JOINT-RECON-2026-06-11",
      notes: expect.stringContaining("not a Wells Fargo transaction"),
    })]);
  });

  it("preserves the June 11 agreed baseline and the $79,700 later-payment bridge", () => {
    const bank = manifest.entries.filter((entry) => entry.kind === "bank_payment");
    const bankThroughCutoff = bank.filter((entry) => entry.paidDate <= manifest.cutoffDate);
    const bankAfterCutoff = bank.filter((entry) => entry.paidDate > manifest.cutoffDate);
    const allThroughCutoff = manifest.entries.filter((entry) => entry.paidDate <= manifest.cutoffDate);

    expect(bankThroughCutoff).toHaveLength(manifest.controls.bankThroughCutoffCount);
    expect(sumCents(bankThroughCutoff)).toBe(cents(manifest.controls.bankThroughCutoffTotal));
    expect(sumCents(allThroughCutoff)).toBe(cents(manifest.controls.certifiedThroughCutoffTotal));
    expect(bankAfterCutoff).toHaveLength(manifest.controls.bankAfterCutoffCount);
    expect(sumCents(bankAfterCutoff)).toBe(cents(manifest.controls.bankAfterCutoffTotal));
  });

  it("matches method and invoice controls without duplicate bank references", () => {
    const bank = manifest.entries.filter((entry) => entry.kind === "bank_payment");
    for (const method of ["wire", "zelle"] as const) {
      const rows = bank.filter((entry) => entry.method === method);
      expect(rows).toHaveLength(manifest.controls.methods[method].count);
      expect(sumCents(rows)).toBe(cents(manifest.controls.methods[method].total));
    }

    expect(new Set(bank.map((entry) => entry.reference)).size).toBe(bank.length);
    expect(manifest.invoices).toHaveLength(manifest.controls.reconstructedInvoiceCount);
    for (const invoice of manifest.invoices) {
      const entries = manifest.entries.filter((entry) => entry.invoiceNo === invoice.invoiceNo);
      expect(entries.length, invoice.invoiceNo).toBeGreaterThan(0);
      expect(sumCents(entries), invoice.invoiceNo).toBe(cents(invoice.amount));
    }
  });

  it("includes the July 3 $15,000 wire with its Wells Fargo trace", () => {
    expect(manifest.entries).toContainEqual(expect.objectContaining({
      kind: "bank_payment",
      paidDate: "2026-07-03",
      method: "wire",
      amount: 15_000,
      reference: "WT 260703-020083 / SRF 0W00007152783323",
    }));
  });
});
