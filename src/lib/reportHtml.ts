/**
 * Branded HTML renderer for the Daily Field Inspection Report.
 *
 * Used by:
 *   - the in-app "View" side panel (rendered via dangerouslySetInnerHTML)
 *   - the "Print" action (written into a fresh window + window.print())
 *
 * This path does NOT depend on jsPDF, so printing/viewing can never silently
 * fail the way a canvas/PDF generation can. Everything is plain HTML + CSS.
 */

export interface SubcontractorEntry { company?: string; trade?: string; workers?: number | string }
export interface VisitorEntry { name?: string; company?: string; purpose?: string }
export interface ManpowerLike { trade?: string | null; workers?: number | null; hours?: number | null; notes?: string | null }

export interface DailyReportLike {
  id?: string;
  report_date: string;
  weather?: string | null;
  workers_count?: number | null;
  work_performed?: string | null;
  materials_received?: string | null;
  equipment_used?: unknown;
  subcontractors?: unknown;
  safety_notes?: string | null;
  delays?: string | null;
  visitor_log?: unknown;
  photos?: unknown;
  submitted_at?: string | null;
}

/** Coerce anything (array, JSON string, null, scalar) into a clean array. */
export function asArray<T = any>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? (parsed as T[]) : ([parsed] as T[]);
    } catch {
      // comma-separated fallback (e.g. equipment list typed as "a, b, c")
      return s.split(",").map(x => x.trim()).filter(Boolean) as unknown as T[];
    }
  }
  if (v == null) return [];
  return [v as T];
}

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDateLong(d: string): string {
  const part = d.length > 10 ? d.slice(0, 10) : d;
  const dt = new Date(part + "T12:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function textBlock(value: string | null | undefined): string {
  if (!value || !String(value).trim()) {
    return `<p class="muted">None recorded.</p>`;
  }
  return `<p class="body">${esc(value).replace(/\n/g, "<br/>")}</p>`;
}

function section(title: string, inner: string): string {
  return `
    <section class="sec">
      <h2>${esc(title)}</h2>
      ${inner}
    </section>`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return `<p class="muted">None recorded.</p>`;
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>`;
}

const STYLE = `
  * { box-sizing: border-box; }
  .report-root {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1A1714;
    background: #fff;
    max-width: 820px;
    margin: 0 auto;
    padding: 32px 40px 48px;
    line-height: 1.5;
  }
  .report-root .bar { height: 6px; background: #1D6FE8; border-radius: 3px; margin-bottom: 20px; }
  .report-root .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e6e4e1; padding-bottom: 14px; margin-bottom: 20px; }
  .report-root .hdr h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 700; margin: 0 0 4px; }
  .report-root .hdr .subtitle { font-size: 12px; color: #6b6660; margin: 0; }
  .report-root .hdr .company { font-size: 12px; font-weight: 700; text-align: right; }
  .report-root .hdr .badge { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 3px 8px; border-radius: 999px; margin-top: 6px; }
  .report-root .badge.submitted { background: #d1fae5; color: #065f46; }
  .report-root .badge.draft { background: #fef3c7; color: #92400e; }
  .report-root .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 24px; font-size: 13px; }
  .report-root .meta .k { color: #6b6660; font-weight: 600; display: inline-block; min-width: 92px; }
  .report-root .sec { margin-bottom: 22px; page-break-inside: avoid; }
  .report-root .sec h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #504c48; background: #f8f7f4; padding: 6px 10px; border-radius: 4px; margin: 0 0 10px; }
  .report-root .body { font-size: 13px; margin: 0 0 4px; white-space: pre-wrap; }
  .report-root .muted { font-size: 13px; color: #9c968f; font-style: italic; margin: 0; }
  .report-root table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .report-root th { text-align: left; background: #f0efec; color: #504c48; font-weight: 700; padding: 7px 10px; border: 1px solid #d8d6d2; }
  .report-root td { padding: 7px 10px; border: 1px solid #e2e0dc; }
  .report-root .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .report-root .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 6px; border: 1px solid #e2e0dc; }
  .report-root .sig { display: flex; gap: 48px; margin-top: 40px; page-break-inside: avoid; }
  .report-root .sig .line { flex: 1; border-top: 1px solid #9c968f; padding-top: 6px; font-size: 11px; color: #6b6660; }
  .report-root .ftr { margin-top: 32px; border-top: 1px solid #e6e4e1; padding-top: 10px; font-size: 10px; color: #9c968f; display: flex; justify-content: space-between; }
  @media print {
    .report-root { max-width: none; padding: 0; }
    @page { margin: 16mm; }
  }
`;

/** Build the inner branded HTML for a report (no <html> wrapper). */
export function buildDailyReportInnerHtml(
  report: DailyReportLike,
  manpower: ManpowerLike[],
  projectName: string,
  companyName?: string,
): string {
  const dateLabel = fmtDateLong(report.report_date);
  const submitted = Boolean(report.submitted_at);

  const equipment = asArray<string | Record<string, any>>(report.equipment_used)
    .map(e => (typeof e === "string" ? e : (e?.equipment_name ?? e?.name ?? JSON.stringify(e))))
    .filter(Boolean);

  const subs = asArray<SubcontractorEntry>(report.subcontractors);
  const visitors = asArray<VisitorEntry>(report.visitor_log);
  const photos = asArray<string>(report.photos).filter(p => typeof p === "string" && p);

  const manpowerRows = (manpower ?? []).map(m => [
    m.trade ?? "—",
    String(m.workers ?? 0),
    String(m.hours ?? 0),
    m.notes ?? "",
  ]);

  return `
    <div class="report-root">
      <div class="bar"></div>
      <div class="hdr">
        <div>
          <h1>Daily Field Inspection Report</h1>
          <p class="subtitle">${esc(projectName)} &middot; ${esc(dateLabel)}</p>
        </div>
        <div>
          ${companyName ? `<div class="company">${esc(companyName)}</div>` : ""}
          <span class="badge ${submitted ? "submitted" : "draft"}">${submitted ? "Submitted" : "Draft"}</span>
        </div>
      </div>

      <div class="meta">
        <div><span class="k">Report Date:</span> ${esc(dateLabel)}</div>
        <div><span class="k">Weather:</span> ${esc(report.weather ?? "—")}</div>
        <div><span class="k">Workers:</span> ${report.workers_count != null ? esc(report.workers_count) : "—"}</div>
        <div><span class="k">Project:</span> ${esc(projectName)}</div>
        <div><span class="k">Submitted:</span> ${submitted ? esc(new Date(report.submitted_at as string).toLocaleString()) : "Not yet submitted"}</div>
      </div>

      ${section("Work Performed Today", textBlock(report.work_performed))}
      ${section("Manpower on Site", table(["Trade / Crew", "Workers", "Hours", "Notes"], manpowerRows))}
      ${section("Materials Received", textBlock(report.materials_received))}
      ${section("Equipment on Site", equipment.length ? `<p class="body">${esc(equipment.join(", "))}</p>` : textBlock(null))}
      ${section("Subcontractors on Site", table(["Company", "Trade", "Workers"], subs.map(s => [s.company ?? "—", s.trade ?? "—", String(s.workers ?? "—")])))}
      ${section("Safety Observations", textBlock(report.safety_notes))}
      ${section("Issues & Delays", textBlock(report.delays))}
      ${section("Visitors to Site", table(["Name", "Company", "Purpose"], visitors.map(v => [v.name ?? "—", v.company ?? "—", v.purpose ?? "—"])))}
      ${photos.length ? section("Photos", `<div class="photos">${photos.map(p => `<img src="${esc(p)}" alt="site photo"/>`).join("")}</div>`) : ""}

      <div class="sig">
        <div class="line">Superintendent Signature</div>
        <div class="line">Date</div>
      </div>

      <div class="ftr">
        <span>Generated ${esc(new Date().toLocaleString())}</span>
        <span>Daily Field Inspection Report &middot; ${esc(report.report_date)}</span>
      </div>
    </div>`;
}

/** CSS used by the View panel and the print window. */
export const REPORT_STYLE = STYLE;

/** Open a fresh window with the branded report and trigger the print dialog. */
export function printDailyReport(
  report: DailyReportLike,
  manpower: ManpowerLike[],
  projectName: string,
  companyName?: string,
): boolean {
  const inner = buildDailyReportInnerHtml(report, manpower, projectName, companyName);
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return false; // popup blocked — caller shows a fallback
  win.document.open();
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Daily Report ${esc(report.report_date)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet"/>
  <style>${STYLE}</style>
</head>
<body>
  ${inner}
  <script>
    // Wait for images to settle, then print.
    (function(){
      function go(){ window.focus(); window.print(); }
      var imgs = Array.prototype.slice.call(document.images);
      if (imgs.length === 0) { setTimeout(go, 300); return; }
      var left = imgs.length;
      function done(){ if (--left <= 0) setTimeout(go, 200); }
      imgs.forEach(function(im){ if (im.complete) done(); else { im.onload = done; im.onerror = done; } });
      setTimeout(go, 2500); // hard fallback
    })();
  </script>
</body>
</html>`);
  win.document.close();
  return true;
}
