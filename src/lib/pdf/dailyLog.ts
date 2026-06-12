/**
 * C4 · Daily Log PDF export.
 *
 * Renders a single daily_reports row plus all its child note tables
 * (labor, equipment, deliveries, quality_events, safety_events).
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock,
  drawTable, downloadPdf, type PdfDoc,
} from "./index";

export interface DailyReportForPdf {
  id: string;
  project_name?: string | null;
  log_date: string;
  weather_high_f: number | null;
  weather_low_f: number | null;
  weather_description: string | null;
  precip_in: number | null;
  wind_mph: number | null;
  notes?: string | null;
  author_name?: string | null;
  submitted_at?: string | null;
}

export interface DailyLaborRow { company: string; trade: string; workers: number; hours: number; }
export interface DailyEquipmentRow { equipment: string; hours: number; idle_hours?: number | null; }
export interface DailyDeliveryRow { time?: string | null; vendor: string; items: string; }
export interface DailyEventRow { time?: string | null; description: string; severity?: string | null; }
/** A photo attached to the daily report, pre-resolved to an embeddable data URL. */
export interface DailyPhotoRow { dataUrl: string; caption?: string | null; }

export function generateDailyLogPdf(
  report: DailyReportForPdf,
  opts: {
    labor?: DailyLaborRow[];
    equipment?: DailyEquipmentRow[];
    deliveries?: DailyDeliveryRow[];
    quality?: DailyEventRow[];
    safety?: DailyEventRow[];
    photos?: DailyPhotoRow[];
    tenantName?: string;
    logoDataUrl?: string;
  } = {},
): PdfDoc {
  const doc = newDoc();

  drawHeader(doc, {
    title: `Daily Log · ${report.log_date}`,
    subtitle: report.project_name ?? undefined,
    tenantName: opts.tenantName,
    logoDataUrl: opts.logoDataUrl,
  });

  drawKeyValueBlock(doc, 40, 112, [
    ["Weather", report.weather_description ?? "—"],
    [
      "High / Low",
      `${report.weather_high_f ?? "—"}°F / ${report.weather_low_f ?? "—"}°F`,
    ],
    ["Precipitation", report.precip_in != null ? `${report.precip_in}"` : "—"],
    ["Wind", report.wind_mph != null ? `${report.wind_mph} mph` : "—"],
    ["Author", report.author_name ?? "—"],
    [
      "Submitted",
      report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "Draft",
    ],
  ], { colWidth: 140 });

  let y = 220;

  if (report.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Narrative", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(report.notes, doc.internal.pageSize.getWidth() - 80);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 18;
  }

  function section(title: string) {
    if (y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      y = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 40, y);
    y += 6;
  }

  if (opts.labor && opts.labor.length > 0) {
    section("Labor");
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Company", key: "company", width: 160 },
        { header: "Trade", key: "trade", width: 120 },
        { header: "Workers", key: "workers", width: 80, align: "right" },
        { header: "Hours", key: "hours", width: 80, align: "right" },
      ],
      rows: opts.labor,
    }) + 12;
  }

  if (opts.equipment && opts.equipment.length > 0) {
    section("Equipment");
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Equipment", key: "equipment", width: 240 },
        { header: "Hours", key: "hours", width: 100, align: "right" },
        { header: "Idle hrs", key: "idle_hours", width: 100, align: "right",
          fmt: (v) => v == null ? "—" : String(v) },
      ],
      rows: opts.equipment,
    }) + 12;
  }

  if (opts.deliveries && opts.deliveries.length > 0) {
    section("Deliveries");
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Time", key: "time", width: 80, fmt: (v) => v ?? "—" },
        { header: "Vendor", key: "vendor", width: 180 },
        { header: "Items", key: "items", width: 240 },
      ],
      rows: opts.deliveries,
    }) + 12;
  }

  if (opts.quality && opts.quality.length > 0) {
    section("Quality events");
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Time", key: "time", width: 80, fmt: (v) => v ?? "—" },
        { header: "Description", key: "description", width: 360 },
        { header: "Severity", key: "severity", width: 90, fmt: (v) => v ?? "—" },
      ],
      rows: opts.quality,
    }) + 12;
  }

  if (opts.safety && opts.safety.length > 0) {
    section("Safety events");
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Time", key: "time", width: 80, fmt: (v) => v ?? "—" },
        { header: "Description", key: "description", width: 360 },
        { header: "Severity", key: "severity", width: 90, fmt: (v) => v ?? "—" },
      ],
      rows: opts.safety,
    }) + 12;
  }

  if (opts.photos && opts.photos.length > 0) {
    section("Photos");
    y += 6;

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const cols = 3;
    const gap = 12;
    const cellW = (pageW - 80 - gap * (cols - 1)) / cols; // 40pt margins each side
    const imgH = cellW * 0.7;
    const capH = 12;
    const rowH = imgH + capH + gap;

    opts.photos.forEach((photo, i) => {
      const col = i % cols;
      if (col === 0) {
        // New row — page-break if it won't fit.
        if (y + rowH > pageH - 60) {
          doc.addPage();
          y = 60;
        }
      }
      const x = 40 + col * (cellW + gap);
      // jsPDF infers the format from the data-URL prefix; default to JPEG.
      const fmt = photo.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      try {
        doc.addImage(photo.dataUrl, fmt, x, y, cellW, imgH);
      } catch {
        // Unreadable image — draw a placeholder box rather than aborting.
        doc.setDrawColor(220);
        doc.rect(x, y, cellW, imgH);
      }
      if (photo.caption) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120);
        const cap = doc.splitTextToSize(photo.caption, cellW)[0] ?? "";
        doc.text(cap, x, y + imgH + 9);
        doc.setTextColor(0);
      }
      if (col === cols - 1) y += rowH;
    });
    // Advance past a partially-filled final row.
    if (opts.photos.length % cols !== 0) y += rowH;
  }

  drawFooter(doc);
  return doc;
}

export function downloadDailyLogPdf(
  report: DailyReportForPdf,
  opts: Parameters<typeof generateDailyLogPdf>[1] = {},
) {
  const doc = generateDailyLogPdf(report, opts);
  downloadPdf(doc, `daily-log-${report.log_date}.pdf`);
}
