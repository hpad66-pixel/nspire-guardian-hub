/**
 * Daily Field Inspection Report PDF generator.
 * Uses shared helpers from src/lib/pdf/index.ts.
 */
import { newDoc, drawHeader, drawTable, drawFooter, drawKeyValueBlock, downloadPdf } from "./index";
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
  submitted_by: string | null;
  superintendent_id: string | null;
}

export function generateInspectionReportPdf(
  report: DailyReportData,
  manpower: ManpowerRow[],
  projectName: string,
  companyName?: string,
): void {
  const doc = newDoc();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentW = pageW - margin * 2;

  const dateLabel = report.report_date
    ? new Date(report.report_date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "—";

  drawHeader(doc, {
    title: "Daily Field Inspection Report",
    subtitle: `${projectName} · ${dateLabel}`,
    tenantName: companyName,
  });

  let y = 110;

  // Key-value block
  drawKeyValueBlock(doc, margin, y, [
    ["Project:", projectName],
    ["Report Date:", dateLabel],
    ["Weather:", report.weather ?? "—"],
    ["Workers on Site:", report.workers_count != null ? String(report.workers_count) : "—"],
  ], { colWidth: 120, lineHeight: 16 });

  y += 16 * 4 + 16;

  const sectionHeader = (label: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(label.toUpperCase(), margin, y);
    doc.setDrawColor(200);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 3, margin + contentW, y + 3);
    doc.setTextColor(0);
    y += 16;
  };

  const bodyText = (text: string | null | undefined) => {
    if (!text) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(150);
      doc.text("None recorded.", margin, y); doc.setTextColor(0);
      y += 14;
      return;
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40);
    const lines = doc.splitTextToSize(text, contentW);
    const blockH = lines.length * 12;
    if (y + blockH > doc.internal.pageSize.getHeight() - 70) { doc.addPage(); y = 60; }
    doc.text(lines, margin, y);
    doc.setTextColor(0);
    y += blockH + 10;
  };

  // Work Performed
  sectionHeader("Work Performed Today");
  bodyText(report.work_performed);

  // Manpower
  sectionHeader("Manpower on Site");
  if (manpower.length > 0) {
    y = drawTable(doc, {
      x: margin, y,
      columns: [
        { header: "Trade", key: "trade", width: 160 },
        { header: "Workers", key: "workers", width: 80, align: "center" },
        { header: "Hours", key: "hours", width: 80, align: "center" },
        { header: "Notes", key: "notes", width: contentW - 320 },
      ],
      rows: manpower,
      onNewPage: (_d) => 60,
    });
    y += 12;
  } else {
    bodyText(null);
  }

  // Materials
  sectionHeader("Materials Received");
  bodyText(report.materials_received);

  // Equipment
  sectionHeader("Equipment on Site");
  bodyText(report.equipment_used?.join(", ") ?? null);

  // Subcontractors
  sectionHeader("Subcontractors on Site");
  const subs = report.subcontractors ?? [];
  if (subs.length > 0) {
    y = drawTable(doc, {
      x: margin, y,
      columns: [
        { header: "Company", key: "company", width: 200 },
        { header: "Trade", key: "trade", width: 160 },
        { header: "Workers", key: "workers", width: contentW - 360, align: "center" },
      ],
      rows: subs,
      onNewPage: (_d) => 60,
    });
    y += 12;
  } else {
    bodyText(null);
  }

  // Safety
  sectionHeader("Safety Observations");
  bodyText(report.safety_notes);

  // Issues & Delays
  sectionHeader("Issues & Delays");
  bodyText(report.delays);

  // Visitors
  sectionHeader("Visitors to Site");
  const visitors = report.visitor_log ?? [];
  if (visitors.length > 0) {
    y = drawTable(doc, {
      x: margin, y,
      columns: [
        { header: "Name", key: "name", width: 160 },
        { header: "Company", key: "company", width: 160 },
        { header: "Purpose", key: "purpose", width: contentW - 320 },
      ],
      rows: visitors,
      onNewPage: (_d) => 60,
    });
    y += 12;
  } else {
    bodyText(null);
  }

  // Submission footer note
  if (report.submitted_at) {
    const submittedStr = new Date(report.submitted_at).toLocaleString();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (y + 20 > doc.internal.pageSize.getHeight() - 70) { doc.addPage(); y = 60; }
    doc.text(`Submitted on ${submittedStr}`, margin, y);
    doc.setTextColor(0);
  }

  const totalPages = (doc.internal as any).pages?.length ?? 1;
  drawFooter(doc, {
    generatedAt: new Date(),
    pageLabel: `Page 1 of ${totalPages}`,
  });

  const safeDate = report.report_date?.replace(/-/g, "") ?? "report";
  downloadPdf(doc, `daily-report-${safeDate}.pdf`);
}
