/**
 * Rasterize a rendered ChangeOrderDocument node into a paginated A4 PDF Blob.
 * Used to produce the locked, signed change-order PDF.
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function nodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    // html2canvas 1.4 throws on modern CSS color functions (oklch/lab) that leak
    // in from the app's global border-color/outline rules. The document itself
    // uses inline hex for text/background, so we only need to neutralize the
    // inherited border/outline colors in the cloned subtree.
    onclone: (doc) => {
      const style = doc.createElement("style");
      style.textContent = "*{border-color:#ddd !important;outline-color:#ddd !important;}";
      doc.head.appendChild(style);
    },
  });
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let remaining = imgH;
  let position = 0;
  const img = canvas.toDataURL("image/png");
  pdf.addImage(img, "PNG", 0, position, imgW, imgH);
  remaining -= pageH;
  while (remaining > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, position, imgW, imgH);
    remaining -= pageH;
  }
  return pdf.output("blob");
}
