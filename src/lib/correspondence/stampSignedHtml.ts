/**
 * Bake an Adobe-style Electronically Signed stamp + placed signature into
 * authored document HTML so export/email/PDF carry the certificate.
 */
import { buildESignStampHtml, buildSignaturePlacementHtml } from "@/components/correspondence/ESignStamp";
import type { SignaturePlacement } from "@/components/correspondence/SignaturePlacementCanvas";

export function stampSignedHtml(
  html: string | null | undefined,
  opts: {
    name: string;
    signatureDataUrl: string;
    signedAt: string;
    placement: SignaturePlacement;
  },
): string {
  const base = (html && html.trim()) ? html : "<div><p></p></div>";
  // Strip prior stamp/signature markers so re-sign stays clean.
  const cleaned = base
    .replace(/<div[^>]*data-esign-stamp="1"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "")
    .replace(/<div[^>]*data-esign-signature="1"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, "");

  const stamp = buildESignStampHtml({
    name: opts.name,
    signedAt: opts.signedAt,
    position: "top-right",
  });
  const signature = buildSignaturePlacementHtml({
    signatureDataUrl: opts.signatureDataUrl,
    name: opts.name,
    signedAt: opts.signedAt,
    xPct: opts.placement.xPct,
    yPct: opts.placement.yPct,
    widthPct: opts.placement.widthPct,
  });

  return `<div data-esign-root="1" style="position:relative;min-height:100%;">${stamp}${signature}${cleaned}</div>`;
}
