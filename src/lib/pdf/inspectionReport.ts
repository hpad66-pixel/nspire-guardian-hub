/**
 * Daily Field Inspection Report PDF generator.
 * Uses shared helpers from src/lib/pdf/index.ts.
 */
import { jsPDF } from "jspdf";
import { money } from "./index";
import type { ManpowerRow } from "@/hooks/useDailyLog";

export interface SubcontractorEntry {
  company: string;
  trade: string;
  workers: number;
}

export interface VisitorEntry {
  name: string;
  company: string;
  purpose: string;
}

export interface DailyReportData {
  id: string;
  report_date: string;
  weather: string | null;
  workers_count: number | null;
  work_performed: string | null;
  materials_received: string | null;
  equipment_used: string[] | null;
  subcontractors: SubcontractorEntry[] | null;
  safety_notes: string | null;
  delays: string | null;
  visitor_log: VisitorEntry[] | null;
  submitted_at: string | null;
  submitted_by?: string | null;
  superintendent_id?: string | null;
}

const MARGIN = 40;
const PAGE_W = 612; // letter width in pt
const PAGE_H = 792; // letter height in pt
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 30;
const HEADER_H = 92; // space reserved for header

// ─── Low-level helpers ────────────────────────────────────────────────────────

function header(doc: jsPDF, title: string, subtitle: string, company: string | undefined, pageNum: number) {
  // Blue accent bar at top
  doc.setFillColor(29, 111, 232); // --apas-sapphire
  doc.rect(0, 0, PAGE_W, 6, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 23, 20);
  doc.text(title, MARGIN, 38);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 96, 92);
  doc.text(subtitle, MARGIN, 52);

  // Company / page number on right
  if (company) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(26, 23, 20);
    doc.text(company, PAGE_W - MARGIN, 38, { align: "right" });
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 135, 129);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, 52, { align: "right" });

  // Divider
  doc.setDrawColor(230, 228, 225);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 60, PAGE_W - MARGIN, 60);
}

