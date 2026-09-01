import { describe, expect, it } from "vitest";
import { stampSignedHtml } from "../stampSignedHtml";
import { buildESignStampHtml } from "@/components/correspondence/ESignStamp";

describe("stampSignedHtml", () => {
  it("wraps letter HTML with Electronically Signed stamp and placed signature", () => {
    const html = stampSignedHtml("<p>Hello client</p>", {
      name: "Hardeep Anand",
      signatureDataUrl: "data:image/png;base64,AAA",
      signedAt: "2026-08-31T12:00:00.000Z",
      placement: { page: 1, xPct: 70, yPct: 80, widthPct: 28 },
    });
    expect(html).toContain("data-esign-stamp");
    expect(html).toContain("Electronically Signed");
    expect(html).toContain("Hardeep Anand");
    expect(html).toContain("data-esign-signature");
    expect(html).toContain("Hello client");
    expect(html).toContain("left:70%");
  });

  it("builds a compact stamp HTML fragment", () => {
    const stamp = buildESignStampHtml({
      name: "Chris Sullivan",
      signedAt: "2026-08-31T12:00:00.000Z",
      position: "top-right",
    });
    expect(stamp).toContain("Electronically Signed");
    expect(stamp).toContain("Chris Sullivan");
    expect(stamp).toContain("Secured by projOS");
  });
});
