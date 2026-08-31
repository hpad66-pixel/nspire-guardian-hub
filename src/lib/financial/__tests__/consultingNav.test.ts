import { describe, it, expect } from "vitest";
import {
  CONSULTING_FINANCIAL_PATHS,
  financialKindFor,
  isConsultingFinancialPath,
} from "../consultingNav";

describe("consulting financial nav", () => {
  it("treats consulting and client project types as consulting", () => {
    expect(financialKindFor({ project_type: "consulting" })).toBe("consulting");
    expect(financialKindFor({ project_type: "client" })).toBe("consulting");
    expect(financialKindFor({ project_type: "property" })).toBe("construction");
  });

  it("includes client invoices and excludes pay apps for consulting", () => {
    expect(isConsultingFinancialPath("client-invoices")).toBe(true);
    expect(isConsultingFinancialPath("proposals")).toBe(true);
    expect(isConsultingFinancialPath("pay-apps")).toBe(false);
    expect(isConsultingFinancialPath("commitments")).toBe(false);
    expect(isConsultingFinancialPath("budget")).toBe(false);
    expect(CONSULTING_FINANCIAL_PATHS.has("vendor-inbox")).toBe(false);
  });
});
