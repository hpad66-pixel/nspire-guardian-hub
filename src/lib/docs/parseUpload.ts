// Client-side document import — turns an uploaded .docx or .pdf into editable HTML
// entirely in the browser (no server, no API call). Word keeps its formatting via
// mammoth; PDF text is extracted with pdfjs (PDF stores layout, not flow, so the
// result is clean paragraphs without the original visual styling).
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// Vite bundles the worker; the ?url import gives a hashed asset URL.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ParsedSource = "docx" | "pdf";
export interface ParsedDocument { html: string; text: string; source: ParsedSource; warnings: string[] }

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Strip tags to a plain-text mirror (for search / knowledge base / previews).
export const htmlToText = (html: string): string => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return (el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
};

async function parseDocx(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value || "<p></p>";
  return { html, text: htmlToText(html), source: "docx", warnings: (result.messages || []).map((m: any) => String(m.message)).slice(0, 5) };
}

async function parsePdf(file: File): Promise<ParsedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const paragraphs: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as any[]) {
      line += item.str;
      if (item.hasEOL) { lines.push(line); line = ""; }
    }
    if (line) lines.push(line);
    // Collapse runs of blank lines into paragraph breaks.
    let buf = "";
    for (const l of lines) {
      if (l.trim() === "") { if (buf.trim()) { paragraphs.push(buf.trim()); buf = ""; } }
      else buf += (buf ? " " : "") + l.trim();
    }
    if (buf.trim()) paragraphs.push(buf.trim());
  }
  const html = paragraphs.length ? paragraphs.map((t) => `<p>${escapeHtml(t)}</p>`).join("\n") : "<p></p>";
  const text = paragraphs.join("\n\n");
  return { html, text, source: "pdf", warnings: pdf.numPages > 0 ? [] : ["No text found — this PDF may be a scanned image."] };
}

const isDocx = (f: File) => /\.docx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const isPdf = (f: File) => /\.pdf$/i.test(f.name) || f.type === "application/pdf";

export async function parseUpload(file: File): Promise<ParsedDocument> {
  if (isDocx(file)) return parseDocx(file);
  if (isPdf(file)) return parsePdf(file);
  // Fallback: treat as plain text.
  const t = await file.text();
  const html = t.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`).join("\n");
  return { html, text: t, source: "docx", warnings: ["Unrecognized type — imported as plain text."] };
}

export const ACCEPTED_UPLOAD = ".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf";
