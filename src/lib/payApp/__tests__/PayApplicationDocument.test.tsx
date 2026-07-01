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
});
