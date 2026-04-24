/**
 * Shared PDF helpers for Procore Lite exports (G702/G703, G701, OSHA 300/301,
 * invoice, RFI, daily log). Thin wrappers over jsPDF with a minimal table
 * renderer — avoids the jspdf-autotable dependency so we stay on the existing
 * dep set and survive fresh installs.
 */
import { jsPDF } from "jspdf";

export type PdfDoc = jsPDF;

export function newDoc(opts?: { orientation?: "portrait" | "landscape"; format?: string }): PdfDoc {
  return new jsPDF({
    orientation: opts?.orientation ?? "portrait",
    unit: "pt",
    format: opts?.format ?? "letter",
  });
}

export function drawHeader(doc: PdfDoc, opts: {
  title: string;
  subtitle?: string;
  tenantName?: string;
  logoDataUrl?: string;
}) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(opts.title, 40, 56);
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, 40, 74);
    doc.setTextColor(0);
  }
  if (opts.tenantName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(opts.tenantName, pageW - 40, 56, { align: "right" });
  }
  if (opts.logoDataUrl) {
    try { doc.addImage(opts.logoDataUrl, "PNG", pageW - 120, 28, 80, 32); } catch {}
  }
  doc.setDrawColor(230);
  doc.setLineWidth(0.5);
  doc.line(40, 90, pageW - 40, 90);
}

export function drawFooter(doc: PdfDoc, opts?: { generatedAt?: Date; pageLabel?: string }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const gen = opts?.generatedAt ?? new Date();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated ${gen.toLocaleString()}`, 40, pageH - 24);
  if (opts?.pageLabel) doc.text(opts.pageLabel, pageW - 40, pageH - 24, { align: "right" });
  doc.setTextColor(0);
}

export function drawKeyValueBlock(
  doc: PdfDoc,
  x: number, y: number,
  rows: Array<[string, string]>,
  opts?: { colWidth?: number; lineHeight?: number },
) {
  const colW = opts?.colWidth ?? 180;
  const lh = opts?.lineHeight ?? 14;
  doc.setFontSize(10);
  rows.forEach(([k, v], i) => {
    const yy = y + i * lh;
    doc.setFont("helvetica", "bold");
    doc.text(k, x, yy);
    doc.setFont("helvetica", "normal");
    doc.text(v, x + colW, yy);
  });
}

export interface Column {
  header: string;
  /** Column width in points. */
  width: number;
  /** Text alignment — default 'left' except last column which is commonly 'right'. */
  align?: "left" | "right" | "center";
  /** Key to pluck from each row. */
  key: string;
  /** Optional formatter. */
  fmt?: (v: any, row: any) => string;
}

/** Draw a simple bordered table. Auto-pages when rows overflow. */
export function drawTable(doc: PdfDoc, opts: {
  x: number; y: number;
  columns: Column[];
  rows: any[];
  headerBg?: [number, number, number];
  rowHeight?: number;
  fontSize?: number;
  onNewPage?: (doc: PdfDoc) => number; // returns new y after redrawing header chrome
}): number {
  const rh = opts.rowHeight ?? 18;
  const fs = opts.fontSize ?? 9;
  const bg = opts.headerBg ?? [240, 240, 244];
  const pageH = doc.internal.pageSize.getHeight();
  const totalW = opts.columns.reduce((s, c) => s + c.width, 0);

  let y = opts.y;
  const drawHead = () => {
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(opts.x, y, totalW, rh, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fs);
    let cx = opts.x;
    for (const c of opts.columns) {
      const tx = c.align === "right" ? cx + c.width - 6
              : c.align === "center" ? cx + c.width / 2
              : cx + 6;
      doc.text(c.header, tx, y + rh * 0.7, { align: c.align ?? "left" });
      cx += c.width;
    }
    y += rh;
  };

  drawHead();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs);
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);

  for (const row of opts.rows) {
    if (y + rh > pageH - 60) {
      doc.addPage();
      y = opts.onNewPage ? opts.onNewPage(doc) : 60;
      drawHead();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fs);
    }
    let cx = opts.x;
    for (const c of opts.columns) {
      const raw = row[c.key];
      const val = c.fmt ? c.fmt(raw, row) : (raw == null ? "" : String(raw));
      const tx = c.align === "right" ? cx + c.width - 6
              : c.align === "center" ? cx + c.width / 2
              : cx + 6;
      doc.text(val, tx, y + rh * 0.68, { align: c.align ?? "left", maxWidth: c.width - 12 });
      cx += c.width;
    }
    doc.line(opts.x, y + rh, opts.x + totalW, y + rh);
    y += rh;
  }

  // outer border
  doc.setDrawColor(180);
  doc.rect(opts.x, opts.y, totalW, y - opts.y);
  // column separators
  {
    let cx = opts.x;
    for (let i = 0; i < opts.columns.length - 1; i++) {
      cx += opts.columns[i].width;
      doc.line(cx, opts.y, cx, y);
    }
  }
  return y;
}

export function money(cents: number | null | undefined, currency = "USD"): string {
  const v = (cents ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(v);
}

export function downloadPdf(doc: PdfDoc, filename: string) {
  doc.save(filename);
}
