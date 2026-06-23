import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Rasterize a rendered PayApplicationDocument into a clean, paginated US-Letter PDF.
 *
 * Each `[data-pdf-page]` element becomes exactly ONE PDF page, scaled to fit the
 * printable area with its aspect ratio preserved. Because we rasterize per page
 * (instead of slicing one tall image at blind pixel boundaries), page breaks never
 * cut through a table row, the signature block, or the certificate summary — which
 * was the source of the "bad formatting in Adobe". Falls back to the whole node as
 * a single page when no page markers are present.
 */
export async function payAppPdfBlob(node: HTMLElement): Promise<Blob> {
  const marked = Array.from(node.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  const pages = marked.length ? marked : [node];

  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 3, backgroundColor: "#ffffff", useCORS: true });
    // Fit within the printable area, preserving aspect ratio — never overflow a page.
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageW - w) / 2; // center horizontally
    if (i > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, margin, w, h);
  }
  return pdf.output("blob");
}

export async function downloadPayAppPdf(node: HTMLElement, filename: string): Promise<void> {
  const blob = await payAppPdfBlob(node);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a Blob as a base64 string (no `data:` prefix) — for email attachments. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const res = String(fr.result);
      resolve(res.slice(res.indexOf(",") + 1)); // strip "data:...;base64,"
    };
    fr.readAsDataURL(blob);
  });
}
