import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/** Rasterize a rendered PayApplicationDocument node into a clean, paginated A4 PDF. */
export async function payAppPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const imgW = pageW - margin * 2;
  const scale = imgW / canvas.width; // px → pt
  const pagePx = (pageH - margin * 2) / scale; // canvas px that fit one page

  let sy = 0, first = true;
  while (sy < canvas.height) {
    const sliceH = Math.min(pagePx, canvas.height - sy);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceH;
    slice.getContext("2d")!.drawImage(canvas, 0, sy, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, imgW, sliceH * scale);
    sy += sliceH;
    first = false;
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
