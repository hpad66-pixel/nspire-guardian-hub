/**
 * C1 · RFI PDF export.
 *
 * Renders an RFI with its question, metadata, and the full response thread.
 * Follows the same header/footer chrome as the other Procore Lite exports.
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock,
  downloadPdf, type PdfDoc,
} from "./index";

export interface RfiForPdf {
  id: string;
  rfi_number: string;
  subject?: string | null;
  question: string | null;
  stage: string | null;
  date_initiated?: string | null;
  due_date?: string | null;
  drawing_number?: string | null;
  schedule_impact_days?: number | null;
  cost_impact_cents?: number | null;
  project_name?: string | null;
  spec_section_label?: string | null;
}

export interface RfiResponseForPdf {
  body: string;
  author?: string | null;
  created_at: string;
  is_official?: boolean | null;
}

export function generateRfiPdf(
  rfi: RfiForPdf,
  responses: RfiResponseForPdf[],
  opts?: { tenantName?: string; logoDataUrl?: string },
): PdfDoc {
  const doc = newDoc();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, {
    title: `RFI ${rfi.rfi_number}`,
    subtitle: rfi.subject ?? rfi.project_name ?? "Request for Information",
    tenantName: opts?.tenantName,
    logoDataUrl: opts?.logoDataUrl,
  });

  drawKeyValueBlock(doc, 40, 112, [
    ["Stage", rfi.stage ?? "—"],
    ["Initiated", rfi.date_initiated ?? "—"],
    ["Due", rfi.due_date ?? "—"],
    ["Drawing #", rfi.drawing_number ?? "—"],
    ["Spec Section", rfi.spec_section_label ?? "—"],
    ["Schedule Impact", `${rfi.schedule_impact_days ?? 0} day(s)`],
    [
      "Cost Impact",
      new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD",
      }).format((rfi.cost_impact_cents ?? 0) / 100),
    ],
  ], { colWidth: 140 });

  let y = 228;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Question", 40, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const questionLines = doc.splitTextToSize(rfi.question ?? "(no question)", pageW - 80);
  doc.text(questionLines, 40, y);
  y += (questionLines.length * 12) + 18;

  if (responses.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Response thread — ${responses.length}`, 40, y);
    y += 14;

    for (const r of responses) {
      if (y > pageH - 80) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(60);
      const heading = `${r.author ?? "Unknown"} · ${new Date(r.created_at).toLocaleString()}` +
                      (r.is_official ? "  · OFFICIAL RESPONSE" : "");
      doc.text(heading, 40, y);
      doc.setTextColor(0);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(r.body, pageW - 80);
      doc.text(lines, 40, y);
      y += (lines.length * 12) + 12;

      doc.setDrawColor(235);
      doc.line(40, y - 6, pageW - 40, y - 6);
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(140);
    doc.text("No responses recorded yet.", 40, y);
    doc.setTextColor(0);
  }

  drawFooter(doc);
  return doc;
}

export function downloadRfiPdf(
  rfi: RfiForPdf,
  responses: RfiResponseForPdf[],
  opts?: { tenantName?: string; logoDataUrl?: string },
) {
  const doc = generateRfiPdf(rfi, responses, opts);
  downloadPdf(doc, `RFI-${rfi.rfi_number}.pdf`);
}
