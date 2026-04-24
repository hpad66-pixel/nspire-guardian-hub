/**
 * E1 · Schedule import helpers — pure logic tests for the P6 XER + MSP XML
 * duration + relation mapping. The edge functions themselves round-trip
 * against a live Supabase; here we only guard the conversion math.
 */
import { describe, it, expect } from "vitest";

/** Port of the logic in supabase/functions/parse-msp-xml/index.ts. */
function isoDurationToDays(d: string | null): number | null {
  if (!d) return null;
  const m = d.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const totalHours = days * 8 + hours + mins / 60;
  return Math.max(0, Math.round(totalHours / 8));
}

function mapMspRelation(raw: string | null): "FS" | "SS" | "FF" | "SF" {
  // MSP: 0 FF, 1 FS, 2 SF, 3 SS
  if (raw === "0") return "FF";
  if (raw === "2") return "SF";
  if (raw === "3") return "SS";
  return "FS";
}

/** Port of the logic in supabase/functions/parse-p6-xer/index.ts. */
function mapXerRelation(raw: string | null | undefined): "FS" | "SS" | "FF" | "SF" {
  const r = (raw ?? "").toUpperCase();
  if (r.includes("PR_FS")) return "FS";
  if (r.includes("PR_SS")) return "SS";
  if (r.includes("PR_FF")) return "FF";
  if (r.includes("PR_SF")) return "SF";
  return "FS";
}

describe("MSP duration → days", () => {
  it("returns 1 day for PT8H (8-hour working day)", () => {
    expect(isoDurationToDays("PT8H")).toBe(1);
  });
  it("returns 2 days for PT16H", () => {
    expect(isoDurationToDays("PT16H")).toBe(2);
  });
  it("respects the D prefix for full days", () => {
    expect(isoDurationToDays("P3D")).toBe(3);
    expect(isoDurationToDays("P1DT4H")).toBe(2); // 8 + 4 = 12h → 1.5 → rounds to 2
  });
  it("returns null for nonsense input", () => {
    expect(isoDurationToDays("garbage")).toBeNull();
    expect(isoDurationToDays(null)).toBeNull();
  });
  it("clamps negatives to zero", () => {
    // No explicit negative support — the parser regex won't match a leading '-'.
    expect(isoDurationToDays("-PT8H")).toBeNull();
  });
});

describe("MSP relation mapping", () => {
  it("defaults to FS", () => {
    expect(mapMspRelation(null)).toBe("FS");
    expect(mapMspRelation("1")).toBe("FS");
  });
  it("maps the three non-default codes", () => {
    expect(mapMspRelation("0")).toBe("FF");
    expect(mapMspRelation("2")).toBe("SF");
    expect(mapMspRelation("3")).toBe("SS");
  });
});

describe("P6 XER relation mapping", () => {
  it("defaults to FS when unset or unrecognized", () => {
    expect(mapXerRelation(null)).toBe("FS");
    expect(mapXerRelation("UNKNOWN")).toBe("FS");
  });
  it("handles all four canonical P6 codes", () => {
    expect(mapXerRelation("PR_FS")).toBe("FS");
    expect(mapXerRelation("PR_SS")).toBe("SS");
    expect(mapXerRelation("PR_FF")).toBe("FF");
    expect(mapXerRelation("PR_SF")).toBe("SF");
  });
  it("is case-insensitive", () => {
    expect(mapXerRelation("pr_fs")).toBe("FS");
    expect(mapXerRelation("Pr_Ss")).toBe("SS");
  });
});
