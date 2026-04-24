/**
 * T2.9 · OSHA Form 300 + Form 301 PDF generators.
 *
 * Form 300 = annual Log of Work-Related Injuries and Illnesses (landscape grid).
 * Form 301 = per-incident Injury and Illness Incident Report.
 * These approximate the official layouts; they satisfy 29 CFR 1904 reporting
 * requirements but keep visual parity ~80% with the OSHA originals to stay
 * readable and printable on letter-size paper.
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock, drawTable,
  downloadPdf, type PdfDoc,
} from "./index";

// ───────────────────────── FORM 300 ─────────────────────────

export interface Osha300Input {
  tenantName?: string;
  establishment: {
    name: string;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    naics_code?: string | null;
    sic_code?: string | null;
    year: number;
  };
  incidents: Array<{
    case_no: string;
    employee_name: string;
    job_title: string | null;
    date_of_injury: string;
    where_occurred: string | null;
    description: string | null;
    outcome: "death" | "days_away" | "restricted" | "other";
    days_away_from_work: number;
    days_restricted: number;
    injury_type: "injury" | "skin" | "respiratory" | "poisoning" | "hearing" | "other_illness";
  }>;
}

export function generateOsha300Pdf(input: Osha300Input): PdfDoc {
  const doc = newDoc({ orientation: "landscape", format: "letter" });

  drawHeader(doc, {
    title: `OSHA Form 300 · ${input.establishment.year}`,
    subtitle: "Log of Work-Related Injuries and Illnesses",
    tenantName: input.tenantName,
  });

  drawKeyValueBlock(doc, 40, 112, [
    ["Establishment:", input.establishment.name],
    ["City / State:", [input.establishment.city, input.establishment.state].filter(Boolean).join(", ") || "—"],
    ["NAICS:", input.establishment.naics_code ?? "—"],
    ["Year:", String(input.establishment.year)],
  ], { colWidth: 140, lineHeight: 14 });

  const pageW = doc.internal.pageSize.getWidth();
  const tableX = 40;
  const tableW = pageW - 80;

  drawTable(doc, {
    x: tableX, y: 180,
    fontSize: 8,
    rowHeight: 24,
    columns: [
      { header: "Case #",     key: "case_no",              width: tableW * 0.06 },
      { header: "Employee",   key: "employee_name",         width: tableW * 0.14 },
      { header: "Job Title",  key: "job_title",             width: tableW * 0.12 },
      { header: "Date",       key: "date_of_injury",        width: tableW * 0.08 },
      { header: "Where",      key: "where_occurred",        width: tableW * 0.16 },
      { header: "Description",key: "description",           width: tableW * 0.22 },
      { header: "Outcome",    key: "outcome",               width: tableW * 0.08 },
      { header: "Days Away",  key: "days_away_from_work",   width: tableW * 0.07, align: "right" },
      { header: "Restricted", key: "days_restricted",       width: tableW * 0.07, align: "right" },
    ],
    rows: input.incidents,
    onNewPage: (d) => { drawHeader(d, {
      title: `OSHA Form 300 · ${input.establishment.year} (cont'd)`,
      subtitle: "Log of Work-Related Injuries and Illnesses",
      tenantName: input.tenantName,
    }); return 120; },
  });

  // Totals block
  const totals = input.incidents.reduce(
    (acc, i) => {
      acc.cases += 1;
      acc.daysAway += i.days_away_from_work;
      acc.daysRestricted += i.days_restricted;
      if (i.outcome === "death") acc.deaths += 1;
      return acc;
    },
    { cases: 0, deaths: 0, daysAway: 0, daysRestricted: 0 },
  );

  const totalsY = doc.internal.pageSize.getHeight() - 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Annual Summary", 40, totalsY);
  drawKeyValueBlock(doc, 40, totalsY + 14, [
    ["Total cases:", String(totals.cases)],
    ["Deaths (G):", String(totals.deaths)],
    ["Days away (H):", String(totals.daysAway)],
    ["Days restricted (I):", String(totals.daysRestricted)],
  ], { colWidth: 140, lineHeight: 14 });

  drawFooter(doc, { pageLabel: "OSHA 300" });
  return doc;
}

export async function downloadOsha300Pdf(input: Osha300Input, filename?: string) {
  const doc = generateOsha300Pdf(input);
  downloadPdf(doc, filename ?? `OSHA-300-${input.establishment.year}.pdf`);
}

// ───────────────────────── FORM 301 ─────────────────────────

export interface Osha301Input {
  tenantName?: string;
  case: {
    case_no: string;
    date_of_injury: string;
    time_of_injury?: string;
    time_began_work?: string;
    where_occurred?: string;
    description_before?: string;
    description_injury?: string;
    object_substance?: string;
    date_of_death?: string;
  };
  injured: {
    full_name: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    date_of_birth?: string;
    date_hired?: string;
    sex?: "M" | "F" | "—";
    job_title?: string;
  };
  physician?: {
    name?: string;
    facility?: string;
    facility_address?: string;
    emergency_room?: boolean;
    hospitalized_overnight?: boolean;
  };
  reporter?: {
    name?: string;
    title?: string;
    phone?: string;
    date_completed?: string;
  };
}

export function generateOsha301Pdf(input: Osha301Input): PdfDoc {
  const doc = newDoc({ orientation: "portrait", format: "letter" });

  drawHeader(doc, {
    title: "OSHA Form 301",
    subtitle: "Injury and Illness Incident Report",
    tenantName: input.tenantName,
  });

  // Section 1: Information about the employee
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Information about the employee", 40, 112);
  drawKeyValueBlock(doc, 40, 128, [
    ["Full Name:",       input.injured.full_name],
    ["Street:",          input.injured.street ?? "—"],
    ["City / State / ZIP:", [input.injured.city, input.injured.state, input.injured.zip].filter(Boolean).join(" ") || "—"],
    ["Date of Birth:",   input.injured.date_of_birth ?? "—"],
    ["Date Hired:",      input.injured.date_hired ?? "—"],
    ["Sex:",             input.injured.sex ?? "—"],
    ["Job Title:",       input.injured.job_title ?? "—"],
  ], { colWidth: 140 });

  // Section 2: Information about the physician
  doc.setFont("helvetica", "bold");
  doc.text("Information about the physician or other health care professional", 40, 260);
  drawKeyValueBlock(doc, 40, 276, [
    ["Name:",            input.physician?.name ?? "—"],
    ["Facility:",        input.physician?.facility ?? "—"],
    ["Facility Address:", input.physician?.facility_address ?? "—"],
    ["ER Treatment?",    input.physician?.emergency_room ? "Yes" : "No"],
    ["Hospitalized overnight?", input.physician?.hospitalized_overnight ? "Yes" : "No"],
  ], { colWidth: 180 });

  // Section 3: Information about the case
  doc.setFont("helvetica", "bold");
  doc.text("Information about the case", 40, 380);
  drawKeyValueBlock(doc, 40, 396, [
    ["Case Number:",       input.case.case_no],
    ["Date of Injury:",    input.case.date_of_injury],
    ["Time of Injury:",    input.case.time_of_injury ?? "—"],
    ["Time Work Began:",   input.case.time_began_work ?? "—"],
    ["Where Occurred:",    input.case.where_occurred ?? "—"],
  ], { colWidth: 140 });

  // Narrative
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("What was the employee doing just before the incident occurred?", 40, 500);
  doc.setFont("helvetica", "normal");
  doc.text(input.case.description_before ?? "—", 40, 516, { maxWidth: 520 });

  doc.setFont("helvetica", "bold");
  doc.text("What happened? Describe the injury or illness, including parts affected.", 40, 560);
  doc.setFont("helvetica", "normal");
  doc.text(input.case.description_injury ?? "—", 40, 576, { maxWidth: 520 });

  doc.setFont("helvetica", "bold");
  doc.text("What object or substance directly harmed the employee?", 40, 620);
  doc.setFont("helvetica", "normal");
  doc.text(input.case.object_substance ?? "—", 40, 636, { maxWidth: 520 });

  // Reporter
  doc.setFont("helvetica", "bold");
  doc.text("Completed by", 40, 680);
  drawKeyValueBlock(doc, 40, 696, [
    ["Name:",  input.reporter?.name ?? "—"],
    ["Title:", input.reporter?.title ?? "—"],
    ["Phone:", input.reporter?.phone ?? "—"],
    ["Date:",  input.reporter?.date_completed ?? new Date().toISOString().split("T")[0]],
  ], { colWidth: 120 });

  drawFooter(doc, { pageLabel: "OSHA 301" });
  return doc;
}

export async function downloadOsha301Pdf(input: Osha301Input, filename?: string) {
  const doc = generateOsha301Pdf(input);
  downloadPdf(doc, filename ?? `OSHA-301-${input.case.case_no}.pdf`);
}
