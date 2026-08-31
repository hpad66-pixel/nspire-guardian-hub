import { describe, expect, it } from "vitest";
import { buildESignStampHtml } from "@/components/correspondence/ESignStamp";

describe("e-sign seal for downloads", () => {
  it("builds an elegant certificate seal with signer, date, and projOS mark", () => {
    const stamp = buildESignStampHtml({
      name: "Hardeep Anand",
      signedAt: "2026-08-31T18:30:00.000Z",
      position: "top-right",
    });
    expect(stamp).toContain('data-esign-stamp="1"');
    expect(stamp).toContain("Electronically Signed");
    expect(stamp).toContain("Hardeep Anand");
    expect(stamp).toContain("Secured by projOS");
    expect(stamp).toContain("position:absolute");
    expect(stamp).toContain("top:14px");
    expect(stamp).toContain("right:16px");
  });
});
