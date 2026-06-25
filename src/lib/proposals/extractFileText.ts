// Client-side extraction of context from uploaded proposal files.
// Text formats are read inline; spreadsheets via SheetJS; PDFs via pdf.js (CDN,
// same loader the viewer uses); images are passed through as base64 for Claude's
// multimodal input. DOCX is extracted via mammoth.

import * as XLSX from "xlsx";
import mammoth from "mammoth/mammoth.browser.js";

const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

export interface ExtractedImage { media_type: string; data: string }
export interface ExtractResult {
  text: string;
  images: ExtractedImage[];
  processed: string[];
  skipped: { name: string; reason: string }[];
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

async function loadPdfjs(): Promise<any> {
  const mod = await import(/* @vite-ignore */ PDFJS_CDN);
  mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return mod;
}

async function readAsText(file: File): Promise<string> {
  return await file.text();
}

async function readSpreadsheet(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    return `# Sheet: ${name}\n${csv}`;
  }).join("\n\n");
}

async function readDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => it.str).join(" "));
  }
  return pages.join("\n\n");
}

async function readImage(file: File): Promise<ExtractedImage> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { media_type: file.type, data: btoa(binary) };
}

export async function extractFiles(files: File[]): Promise<ExtractResult> {
  const result: ExtractResult = { text: "", images: [], processed: [], skipped: [] };
  const chunks: string[] = [];

  for (const file of files) {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    try {
      if (IMAGE_TYPES.includes(file.type)) {
        result.images.push(await readImage(file));
        result.processed.push(name);
      } else if (["txt", "csv", "md", "json", "tsv"].includes(ext) || file.type.startsWith("text/")) {
        chunks.push(`--- ${name} ---\n${await readAsText(file)}`);
        result.processed.push(name);
      } else if (["xlsx", "xls"].includes(ext)) {
        chunks.push(`--- ${name} ---\n${await readSpreadsheet(file)}`);
        result.processed.push(name);
      } else if (ext === "pdf" || file.type === "application/pdf") {
        chunks.push(`--- ${name} ---\n${await readPdf(file)}`);
        result.processed.push(name);
      } else if (ext === "docx") {
        chunks.push(`--- ${name} ---\n${await readDocx(file)}`);
        result.processed.push(name);
      } else if (ext === "doc") {
        result.skipped.push({ name, reason: "Legacy .doc isn't supported — save as .docx or PDF." });
      } else {
        result.skipped.push({ name, reason: "Unsupported file type." });
      }
    } catch (e) {
      result.skipped.push({ name, reason: e instanceof Error ? e.message : "Could not read file." });
    }
  }

  result.text = chunks.join("\n\n");
  return result;
}
