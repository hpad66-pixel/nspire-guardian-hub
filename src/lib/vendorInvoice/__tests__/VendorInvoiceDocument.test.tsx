import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorInvoiceDocument, type VendorInvoiceSpec } from "../VendorInvoiceDocument";

const paidSpec: VendorInvoiceSpec = {
  wordmark: "APAS CONSULTING",
  invoiceNo: "DSHIN-2026-07",
  periodEnd: "2026-07-03",
  status: "paid",
  vendorName: "D'Shin Plumbing LLC",
  commitmentNo: "SC-001",
  commitmentTitle: "D'Shin Plumbing — Base Contract",
  originalValue: 600000,
  revisedValue: 620000,
  submittedAmount: 15000,
  approvedAmount: 15000,
  retainageHeld: 0,
  retainagePct: 0,
  processedDate: "2026-07-02T13:00:00Z",
  paidDate: "2026-07-03T18:00:00Z",
  fullyPaid: true,
  lines: [{ lineNo: "1", description: "Plumbing progress", scheduledValue: 15000, workThisPeriod: 15000, materialsStored: 0 }],
  payments: [{ id: "p-1", paidDate: "2026-07-03", method: "wire", reference: "WT 260703-020083", amount: 15000 }],
};

describe("VendorInvoiceDocument", () => {
  it("creates a dedicated invoice plus payment register with paid seals", () => {
    const { container } = render(<VendorInvoiceDocument spec={paidSpec} />);

    expect(container.querySelectorAll("[data-pdf-page]")).toHaveLength(2);
    expect(screen.getByText("Vendor Invoice")).toBeInTheDocument();
    expect(screen.getByText("Payment Register")).toBeInTheDocument();
    expect(screen.getByText("WT 260703-020083")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /processed and paid/i })).toHaveLength(2);
  });

  it("does not stamp an invoice before linked payments satisfy it", () => {
    render(<VendorInvoiceDocument spec={{ ...paidSpec, status: "approved", fullyPaid: false, payments: [] }} />);

    expect(screen.queryByRole("img", { name: /processed and paid/i })).not.toBeInTheDocument();
    expect(screen.getByText("No payments recorded against this invoice.")).toBeInTheDocument();
  });

  it("calculates the payment balance from net payable after retainage", () => {
    render(
      <VendorInvoiceDocument
        spec={{
          ...paidSpec,
          submittedAmount: 100,
          approvedAmount: 100,
          retainageHeld: 10,
          retainagePct: 10,
          payments: [{ ...paidSpec.payments[0], amount: 90 }],
        }}
      />,
    );

    expect(screen.getByText("Open payment balance").parentElement).toHaveTextContent("$0.00");
    expect(screen.getByText("Less retainage held").parentElement).toHaveTextContent("$10.00");
    expect(screen.getByText("Net payable").parentElement).toHaveTextContent("$90.00");
  });
});
