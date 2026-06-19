import { describe, it, expect } from "vitest";
import {
  classifyDoc, parseAmount, parseDate, parseSubmission,
} from "@/lib/financial/intake";

describe("classifyDoc", () => {
  it("detects an invoice", () => {
    expect(classifyDoc("INVOICE #594\nAmount Due $2,075.00\nRemit to ...")).toBe("invoice");
  });
  it("detects a lien release", () => {
    expect(classifyDoc("CONDITIONAL WAIVER AND RELEASE OF LIEN ON PROGRESS PAYMENT")).toBe("lien_release");
  });
  it("detects a change order request", () => {
    expect(classifyDoc("CHANGE ORDER REQUEST — additional excavation")).toBe("co_request");
  });
  it("falls back to unknown", () => {
    expect(classifyDoc("hello world")).toBe("unknown");
  });
});

describe("parseAmount", () => {
  it("prefers a labelled total", () => {
    expect(parseAmount("subtotal $10.00 TOTAL $2,075.00")).toBe(2075);
  });
  it("falls back to the largest figure", () => {
    expect(parseAmount("$10.00 and $999.50")).toBe(999.5);
  });
  it("returns undefined when no money", () => {
    expect(parseAmount("no money here")).toBeUndefined();
  });
});

describe("parseDate", () => {
  it("parses Month DD, YYYY", () => {
    expect(parseDate("Dated May 30, 2026")).toBe("2026-05-30");
  });
  it("parses MM/DD/YYYY", () => {
    expect(parseDate("through 02/17/2026")).toBe("2026-02-17");
  });
});

describe("parseSubmission", () => {
  it("parses an invoice confidently when an amount is present", () => {
    const r = parseSubmission("INVOICE #594 Total $2,075.00 dated May 30, 2026");
    expect(r.doc_type).toBe("invoice");
    expect(r.parsed.amount).toBe(2075);
    expect(r.confident).toBe(true);
  });
  it("classifies a lien waiver and its type", () => {
    const r = parseSubmission("UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT through 06/30/2026");
    expect(r.doc_type).toBe("lien_release");
    expect(r.parsed.release_type).toBe("unconditional_final");
    expect(r.confident).toBe(true);
  });
  it("is not confident on an unknown doc", () => {
    expect(parseSubmission("random text").confident).toBe(false);
  });
});
