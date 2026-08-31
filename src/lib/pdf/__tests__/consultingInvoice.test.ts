import { describe, it, expect } from "vitest";
import { generateConsultingInvoicePdf } from "../consultingInvoice";

describe("consulting invoice PDF", () => {
  it("builds a branded multi-line invoice without throwing", () => {
    const doc = generateConsultingInvoicePdf({
      invoiceNo: 12,
      issueDate: "2026-08-01",
      dueDate: "2026-08-31",
      projectName: "Larkin Consulting",
      subject: "Professional services — PROP-001 — Larkin Consulting",
      paymentTerms: "Net 30 — payment due within 30 days of invoice date.",
      clientName: "Jane Doe",
      clientCompany: "Larkin Community Hospital",
      clientEmail: "billing@larkin.example",
      clientAddress: "7031 SW 62nd Ave",
      clientCity: "South Miami",
      clientState: "FL",
      clientPostal: "33143",
      notes: "Thank you for your partnership.",
      lines: [
        {
          description: "PROP-001 · Phase 1 — discovery",
          fee_amount: 25000,
          pct_prev: 0,
          pct_this: 40,
          amount: 10000,
        },
        {
          description: "PROP-002 · Contamination assessment",
          fee_amount: 14500,
          pct_prev: 0,
          pct_this: 100,
          amount: 14500,
        },
      ],
      subtotal: 24500,
      total: 24500,
      accountSummaries: [
        {
          proposal_id: "p1",
          proposal_no: "PROP-001",
          title: "Phase 1",
          approved_fee: 25000,
          previously_billed: 0,
          previously_paid: 0,
          this_invoice: 10000,
          remaining_after: 15000,
          prior_open_ar: 0,
        },
      ],
      branding: {
        companyName: "APAS Consulting LLC",
        companyAddress: "Miami, FL",
        companyCity: "Miami, FL",
        companyEmail: "billing@apas.example",
        footer: "Thank you for your business",
      },
    });

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const data = doc.output("arraybuffer");
    expect(data.byteLength).toBeGreaterThan(1000);
  });

  it("handles paid balance + prior payments continuity layout", () => {
    const doc = generateConsultingInvoicePdf({
      invoiceNo: 2,
      issueDate: "2026-08-15",
      projectName: "Larkin MRI",
      subject: "Progress invoice 2",
      paymentTerms: "Net 15",
      clientName: "Larkin Community Hospital",
      clientAddress: "7031 SW 62nd Ave",
      lines: [{ description: "PROP-001 · Services", fee_amount: 10000, pct_prev: 40, pct_this: 100, amount: 6000 }],
      subtotal: 6000,
      total: 6000,
      amountPaid: 1000,
      priorPayments: [{ invoiceNo: 1, date: "2026-07-01", amount: 4000, note: "Wire" }],
      accountSummaries: [
        {
          proposal_id: "p1",
          proposal_no: "PROP-001",
          title: "Services",
          approved_fee: 10000,
          previously_billed: 4000,
          previously_paid: 4000,
          this_invoice: 6000,
          remaining_after: 0,
          prior_open_ar: 0,
        },
      ],
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
