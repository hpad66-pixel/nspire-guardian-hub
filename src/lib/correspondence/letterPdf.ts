// Rasterizes a rendered branded letter into a properly PAGINATED US-Letter PDF.
// Unlike a "shrink everything onto one page" export, a long letter flows
// across as many pages as it needs at full readable size — what you see on
// screen is what prints, just split at page boundaries (same slicing
// technique as src/lib/generatePDF.ts, adapted to Letter format + a plain
// HTMLElement input instead of an id lookup).
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function letterPdfBlob(node: HTMLElement): Promise<Blob> {
  await (document as any).fonts?.ready?.catch(() => {});
  const canvas = await html2canvas(node, { scale: 2.5, backgroundColor: "#ffffff", useCORS: true });

  const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = pageW / canvas.width;
  const pageHeightPx = pageH / ratio; // how many source pixels make one PDF page
  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage("letter", "portrait");
    const sourceY = page * pageHeightPx;
    const sourceH = Math.min(pageHeightPx, canvas.height - sourceY);

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sourceH;
    const ctx = slice.getContext("2d")!;
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);

    pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, sourceH * ratio);
  }
  return pdf.output("blob");
}

export async function downloadLetterPdf(node: HTMLElement, filename: string): Promise<void> {
  const blob = await letterPdfBlob(node);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

export async function letterPdfBase64(node: HTMLElement): Promise<{ base64: string; size: number }> {
  const base64 = await blobToBase64(await letterPdfBlob(node));
  return { base64, size: Math.floor((base64.length * 3) / 4) };
}
