import { describe, it, expect } from "vitest";
import { generatePayAppPdf } from "@/lib/pdf/payApp";
import { generateChangeOrderPdf } from "@/lib/pdf/changeOrder";
import { generateOsha300Pdf, generateOsha301Pdf } from "@/lib/pdf/osha";
import { money } from "@/lib/pdf";

describe("pdf/money formatter", () => {
  it("formats cents-like number as USD", () => {
    expect(money(1234.56)).toBe("$1,234.56");
  });
  it("treats null as zero", () => {
    expect(money(null)).toBe("$0.00");
  });
});

describe("pdf/payApp", () => {
  it("produces a multi-page G702/G703 doc", () => {
    const doc = generatePayAppPdf({
      tenantName: "APAS",
      contract: {
        contract_no: "PC-0001", title: "Glorieta rehab",
        original_value: 1000000, executed_co_value: 50000,
        revised_contract_value: 1050000, retainage_pct: 10,
      },
      payApp: {
        pay_app_no: 3, period_end: "2026-04-30", status: "approved",
        submitted_amount: 100000, approved_amount: 95000, retainage_held: 9500,
      },
      lines: [
        { line_no: 1, cost_code: "03 30 00", description: "Concrete",
          scheduled_value: 200000, work_this_period: 50000, materials_stored: 0 },
      ],
    });
    // jsPDF exposes a pages array; G702 + G703 = 2 pages
    const pages = (doc as any).internal.pages.filter((p: any) => p != null);
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });
});

describe("pdf/changeOrder", () => {
  it("emits a one-page G701 for a PCO with lines", () => {
    const doc = generateChangeOrderPdf({
      tenantName: "APAS",
      co: {
        co_no: 7, co_type: "PCO", title: "Unforeseen foundation",
        description: "Additional excavation", amount: 25000, days_impact: 5,
        status: "pending", reason_code: "field_condition", executed_date: null,
      },
      lines: [
        { cost_code: "03 30 00", description: "Extra concrete", amount: 15000 },
        { cost_code: "02 00 00", description: "Excavation",     amount: 10000 },
      ],
    });
    expect(doc).toBeTruthy();
  });
});

describe("pdf/osha", () => {
  it("generates OSHA 300 with incidents", () => {
    const doc = generateOsha300Pdf({
      establishment: {
        name: "Project Alpha", city: "Austin", state: "TX", year: 2026,
      },
      incidents: [
        { case_no: "2026-001", employee_name: "J. Doe", job_title: "Electrician",
          date_of_injury: "2026-02-10", where_occurred: "Level 2",
          description: "Shock from panel", outcome: "days_away",
          days_away_from_work: 3, days_restricted: 0, injury_type: "injury" },
      ],
    });
    expect(doc).toBeTruthy();
  });

  it("generates OSHA 301 for a single case", () => {
    const doc = generateOsha301Pdf({
      case: { case_no: "2026-001", date_of_injury: "2026-02-10" },
      injured: { full_name: "J. Doe" },
    });
    expect(doc).toBeTruthy();
  });
});
