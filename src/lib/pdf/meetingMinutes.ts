/**
 * C5 · Meeting Minutes PDF.
 *
 * Renders a finalized or draft project_meetings row with its attendees and
 * the polished minutes body.
 */
import {
  newDoc, drawHeader, drawFooter, drawKeyValueBlock,
  drawTable, downloadPdf, type PdfDoc,
} from "./index";

export interface MeetingAttendeeForPdf {
  name: string;
  role?: string | null;
  company?: string | null;
}

export interface MeetingForPdf {
  id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  meeting_time?: string | null;
  location?: string | null;
  project_name?: string | null;
  status: string;
  attendees: MeetingAttendeeForPdf[];
  polished_notes?: string | null;
  raw_notes?: string | null;
}

export function generateMeetingMinutesPdf(
  meeting: MeetingForPdf,
  opts?: { tenantName?: string; logoDataUrl?: string },
): PdfDoc {
  const doc = newDoc();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, {
    title: "Meeting Minutes",
    subtitle: meeting.title,
    tenantName: opts?.tenantName,
    logoDataUrl: opts?.logoDataUrl,
  });

  drawKeyValueBlock(doc, 40, 112, [
    ["Project", meeting.project_name ?? "—"],
    ["Type", meeting.meeting_type],
    [
      "When",
      `${meeting.meeting_date}${meeting.meeting_time ? " · " + meeting.meeting_time : ""}`,
    ],
    ["Location", meeting.location ?? "—"],
    ["Status", meeting.status],
  ], { colWidth: 140 });

  let y = 200;

  if (meeting.attendees.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Attendees · ${meeting.attendees.length}`, 40, y);
    y += 6;
    y = drawTable(doc, {
      x: 40, y,
      columns: [
        { header: "Name", key: "name", width: 180 },
        { header: "Role", key: "role", width: 150, fmt: (v) => v ?? "—" },
        { header: "Company", key: "company", width: 180, fmt: (v) => v ?? "—" },
      ],
      rows: meeting.attendees,
    }) + 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Minutes", 40, y);
  y += 14;

  const body = meeting.polished_notes ?? meeting.raw_notes ?? "(No minutes recorded.)";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(body, pageW - 80);
  let cursor = 0;
  while (cursor < lines.length) {
    const remaining = pageH - 80 - y;
    const linesThatFit = Math.max(1, Math.floor(remaining / 12));
    const slice = lines.slice(cursor, cursor + linesThatFit);
    doc.text(slice, 40, y);
    y += slice.length * 12;
    cursor += slice.length;
    if (cursor < lines.length) {
      doc.addPage();
      y = 60;
    }
  }

  drawFooter(doc);
  return doc;
}

export function downloadMeetingMinutesPdf(
  meeting: MeetingForPdf,
  opts?: { tenantName?: string; logoDataUrl?: string },
) {
  const doc = generateMeetingMinutesPdf(meeting, opts);
  downloadPdf(doc, `minutes-${meeting.meeting_date}-${meeting.title.slice(0, 24).replace(/\s+/g, "-")}.pdf`);
}
