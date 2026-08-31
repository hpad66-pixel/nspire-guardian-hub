import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { createRef } from "react";
import { PayApplicationDocument, type PayApplicationSpec } from "../PayApplicationDocument";

const spec: PayApplicationSpec = {
  wordmark: "APAS CONSULTING",
  contractor: { name: "APAS Consulting LLC", address: "Miami, FL", contact: "Hardeep Anand", title: "Principal" },
  owner: { name: "R4 Capital C/o R4 GGOL GP LLC", address: "NY", contact: "Chris Sullivan" },
  project: { name: "Sewer Extension Project", address: "Opa-locka, FL" },
  payAppNo: 5,
  periodEnd: "2026-06-30",
  applicationDate: "2026-06-22",
  contractNo: "PC-01-001",
  contractTitle: "Sewer Extension Project",
  retainagePct: 10,
  g702: {
    original_contract_sum: 523061, net_change_orders: 231246.23, contract_sum_to_date: 754307.23,
    completed_stored_to_date: 600000, retainage_total: 60000, total_earned_less_retainage: 540000,
    less_previous_certificates: 400000, current_payment_due: 140000, balance_to_finish: 154307.23,
  },
  lines: [
    { item_no: "1", description: "Sewer line install", unit: "LF", kind: "base", scheduled_qty: 1000, unit_price: 523.061, scheduled_value: 523061, prev_qty: 765, this_qty: 117, qty_to_date: 882, prev_value: 400000, this_value: 61372, value_to_date: 461372, pct: 88, retainage: 46137.2 },
    { item_no: "17", description: "PCO-001 Storm drainage", unit: "LS", kind: "change_order", scheduled_qty: 1, unit_price: 24050, scheduled_value: 24050, prev_qty: 0, this_qty: 1, qty_to_date: 1, prev_value: 0, this_value: 24050, value_to_date: 24050, pct: 100, retainage: 2405 },
  ],
};

