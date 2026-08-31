/**
 * Burn an Electronically Signed seal + placed signature into a PDF so
 * downloads and email attachments carry the certificate (not just the UI overlay).
 */
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { SignaturePlacement } from "@/components/correspondence/SignaturePlacementCanvas";
import { base64ToBlob, MIME } from "@/lib/docs/render";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type StampSignedPdfOpts = {
  name: string;
  signedAt: string;
  signatureDataUrl?: string | null;
  placement?: SignaturePlacement | null;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Draw the elegant certificate seal onto a page canvas (top-right). */
function drawESignSeal(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  opts: { name: string; when: string },
) {
  const scale = Math.max(0.85, Math.min(1.35, canvasW / 612));
  const pad = 18 * scale;
  const stampW = 210 * scale;
  const stampH = 72 * scale;
  const x = canvasW - stampW - pad;
  const y = pad;

  ctx.save();
  // Soft card shadow
  ctx.shadowColor = "rgba(5, 80, 55, 0.22)";
  ctx.shadowBlur = 14 * scale;
  ctx.shadowOffsetY = 3 * scale;

  // Outer cream card
  roundRect(ctx, x, y, stampW, stampH, 8 * scale);
  ctx.fillStyle = "#FBFDF9";
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Double emerald frame
  ctx.strokeStyle = "#047857";
  ctx.lineWidth = 1.6 * scale;
  roundRect(ctx, x + 1.5 * scale, y + 1.5 * scale, stampW - 3 * scale, stampH - 3 * scale, 7 * scale);
  ctx.stroke();
  ctx.strokeStyle = "rgba(4, 120, 87, 0.35)";
  ctx.lineWidth = 0.75 * scale;
  roundRect(ctx, x + 4.5 * scale, y + 4.5 * scale, stampW - 9 * scale, stampH - 9 * scale, 5 * scale);
  ctx.stroke();

  // Circular seal
  const cx = x + 28 * scale;
  const cy = y + stampH / 2;
  const r = 16 * scale;
  const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, r);
  grad.addColorStop(0, "#34D399");
  grad.addColorStop(1, "#047857");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  // Check mark
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 6 * scale, cy + 0.5 * scale);
  ctx.lineTo(cx - 1.5 * scale, cy + 5 * scale);
  ctx.lineTo(cx + 7 * scale, cy - 5 * scale);
  ctx.stroke();

  // Typography
  const textX = x + 52 * scale;
  ctx.fillStyle = "#065F46";
  ctx.font = `700 ${9.5 * scale}px "DM Sans", system-ui, sans-serif`;
  ctx.fillText("ELECTRONICALLY SIGNED", textX, y + 22 * scale);

  ctx.fillStyle = "#0F172A";
  ctx.font = `600 ${12 * scale}px "DM Sans", system-ui, sans-serif`;
  const name = truncate(ctx, opts.name, stampW - 62 * scale);
  ctx.fillText(name, textX, y + 40 * scale);

  ctx.fillStyle = "#047857";
  ctx.font = `500 ${9 * scale}px "DM Sans", system-ui, sans-serif`;
  ctx.fillText(opts.when, textX, y + 54 * scale);

  ctx.fillStyle = "rgba(4, 120, 87, 0.7)";
  ctx.font = `500 ${8 * scale}px "DM Sans", system-ui, sans-serif`;
  ctx.fillText("Secured by projOS", textX, y + 65 * scale);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load signature image"));
    img.src = src;
  });
}

/** Draw the placed handwritten signature block. */
async function drawSignatureBlock(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  opts: {
    name: string;
    when: string;
    signatureDataUrl: string;
    xPct: number;
    yPct: number;
    widthPct: number;
  },
) {
  const img = await loadImage(opts.signatureDataUrl);
  const blockW = (Math.min(42, Math.max(18, opts.widthPct)) / 100) * canvasW;
  const blockH = Math.max(56, blockW * 0.42);
  const cx = (opts.xPct / 100) * canvasW;
  const cy = (opts.yPct / 100) * canvasH;
  const x = cx - blockW / 2;
  const y = cy - blockH / 2;

  ctx.save();
  ctx.shadowColor = "rgba(5, 80, 55, 0.18)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, x, y, blockW, blockH, 6);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "#059669";
  ctx.lineWidth = 1.25;
  roundRect(ctx, x, y, blockW, blockH, 6);
  ctx.stroke();

  const pad = 6;
  const imgH = blockH * 0.48;
  const imgW = blockW - pad * 2;
  ctx.drawImage(img, x + pad, y + pad, imgW, imgH);

  ctx.fillStyle = "#064E3B";
  ctx.font = `600 ${Math.max(9, blockW * 0.055)}px "DM Sans", system-ui, sans-serif`;
  ctx.fillText(opts.name, x + pad, y + pad + imgH + 12);

  ctx.fillStyle = "#047857";
  ctx.font = `500 ${Math.max(8, blockW * 0.045)}px "DM Sans", system-ui, sans-serif`;
  ctx.fillText(`Electronically signed · ${opts.when}`, x + pad, y + pad + imgH + 24);
  ctx.restore();
}

/**
 * Returns a stamped PDF as base64 (no data: prefix) ready for download/email.
 */
export async function stampSignedPdfBase64(
  originalBase64: string,
  opts: StampSignedPdfOpts,
): Promise<string> {
  const blob = await stampSignedPdfBlob(originalBase64, opts);
  return blobToBase64(blob);
}

export async function stampSignedPdfBlob(
  originalBase64: string,
  opts: StampSignedPdfOpts,
): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([import("jspdf")]);
  const data = new Uint8Array(await base64ToBlob(originalBase64, MIME.pdf).arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const when = formatWhen(opts.signedAt);

  let out: InstanceType<typeof jsPDF> | null = null;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for PDF stamping");

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

    // Certificate seal on every page so any downloaded page proves the e-sign.
    drawESignSeal(ctx, canvas.width, canvas.height, { name: opts.name, when });

    const placement = opts.placement;
    if (
      opts.signatureDataUrl
      && placement
      && (placement.page || 1) === i
    ) {
      await drawSignatureBlock(ctx, canvas.width, canvas.height, {
        name: opts.name,
        when,
        signatureDataUrl: opts.signatureDataUrl,
        xPct: placement.xPct,
        yPct: placement.yPct,
        widthPct: placement.widthPct ?? 28,
      });
    }

    // pdf.js scale 2 → page points ≈ CSS px / 2 at 72dpi
    const pageW = viewport.width / 2;
    const pageH = viewport.height / 2;
    if (!out) {
      out = new jsPDF({
        unit: "pt",
        format: [pageW, pageH],
        orientation: pageW > pageH ? "landscape" : "portrait",
      });
    } else {
      out.addPage([pageW, pageH], pageW > pageH ? "landscape" : "portrait");
    }
    out.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      pageW,
      pageH,
    );
  }

  if (!out) throw new Error("PDF has no pages to stamp");
  return out.output("blob");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.readAsDataURL(blob);
  });
}

/** Build an email/download attachment from a signed PDF original. */
export async function stampedPdfAttachment(
  originalBase64: string,
  title: string,
  opts: StampSignedPdfOpts,
): Promise<{ filename: string; contentBase64: string; contentType: string; size: number }> {
  const contentBase64 = await stampSignedPdfBase64(originalBase64, opts);
  const filename = `${(title || "document").replace(/[^\w.-]+/g, "_").slice(0, 72)}-signed.pdf`;
  return {
    filename,
    contentBase64,
    contentType: MIME.pdf,
    size: Math.round((contentBase64.length * 3) / 4),
  };
}