function footer(doc: jsPDF, generatedAt: Date, reportDate: string) {
  doc.setDrawColor(230, 228, 225);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, FOOTER_Y - 8, PAGE_W - MARGIN, FOOTER_Y - 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 135, 129);
  doc.text(`Generated ${generatedAt.toLocaleString()}`, MARGIN, FOOTER_Y);
  doc.text(`Daily Field Inspection Report · ${reportDate}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
  doc.setTextColor(0);
}

function sectionTitle(doc: jsPDF, label: string, y: number): number {
  doc.setFillColor(248, 247, 244);
  doc.rect(MARGIN, y, CONTENT_W, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 76, 72);
  doc.text(label.toUpperCase(), MARGIN + 6, y + 10.5);
  doc.setTextColor(26, 23, 20);
  return y + 22;
}

function bodyText(doc: jsPDF, text: string | null | undefined, y: number, maxY: number): number {
  if (!text || !text.trim()) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(150, 145, 140);
    doc.text("None recorded.", MARGIN + 6, y);
    doc.setTextColor(26, 23, 20);
    return y + 16;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 36, 32);
  const lines = doc.splitTextToSize(text.trim(), CONTENT_W - 12);
  let curY = y;
  for (const line of lines) {
    if (curY > maxY) break; // caller handles page breaks
    doc.text(line, MARGIN + 6, curY);
    curY += 13;
  }
  doc.setTextColor(26, 23, 20);
  return curY + 6;
}

function tableSection(
  doc: jsPDF,
  cols: { label: string; width: number; align?: "left" | "center" | "right" }[],
  rows: Record<string, any>[],
  keys: string[],
  y: number,
  maxY: number,
): number {
  const rowH = 17;
  const totalW = cols.reduce((s, c) => s + c.width, 0);

  // Header row
  doc.setFillColor(240, 239, 236);
  doc.rect(MARGIN, y, totalW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 76, 72);
  let cx = MARGIN;
  for (const c of cols) {
    const tx = c.align === "right" ? cx + c.width - 5
             : c.align === "center" ? cx + c.width / 2
             : cx + 5;
    doc.text(c.label, tx, y + rowH * 0.68, { align: c.align ?? "left" });
    cx += c.width;
  }
  y += rowH;

  // Data rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 36, 32);
  doc.setDrawColor(220, 218, 214);
  doc.setLineWidth(0.3);

  for (const row of rows) {
    if (y > maxY) break;
    cx = MARGIN;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const val = row[keys[i]];
      const str = val == null ? "—" : String(val);
      const tx = c.align === "right" ? cx + c.width - 5
               : c.align === "center" ? cx + c.width / 2
               : cx + 5;
      doc.text(str, tx, y + rowH * 0.68, { align: c.align ?? "left", maxWidth: c.width - 10 });
      cx += c.width;
    }
    doc.line(MARGIN, y + rowH, MARGIN + totalW, y + rowH);
    y += rowH;
  }

  // Outer border
  doc.setDrawColor(180, 178, 174);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN, y - rowH * (rows.length + 1), totalW, rowH * (rows.length + 1));

  return y + 8;
}

function kvGrid(doc: jsPDF, items: [string, string][], y: number): number {
  const colW = CONTENT_W / 2;
  doc.setFontSize(9);
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 76, 72);
    doc.text(left[0], MARGIN + 6, y);
    if (right) doc.text(right[0], MARGIN + colW + 6, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(26, 23, 20);
    doc.text(left[1] || "—", MARGIN + 100, y);
    if (right) doc.text(right[1] || "—", MARGIN + colW + 100, y);
    y += 16;
  }
  return y + 8;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateInspectionReportPdf(
  report: DailyReportData,
  manpower: ManpowerRow[],
  projectName: string,
  companyName?: string,
): void {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const generatedAt = new Date();
    let pageNum = 1;
    const maxContentY = FOOTER_Y - 20;

    const dateLabel = report.report_date
      ? new Date(report.report_date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : "—";

    const subtitle = `${projectName} · ${dateLabel}`;

    function newPage() {
      footer(doc, generatedAt, dateLabel);
      doc.addPage();
      pageNum++;
      header(doc, "Daily Field Inspection Report", subtitle, companyName, pageNum);
      return HEADER_H + 10;
    }

    function ensureSpace(y: number, needed: number): number {
      if (y + needed > maxContentY) return newPage();
      return y;
    }

    // ── Page 1 header
    header(doc, "Daily Field Inspection Report", subtitle, companyName, pageNum);
    let y = HEADER_H + 10;

    // ── Report Info KV grid
    y = kvGrid(doc, [
      ["Report Date:", dateLabel],
      ["Status:", report.submitted_at ? "Submitted" : "Draft"],
      ["Weather:", report.weather ?? "—"],
      ["Workers on Site:", report.workers_count != null ? String(report.workers_count) : "—"],
      ["Submitted:", report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "Not yet submitted"],
      ["Project:", projectName],
    ], y);

    doc.setDrawColor(200, 198, 194);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 14;

    // ── Work Performed
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Work Performed Today", y);
    y = bodyText(doc, report.work_performed, y, maxContentY);
    y += 4;

    // ── Manpower
    y = ensureSpace(y, 60);
    y = sectionTitle(doc, "Manpower on Site", y);
    if (manpower.length > 0) {
      y = ensureSpace(y, 30 + manpower.length * 17);
      y = tableSection(
        doc,
        [
          { label: "Trade / Crew", width: 200 },
          { label: "Workers", width: 80, align: "center" },
          { label: "Hours", width: 80, align: "center" },
          { label: "Notes", width: CONTENT_W - 360 },
        ],
        manpower.map(r => ({
          trade: r.trade ?? "—",
          workers: r.workers ?? 0,
          hours: r.hours ?? 0,
          notes: r.notes ?? "",
        })),
        ["trade", "workers", "hours", "notes"],
        y,
        maxContentY,
      );
    } else {
      y = bodyText(doc, null, y, maxContentY);
    }

    // ── Materials
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Materials Received", y);
    y = bodyText(doc, report.materials_received, y, maxContentY);

    // ── Equipment
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Equipment on Site", y);
    const equipText = (report.equipment_used ?? []).filter(Boolean).join(", ");
    y = bodyText(doc, equipText || null, y, maxContentY);

    // ── Subcontractors
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Subcontractors on Site", y);
    const subs = report.subcontractors ?? [];
    if (subs.length > 0) {
      y = ensureSpace(y, 30 + subs.length * 17);
      y = tableSection(
        doc,
        [
          { label: "Company", width: 200 },
          { label: "Trade", width: 180 },
          { label: "Workers", width: CONTENT_W - 380, align: "center" },
        ],
        subs.map(s => ({ company: s.company, trade: s.trade, workers: s.workers })),
        ["company", "trade", "workers"],
        y,
        maxContentY,
      );
    } else {
      y = bodyText(doc, null, y, maxContentY);
    }

    // ── Safety
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Safety Observations", y);
    y = bodyText(doc, report.safety_notes, y, maxContentY);

    // ── Issues & Delays
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Issues & Delays", y);
    y = bodyText(doc, report.delays, y, maxContentY);

    // ── Visitors
    y = ensureSpace(y, 50);
    y = sectionTitle(doc, "Visitors to Site", y);
    const visitors = report.visitor_log ?? [];
    if (visitors.length > 0) {
      y = ensureSpace(y, 30 + visitors.length * 17);
      y = tableSection(
        doc,
        [
          { label: "Name", width: 160 },
          { label: "Company", width: 160 },
          { label: "Purpose", width: CONTENT_W - 320 },
        ],
        visitors.map(v => ({ name: v.name, company: v.company, purpose: v.purpose })),
        ["name", "company", "purpose"],
        y,
        maxContentY,
      );
    } else {
      y = bodyText(doc, null, y, maxContentY);
    }

    // ── Signature block
    y = ensureSpace(y, 70);
    y += 16;
    doc.setDrawColor(180, 178, 174);
    doc.setLineWidth(0.4);
    const sigLineW = 160;
    doc.line(MARGIN, y + 24, MARGIN + sigLineW, y + 24);
    doc.line(MARGIN + sigLineW + 32, y + 24, MARGIN + sigLineW * 2 + 32, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 116, 112);
    doc.text("Superintendent Signature", MARGIN, y + 34);
    doc.text("Date", MARGIN + sigLineW + 32, y + 34);
    doc.setTextColor(26, 23, 20);

    // ── Footer on last page
    footer(doc, generatedAt, dateLabel);

    const safeDate = (report.report_date ?? "report").replace(/-/g, "");
    doc.save(`daily-report-${safeDate}.pdf`);
  } catch (err) {
    console.error("[inspectionReport] PDF generation failed:", err);
    throw err;
  }
}

/** Open the PDF in a new browser tab so the user can print from the native print dialog. */
export function printInspectionReport(
  report: DailyReportData,
  manpower: ManpowerRow[],
  projectName: string,
  companyName?: string,
): void {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    // Re-use the same generation logic but output to bloburl instead of saving
    generateInspectionReportPdfToDoc(doc, report, manpower, projectName, companyName);
    const blobUrl = doc.output("bloburl");
    window.open(String(blobUrl), "_blank");
  } catch (err) {
    console.error("[inspectionReport] Print failed:", err);
    throw err;
  }
}

function generateInspectionReportPdfToDoc(
  doc: jsPDF,
  report: DailyReportData,
  manpower: ManpowerRow[],
  projectName: string,
  companyName?: string,
): void {
  const generatedAt = new Date();
  let pageNum = 1;
  const maxContentY = FOOTER_Y - 20;

  const dateLabel = report.report_date
    ? new Date(report.report_date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  const subtitle = `${projectName} · ${dateLabel}`;

  function newPage() {
    footer(doc, generatedAt, dateLabel);
    doc.addPage();
    pageNum++;
    header(doc, "Daily Field Inspection Report", subtitle, companyName, pageNum);
    return HEADER_H + 10;
  }

  function ensureSpace(y: number, needed: number): number {
    if (y + needed > maxContentY) return newPage();
    return y;
  }

  header(doc, "Daily Field Inspection Report", subtitle, companyName, pageNum);
  let y = HEADER_H + 10;

  y = kvGrid(doc, [
    ["Report Date:", dateLabel],
    ["Status:", report.submitted_at ? "Submitted" : "Draft"],
    ["Weather:", report.weather ?? "—"],
    ["Workers on Site:", report.workers_count != null ? String(report.workers_count) : "—"],
    ["Submitted:", report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "Not yet submitted"],
    ["Project:", projectName],
  ], y);

  doc.setDrawColor(200, 198, 194);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 14;

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Work Performed Today", y);
  y = bodyText(doc, report.work_performed, y, maxContentY);
  y += 4;

  y = ensureSpace(y, 60);
  y = sectionTitle(doc, "Manpower on Site", y);
  if (manpower.length > 0) {
    y = ensureSpace(y, 30 + manpower.length * 17);
    y = tableSection(doc,
      [{ label: "Trade / Crew", width: 200 }, { label: "Workers", width: 80, align: "center" }, { label: "Hours", width: 80, align: "center" }, { label: "Notes", width: CONTENT_W - 360 }],
      manpower.map(r => ({ trade: r.trade ?? "—", workers: r.workers ?? 0, hours: r.hours ?? 0, notes: r.notes ?? "" })),
      ["trade", "workers", "hours", "notes"], y, maxContentY);
  } else {
    y = bodyText(doc, null, y, maxContentY);
  }

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Materials Received", y);
  y = bodyText(doc, report.materials_received, y, maxContentY);

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Equipment on Site", y);
  y = bodyText(doc, (report.equipment_used ?? []).filter(Boolean).join(", ") || null, y, maxContentY);

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Subcontractors on Site", y);
  const subs = report.subcontractors ?? [];
  if (subs.length > 0) {
    y = ensureSpace(y, 30 + subs.length * 17);
    y = tableSection(doc,
      [{ label: "Company", width: 200 }, { label: "Trade", width: 180 }, { label: "Workers", width: CONTENT_W - 380, align: "center" }],
      subs, ["company", "trade", "workers"], y, maxContentY);
  } else {
    y = bodyText(doc, null, y, maxContentY);
  }

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Safety Observations", y);
  y = bodyText(doc, report.safety_notes, y, maxContentY);

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Issues & Delays", y);
  y = bodyText(doc, report.delays, y, maxContentY);

  y = ensureSpace(y, 50);
  y = sectionTitle(doc, "Visitors to Site", y);
  const visitors = report.visitor_log ?? [];
  if (visitors.length > 0) {
    y = ensureSpace(y, 30 + visitors.length * 17);
    y = tableSection(doc,
      [{ label: "Name", width: 160 }, { label: "Company", width: 160 }, { label: "Purpose", width: CONTENT_W - 320 }],
      visitors, ["name", "company", "purpose"], y, maxContentY);
  } else {
    y = bodyText(doc, null, y, maxContentY);
  }

  y = ensureSpace(y, 70);
  y += 16;
  doc.setDrawColor(180, 178, 174);
  doc.setLineWidth(0.4);
  const sigLineW = 160;
  doc.line(MARGIN, y + 24, MARGIN + sigLineW, y + 24);
  doc.line(MARGIN + sigLineW + 32, y + 24, MARGIN + sigLineW * 2 + 32, y + 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 116, 112);
  doc.text("Superintendent Signature", MARGIN, y + 34);
  doc.text("Date", MARGIN + sigLineW + 32, y + 34);

  footer(doc, generatedAt, dateLabel);
}
