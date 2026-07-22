/**
 * Render smoke test for the Financial Report views. It mounts every report with
 * mock data and asserts it renders without throwing — catching module-load /
 * circular-import / undefined-render regressions BEFORE they reach production
 * (a CI "Production Build" pass alone does NOT render the page).
 *
 * recharts is mocked to a passthrough so charts don't need a real layout in jsdom;
 * the report's own math + JSX still runs.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("recharts", () => {
  const Passthrough = ({ children }: any) => <div>{children}</div>;
  return new Proxy({} as any, { get: () => Passthrough });
});

import {
  FINANCIAL_REPORTS, ReportFooter, type ReportBrand,
} from "../FinancialReportViews";
import { EmailReportDialog } from "../EmailReportDialog";
import type { ReportData } from "@/lib/reports/financialReports";

const data: ReportData = {
  contract: { original_value: 523061, retainage_pct: 5 },
  parties: { owner: "R4 Capital", contractor: "APAS Consulting" },
  changeOrders: [
    { co_no: 1, co_type: "PCO", title: "Storm drainage", amount: 24050, status: "executed", commitment_id: null },
    { co_no: 5, co_type: "CCO", title: "Sub CCO", amount: 10000, status: "executed", commitment_id: "c1" },
  ],
  payApps: [
    { pay_app_no: 1, period_end: "2025-07-15", status: "paid", submitted_amount: 78459.15, approved_amount: null,
      pay_app_data: { completed_stored_to_date: 78459.15, retainage_total: 2611, total_earned_less_retainage: 75848, current_payment_due: 75848 } },
    { pay_app_no: 2, period_end: "2026-03-31", status: "submitted", submitted_amount: null, approved_amount: null,
      pay_app_data: { completed_stored_to_date: 444464.9, retainage_total: 19253, total_earned_less_retainage: 425211, current_payment_due: 349363 } },
  ],
  primePayments: [
    { amount: 63459.15, received_date: "2025-07-07", method: "check", reference: "1001", pay_app_no: 1 },
    { amount: 40000, received_date: "2026-05-22", method: "wire", reference: "W-2", pay_app_no: 2 },
  ],
  commitments: [{ id: "c1", title: "D'SHIN Plumbing", original_value: 429510, vendor_name: "D'SHIN Plumbing" }],
  commitmentPayments: [
    { commitment_id: "c1", amount: 390779.39, paid_date: "2026-04-24", method: "ach", reference: "P-1" },
  ],
  liens: [
    { direction: "outbound", status: "approved" },
    { direction: "inbound", status: "approved" },
  ],
};

const brand: ReportBrand = {
  wordmark: "APAS CONSULTING", projectName: "Glorieta Sewer", contractTitle: "Prime Contract", contractNo: "PC-01-001",
  asOf: "2026-07-22",
  companyName: "APAS Consulting LLC", contact: "Hardeep Anand", email: "hardeep@apas.ai",
  address: "Pembroke Pines, FL", footer: null,
};

describe("financial report views", () => {
  it.each(FINANCIAL_REPORTS.map((r) => [r.title, r.Component]))(
    "renders %s without throwing",
    (_title: any, Component: any) => {
      const { container } = render(<Component data={data} brand={brand} />);
      expect((container.textContent ?? "").length).toBeGreaterThan(0);
    },
  );

  it("renders the branded letterhead footer", () => {
    const { container } = render(<ReportFooter brand={brand} />);
    expect(container.textContent).toContain("Generated");
    expect(container.textContent).toContain("APAS Consulting LLC");
  });

  it("EmailReportDialog module + its import chain resolve", () => {
    // Importing the dialog exercises useSendEmail + reportPdf transitively; a
    // circular/undefined import would throw at module load, not here.
    expect(typeof EmailReportDialog).toBe("function");
  });
});
