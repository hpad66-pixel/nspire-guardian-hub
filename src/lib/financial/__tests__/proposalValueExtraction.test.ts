import { describe, expect, it } from "vitest";
import { extractProposalValueLinesFromText } from "../proposalValueExtraction";

describe("extractProposalValueLinesFromText", () => {
  it("extracts editable money rows from an uploaded signed proposal without rewriting the proposal", () => {
    const rows = extractProposalValueLinesFromText(`
      APAS Build signed subcontractor proposal
      Stucco repairs at Building 4 exterior elevation $11,500.00
      Waterproofing allowance by ABC Contractors $22,000.00
      General conditions, bond, and cleanup $3,250
    `);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      description: "Stucco repairs at Building 4 exterior elevation",
      unit_cost: 11500,
      markup_pct: 0,
    });
    expect(rows[1]).toMatchObject({
      description: "Waterproofing allowance by ABC Contractors",
      unit_cost: 22000,
      markup_pct: 0,
    });
  });

  it("ignores text with no proposal values", () => {
    expect(extractProposalValueLinesFromText("Signed by owner. See attached insurance certificate.")).toEqual([]);
  });
});