describe("PayApplicationDocument", () => {
  it("renders parties, G702 current payment due, and base + CO lines", () => {
    const ref = createRef<HTMLDivElement>();
    const { getByText, getAllByText, container } = render(<PayApplicationDocument ref={ref} spec={spec} />);

    // Parties — contractor name appears in both the party block and the signature.
    expect(getByText("R4 Capital C/o R4 GGOL GP LLC")).toBeTruthy();
    expect(getAllByText("APAS Consulting LLC").length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/Hardeep Anand/).length).toBeGreaterThanOrEqual(1);

    // G702 highlighted total (Procore cover: numbered "8." + "Current payment due")
    expect(getByText("Current payment due")).toBeTruthy();
    // Procore "Document Summary Sheet" header + the blended-retainage sub-line
    expect(getByText("DOCUMENT SUMMARY SHEET")).toBeTruthy();
    expect(getByText(/of completed work/)).toBeTruthy();

    // Both line sections present
    expect(getByText("Base contract")).toBeTruthy();
    expect(getByText("Change orders")).toBeTruthy();
    expect(getByText("Sewer line install")).toBeTruthy();
    expect(getByText("PCO-001 Storm drainage")).toBeTruthy();

    // ref forwarded for rasterization
    expect(ref.current).toBe(container.firstChild);
  });

  it("omits the change-orders section when there are no CO lines", () => {
    const baseOnly = { ...spec, lines: spec.lines.filter((l) => l.kind === "base") };
    const { queryByText } = render(<PayApplicationDocument spec={baseOnly} />);
    expect(queryByText("Change orders")).toBeNull();
  });

  it("paginates into discrete pdf-page blocks (cover + continuation)", () => {
    const { container } = render(<PayApplicationDocument spec={spec} />);
    expect(container.querySelectorAll("[data-pdf-page]").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the DRAFT banner and stamps the signature when provided", () => {
    const { getByText, container } = render(
      <PayApplicationDocument spec={{ ...spec, draft: true, signatureUrl: "data:image/png;base64,AAAA", signedName: "Hardeep Anand", signedDate: "2026-06-22" }} />,
    );
    expect(getByText(/Draft — for owner review/i)).toBeTruthy();
    expect(container.querySelector('img[alt="signature"]')).toBeTruthy();
  });

  it("contains Amount Certified in a boxed cell so the print rule cannot slash the figures", () => {
    const { getByTestId } = render(
      <PayApplicationDocument spec={{ ...spec, amountCertified: 1234567.89 }} />,
    );
    const cell = getByTestId("amount-certified-cell");
    expect(cell.textContent).toBe("$1,234,567.89");
    expect(cell.style.border).toContain("solid");
    expect(cell.style.overflow).toBe("visible");
    expect(cell.style.whiteSpace).toBe("nowrap");
    expect(cell.style.lineHeight).toBe("1.35");
    expect(Number.parseFloat(cell.style.minHeight)).toBeGreaterThanOrEqual(30);
  });

  it("keeps G702 summary amounts fully inside tall padded cells (no vertical clip)", () => {
    const { container } = render(<PayApplicationDocument spec={spec} />);
    const amounts = container.querySelectorAll("[data-g702-sum-amount]");
    expect(amounts.length).toBeGreaterThanOrEqual(8); // lines 1–4, 6–9 (+ highlighted 8)
    amounts.forEach((el) => {
      const s = (el as HTMLElement).style;
      expect(s.whiteSpace).toBe("nowrap");
      expect(s.overflow).toBe("visible");
      expect(s.lineHeight).toBe("1.35");
      expect(Number.parseFloat(s.minHeight || "0")).toBeGreaterThanOrEqual(24);
      expect(Number.parseFloat(s.paddingTop || s.padding || "0")).toBeGreaterThanOrEqual(4);
    });
  });

  it("keeps G703 table money cells nowrap so column rules stay around the figures", () => {
    const { container } = render(<PayApplicationDocument spec={spec} />);
    const tableCells = container.querySelectorAll("table [data-money-cell]");
    expect(tableCells.length).toBeGreaterThan(6);
    tableCells.forEach((el) => {
      const s = (el as HTMLElement).style;
      expect(s.whiteSpace).toBe("nowrap");
      expect(s.overflow).toBe("hidden");
    });
  });

  it("renders FINAL INVOICE banner and final Line 9 wording when isFinalInvoice", () => {
    const { getByTestId, getByText, getAllByText } = render(
      <PayApplicationDocument
        spec={{
          ...spec,
          isFinalInvoice: true,
          g702: {
            ...spec.g702,
            less_previous_certificates: 742871.38,
            current_payment_due: 144332.82,
            balance_to_finish: 66146.15,
          },
        }}
      />,
    );
    expect(getByTestId("final-invoice-banner").textContent).toMatch(/Final Invoice/i);
    expect(getByText(/INVOICE TYPE:/)).toBeTruthy();
    expect(getAllByText(/FINAL INVOICE/i).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/paid to date/i).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Unbilled contract balance/i)).toBeTruthy();
    expect(getAllByText(/will not be billed/i).length).toBeGreaterThanOrEqual(1);
    expect(getByText(/Current payment due \(FINAL\)/i)).toBeTruthy();
  });

  it("does not show the FINAL banner on a progress application", () => {
    const { queryByTestId, queryByText } = render(<PayApplicationDocument spec={spec} />);
    expect(queryByTestId("final-invoice-banner")).toBeNull();
    expect(queryByText(/Unbilled contract balance/i)).toBeNull();
  });

  it("pins G703 Column G / I grand totals to G702 Lines 4 / 5 even when live lines disagree", () => {
    const reconciled: PayApplicationSpec = {
      ...spec,
      isFinalInvoice: true,
      g702: {
        original_contract_sum: 523061,
        net_change_orders: 430289.35,
        contract_sum_to_date: 953350.35,
        completed_stored_to_date: 921212.36,
        retainage_total: 34008.16,
        total_earned_less_retainage: 887204.2,
        less_previous_certificates: 742871.38,
        current_payment_due: 144332.82,
        balance_to_finish: 66146.15,
      },
      // Live SOV understates retainage (~$27k) and would string-concat if uncoerced
      lines: [
        {
          item_no: "1", description: "Sewer", unit: "LF", kind: "base",
          scheduled_qty: 1000, unit_price: 523.061, scheduled_value: 523061,
          prev_qty: 800, this_qty: 100, qty_to_date: 900,
          prev_value: 400000, this_value: 100000, value_to_date: 500000, pct: 95,
          retainage: 20000,
        },
        {
          item_no: "30", description: "Street Sweeper", unit: "LS", kind: "change_order",
          scheduled_qty: 1, unit_price: 1710, scheduled_value: 1710,
          prev_qty: 1, this_qty: 0, qty_to_date: 1,
          prev_value: 1710, this_value: 0, value_to_date: 1710, pct: 100,
          retainage: 7657.75,
        },
      ],
    };
    const { getByTestId, getAllByText, container } = render(<PayApplicationDocument spec={reconciled} />);
    expect(getByTestId("g703-total-to-date").textContent).toBe("$921,212.36");
    expect(getByTestId("g703-total-retainage").textContent).toBe("$34,008.16");
    // CO summary must use cover net ($430,289.35), not the lone $1,710 SOV CO line
    expect(getAllByText("$430,289.35").length).toBeGreaterThanOrEqual(2); // Line 2 + CO summary
    const coSummary = Array.from(container.querySelectorAll("td")).find((td) =>
      /Total changes approved in previous months/i.test(td.textContent || ""),
    );
    expect(coSummary?.parentElement?.textContent).toContain("$430,289.35");
    expect(coSummary?.parentElement?.textContent).not.toContain("$1,710.00");
  });

  it("never string-concatenates G703 value-to-date into a $90M figure", () => {
    const poisoned = {
      ...spec,
      g702: { ...spec.g702, completed_stored_to_date: 90369.16, retainage_total: 2711.07 },
      lines: [
        {
          ...spec.lines[0],
          value_to_date: "90000" as unknown as number,
          retainage: "2700" as unknown as number,
          scheduled_value: "100000" as unknown as number,
          prev_value: 0,
          this_value: "90000" as unknown as number,
        },
        {
          ...spec.lines[1],
          value_to_date: "369.16" as unknown as number,
          retainage: "11.07" as unknown as number,
          scheduled_value: 500,
        },
      ],
    };
    const { getByTestId } = render(<PayApplicationDocument spec={poisoned} />);
    expect(getByTestId("g703-total-to-date").textContent).toBe("$90,369.16");
    expect(getByTestId("g703-total-to-date").textContent).not.toMatch(/90,000,369/);
  });
});
