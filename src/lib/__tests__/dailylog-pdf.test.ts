/**
 * C4 · Daily log PDF smoke test.
 */
import { describe, it, expect } from "vitest";
import { generateDailyLogPdf } from "@/lib/pdf/dailyLog";

describe("generateDailyLogPdf", () => {
  const report = {
    id: "d1",
    log_date: "2026-04-23",
    weather_high_f: 72,
    weather_low_f: 51,
    weather_description: "Partly cloudy",
    precip_in: 0.12,
    wind_mph: 8,
    notes: "Poured slab on grade in sector B.",
    author_name: "P. Foreman",
  };

  it("builds a PDF with only the report and no child sections", () => {
    const doc = generateDailyLogPdf(report);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(400);
  });

  it("includes all sections without throwing when arrays are populated", () => {
    const doc = generateDailyLogPdf(report, {
      labor: [{ company: "ACME", trade: "Concrete", workers: 6, hours: 48 }],
      equipment: [{ equipment: "Pump truck", hours: 8, idle_hours: 1 }],
      deliveries: [{ time: "09:00", vendor: "Local Co", items: "Rebar" }],
      quality: [{ time: "11:30", description: "Honeycomb at col. B5", severity: "medium" }],
      safety: [{ time: "14:00", description: "Near miss — dropped tool", severity: "high" }],
    });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(500);
  });
});
