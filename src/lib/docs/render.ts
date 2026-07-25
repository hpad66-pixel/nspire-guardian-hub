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
