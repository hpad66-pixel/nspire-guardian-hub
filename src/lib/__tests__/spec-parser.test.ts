/**
 * B3 · Spec section parser unit tests.
 *
 * Covers:
 *   - Happy: accepts 2-space, tab, and comma separators; derives division.
 *   - Validation: drops unrecognized lines silently; tolerates extra whitespace.
 *   - Permission: parser is client-pure; RLS on `specification_sections`
 *     governs the eventual insert (covered by rbac.test.ts).
 */
import { describe, it, expect } from "vitest";
import { divisionFrom, parseSections } from "@/lib/spec-parser";

describe("divisionFrom", () => {
  it("extracts the 2-digit division prefix", () => {
    expect(divisionFrom("03 30 00")).toBe("03");
    expect(divisionFrom("26 05 19")).toBe("26");
  });

  it("pads single-digit divisions", () => {
    expect(divisionFrom("3 30 00")).toBe("03");
  });

  it("returns '00' for empty input", () => {
    expect(divisionFrom("")).toBe("00");
  });
});

describe("parseSections", () => {
  it("parses 2-space-separated lines", () => {
    const out = parseSections("03 30 00  Cast-in-Place Concrete");
    expect(out).toEqual([
      { section_number: "03 30 00", title: "Cast-in-Place Concrete", division: "03" },
    ]);
  });

  it("parses tab-separated lines", () => {
    const out = parseSections("09 29 00\tGypsum Board");
    expect(out).toEqual([
      { section_number: "09 29 00", title: "Gypsum Board", division: "09" },
    ]);
  });

  it("parses comma-separated lines", () => {
    const out = parseSections("26 05 19, Low-Voltage Electrical Power Conductors");
    expect(out[0].section_number).toBe("26 05 19");
    expect(out[0].title).toMatch(/Conductors/);
    expect(out[0].division).toBe("26");
  });

  it("accepts a 5-digit CSI number (2+2)", () => {
    const out = parseSections("03 30  Concrete block");
    expect(out).toHaveLength(1);
    expect(out[0].section_number).toBe("03 30");
  });

  it("drops lines that don't match any pattern", () => {
    const input = [
      "03 30 00  OK line",
      "random free text",
      "not-a-spec-line",
      "09 29 00,Another OK",
    ].join("\n");
    const out = parseSections(input);
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.section_number)).toEqual(["03 30 00", "09 29 00"]);
  });

  it("tolerates leading/trailing whitespace and blank lines", () => {
    const input = "\n   \n03 30 00  Concrete\n\n";
    const out = parseSections(input);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Concrete");
  });

  it("returns [] for empty input", () => {
    expect(parseSections("")).toEqual([]);
    expect(parseSections("    ")).toEqual([]);
  });
});
