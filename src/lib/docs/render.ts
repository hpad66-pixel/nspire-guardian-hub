// Fidelity helpers — keep and render the ORIGINAL uploaded file, no conversion.
// docx-preview renders the real Word styles (fonts, colours, the gold rule,
// spacing); PDFs render in a native <iframe> object URL. All client-side, no API.

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      resolve(s.slice(s.indexOf(",") + 1)); // strip "data:...;base64,"
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const sanitize = (s: string) => (s || "document").replace(/[^\w.-]+/g, "_").slice(0, 80);

export function downloadBase64(b64: string, mime: string, filename: string) {
  const url = URL.createObjectURL(base64ToBlob(b64, mime));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};
export const extFor = (mime: string | null) => (mime === MIME.pdf ? "pdf" : "docx");
export const filenameFor = (title: string, mime: string | null) => `${sanitize(title)}.${extFor(mime)}`;

/** Render a .docx (base64) faithfully into a container element. */
export async function renderDocxInto(base64: string, container: HTMLElement): Promise<void> {
  const { renderAsync } = await import("docx-preview");
  container.innerHTML = "";
  const blob = base64ToBlob(base64, MIME.docx);
  await renderAsync(blob, container, undefined, {
    className: "docx",
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    useBase64URL: true,
  });
}

/** Object URL for previewing a PDF (base64) in an <iframe>. Caller revokes it. */
export function pdfObjectUrl(base64: string): string {
  return URL.createObjectURL(base64ToBlob(base64, MIME.pdf));
}

// ── Pixel-perfect PDF export ─────────────────────────────────────────────────
// Rasterizes the ACTUAL rendered letter (one image per docx-preview page section,
// same technique already used for pay-app PDFs in this codebase) instead of
// re-encoding HTML into a Word/print document. A screenshot can't misinterpret
// CSS or fall back to a default table style — what you see is what gets sent.
async function htmlToPdfBlob(html: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;background:#ffffff;";
  host.innerHTML = html;
  document.body.appendChild(host);
  // Let web fonts/layout settle before rasterizing.
  await (document as any).fonts?.ready?.catch(() => {});
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // docx-preview renders one .docx section per physical page when breakPages
    // is on — capture each separately so a multi-page letter gets real PDF pages.
    // When an e-sign root wraps the letter, stamp/signature sit as siblings of
    // .docx sections and would be dropped unless we clone them into each page.
    const pages = Array.from(host.querySelectorAll<HTMLElement>(".docx"));
    const esignRoot = host.querySelector<HTMLElement>("[data-esign-root]");
    const stampEl = esignRoot?.querySelector<HTMLElement>("[data-esign-stamp]");
    const signatureEl = esignRoot?.querySelector<HTMLElement>("[data-esign-signature]");

    const nodes: HTMLElement[] = [];
    if (pages.length && (stampEl || signatureEl)) {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const wrap = document.createElement("div");
        wrap.setAttribute("data-esign-capture", "1");
        wrap.style.cssText = "position:relative;background:#ffffff;display:inline-block;";
        // Move page into wrap for capture (restored in finally via host.remove).
        page.parentElement?.insertBefore(wrap, page);
        wrap.appendChild(page);
        // Certificate seal on every page so downloads prove the e-sign.
        if (stampEl) {
          const stampClone = stampEl.cloneNode(true) as HTMLElement;
          stampClone.style.position = "absolute";
          stampClone.style.top = "14px";
          stampClone.style.right = "16px";
          stampClone.style.zIndex = "40";
          wrap.appendChild(stampClone);
        }
        // Placed signature only on the first page for Word letters (single placement).
        if (signatureEl && i === 0) {
          const sigClone = signatureEl.cloneNode(true) as HTMLElement;
          wrap.appendChild(sigClone);
        }
        nodes.push(wrap);
      }
    } else {
      nodes.push(...(pages.length ? pages : [host]));
    }

    const pdf = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 0;

    for (let i = 0; i < nodes.length; i++) {
      if (i > 0) pdf.addPage("letter", "portrait");
      const canvas = await html2canvas(nodes[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", (pageW - w) / 2, margin, w, h);
    }
    return pdf.output("blob");
  } finally {
    host.remove();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => { const s = String(fr.result); resolve(s.slice(s.indexOf(",") + 1)); };
    fr.readAsDataURL(blob);
  });
}

/** Download the rendered letter as a pixel-perfect PDF. */
export async function downloadHtmlAsPdf(html: string, title: string): Promise<void> {
  const blob = await htmlToPdfBlob(html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title.replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Build a pixel-perfect PDF email attachment from the rendered letter. */
export async function htmlToPdfAttachment(html: string, title: string): Promise<{ filename: string; contentBase64: string; contentType: string; size: number }> {
  const blob = await htmlToPdfBlob(html);
  const contentBase64 = await blobToBase64(blob);
  return { filename: `${title.replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`, contentBase64, contentType: MIME.pdf, size: blob.size };
}
