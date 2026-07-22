import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Rasterize a rendered report node into a clean single-page US-Letter PDF, scaled
 * to fit the printable area with its aspect ratio preserved (charts never get cut).
 */
export async function reportPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, { scale: 3, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 26;
  const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, margin, w, h);
  return pdf.output("blob");
}

export async function downloadReportPdf(node: HTMLElement, filename: string): Promise<void> {
  const blob = await reportPdfBlob(node);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read a Blob as base64 (without the `data:…;base64,` prefix). Local copy so the
 *  reports path stays self-contained — no coupling to the pay-app pdf module. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      const res = String(fr.result);
      resolve(res.slice(res.indexOf(",") + 1));
    };
    fr.readAsDataURL(blob);
  });
}

/** Build the report PDF and return it base64-encoded for an email attachment. */
export async function reportPdfBase64(node: HTMLElement): Promise<{ base64: string; size: number }> {
  const base64 = await blobToBase64(await reportPdfBlob(node));
  return { base64, size: Math.floor((base64.length * 3) / 4) };
}
