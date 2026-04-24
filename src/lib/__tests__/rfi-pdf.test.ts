/**
 * C1 · RFI PDF export smoke test.
 *
 * The generator is purely compositional — we verify it produces a valid
 * jsPDF instance and its output length is non-trivial. This catches
 * regressions like accidentally importing jspdf-autotable.
 */
import { describe, it, expect } from "vitest";
import { generateRfiPdf } from "@/lib/pdf/rfi";

describe("generateRfiPdf", () => {
  const rfi = {
    id: "r1",
    rfi_number: "RFI-0007",
    question: "Confirm rebar spec for slab-on-grade.",
    stage: "open",
    date_initiated: "2026-04-20",
    drawing_number: "S-101",
    schedule_impact_days: 2,
    cost_impact_cents: 125000,
  };

  it("builds a PDF with no responses", () => {
    const doc = generateRfiPdf(rfi, []);
    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it("builds a PDF with multiple responses including an official flag", () => {
    const doc = generateRfiPdf(rfi, [
      { body: "Use #4 @ 12\" OC.", created_at: new Date().toISOString(), author: "J. Smith", is_official: true },
      { body: "Also noted elsewhere.", created_at: new Date().toISOString(), author: "A. Jones" },
    ]);
    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it("handles a missing question gracefully", () => {
    const doc = generateRfiPdf({ ...rfi, question: null }, []);
    expect(doc).toBeTruthy();
  });
});
