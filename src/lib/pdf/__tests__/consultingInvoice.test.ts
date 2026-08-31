import { describe, it, expect } from "vitest";
import { generateConsultingInvoicePdf } from "../consultingInvoice";

describe("consulting invoice PDF", () => {
  it("builds a branded multi-line invoice without throwing", () => {
    const doc = generateConsultingInvoicePdf({
      invoiceNo: 12,
      issueDate: "2026-08-01",
      dueDate: "2026-08-31",
      projectName: "Larkin Consulting",
      clientName: "Larkin Community Hospital",
      notes: "Net 30",
      lines: [
        {
          description: "Phase 1 — discovery",
          fee_amount: 25000,
          pct_prev: 0,
          pct_this: 100,
          amount: 25000,
        },
        {
          description: "Lump-sum amendment",
          fee_amount: 5000,
          pct_prev: 0,
          pct_this: 100,
          amount: 5000,
        },
      ],
      subtotal: 30000,
      total: 30000,
      branding: {
        companyName: "APAS Consulting LLC",
        companyCity: "Miami, FL",
        companyEmail: "billing@apas.example",
        footer: "Thank you for your business",
      },
    });

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const data = doc.output("arraybuffer");
    expect(data.byteLength).toBeGreaterThan(1000);
  });

  it("handles paid balance layout", () => {
    const doc = generateConsultingInvoicePdf({
      invoiceNo: 1,
      issueDate: "2026-07-01",
      projectName: "Test",
      lines: [{ description: "Services", fee_amount: 1000, pct_prev: 0, pct_this: 100, amount: 1000 }],
      subtotal: 1000,
      total: 1000,
      amountPaid: 400,
    });
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
