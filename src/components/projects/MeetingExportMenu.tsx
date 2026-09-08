/**
 * Print / Download PDF / Email control for a single meeting's minutes.
 * - layout="inline"  → three prominent buttons (used at the top of the editor)
 * - layout="menu"    → compact dropdown (used on list rows)
 * Email sends a BRANDED HTML body (the minutes, inline-styled for email clients)
 * plus the PDF attached, via the generic send-email function. All three actions
 * render from one hidden PrintableMeetingMinutes so they stay identical.
 */
import { useState } from "react";
import { format } from "date-fns";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { generatePDF, generatePDFBase64, printReport } from "@/lib/generatePDF";
import { PrintableMeetingMinutes, type MeetingMinutesAttendee } from "./PrintableMeetingMinutes";
import { BrandedReportEmailDialog, type PreparedReportDelivery } from "@/components/reports/BrandedReportEmailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Printer, Download, Mail, MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface MeetingForExport {
  id: string;
  title: string;
  meeting_type: string;
  meeting_date: string;
  meeting_time?: string | null;
  location?: string | null;
  status: string;
  attendees?: MeetingMinutesAttendee[] | null;
  /** Formatted HTML minutes — preferred so the export keeps headings, lists and tables. */
  polished_notes_html?: string | null;
  polished_notes?: string | null;
  raw_notes?: string | null;
}

const INK = "#15233B", SAPPHIRE = "#1D6FE8", GOLD = "#C9A227", MUTED = "#6B7280", LINE = "#E5E7EB";

/** Inject inline styles into the minutes HTML so tables/lists render in email
 *  clients (which strip <style> blocks and most class-based CSS). */
function inlineForEmail(html: string): string {
  return (html || "")
    .replace(/<h2>/g, `<h2 style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:${INK};border-bottom:2px solid ${SAPPHIRE};padding-bottom:4px;margin:18px 0 8px;">`)
    .replace(/<h3>/g, `<h3 style="font-size:13px;font-weight:bold;color:${INK};margin:12px 0 4px;">`)
    .replace(/<p>/g, `<p style="margin:0 0 8px;">`)
    .replace(/<ul>/g, `<ul style="margin:0 0 11px;padding-left:20px;">`)
    .replace(/<ol>/g, `<ol style="margin:0 0 11px;padding-left:20px;">`)
    .replace(/<li>/g, `<li style="margin:0 0 5px;">`)
    .replace(/<table>/g, `<table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:12px;">`)
    .replace(/<th>/g, `<th style="background:#EEF1F6;border:1px solid #C9D1DE;padding:7px 9px;text-align:left;font-weight:bold;color:${INK};">`)
    .replace(/<td>/g, `<td style="border:1px solid ${LINE};padding:7px 9px;vertical-align:top;">`)
    .replace(/<strong>/g, `<strong style="font-weight:bold;color:${INK};">`);
}

function safeDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  return isNaN(d.getTime()) ? "" : format(d, "PPP");
}

export function MeetingExportMenu({
  meeting, projectId, projectName, triggerVariant = "icon", layout = "menu",
}: {
  meeting: MeetingForExport;
  projectId: string;
  projectName: string;
  triggerVariant?: "icon" | "button";
  layout?: "menu" | "inline";
}) {
  const { data: branding } = useCompanyBranding();
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const companyName = branding?.company_name ?? "APAS Consulting";
  const exportId = `meeting-export-${meeting.id}`;
  const fileBase = `minutes-${meeting.meeting_date}-${(meeting.title || "meeting").slice(0, 24).replace(/\s+/g, "-")}`;
  const minutesHtml = meeting.polished_notes_html ?? meeting.polished_notes ?? meeting.raw_notes ?? "";

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e?.message || "Export failed"); }
    finally { setBusy(false); }
  }

  const handlePrint = () => withBusy(() => printReport(exportId));
  const handlePdf = () => withBusy(() => generatePDF({ filename: `${fileBase}.pdf`, elementId: exportId, scale: 2 }));

  function buildEmailHtml(personalMessage = ""): string {
    const dateBits = [safeDate(meeting.meeting_date), meeting.meeting_time, meeting.location].filter(Boolean).join(" | ");
    const contact = [branding?.address_line1, branding?.phone, branding?.email, branding?.website].filter(Boolean).join(" | ");
    const personal = personalMessage
      ? `<div style="margin:0 0 18px;border-left:4px solid ${GOLD};background:#FFF9E8;padding:13px 15px;color:#4B452F;font:14px/1.6 Arial,sans-serif;">${personalMessage.replace(/[—–‑]/g, "-").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>`
      : "";
    return `
      <div style="font-family:Georgia,'Times New Roman',serif;max-width:680px;margin:0 auto;color:${INK};background:#ffffff;">
        <div style="border-top:6px solid ${GOLD};padding:20px 28px 10px;">
          <div style="font-size:20px;font-weight:bold;color:${INK};">${companyName}</div>
          ${contact ? `<div style="font-size:11px;color:${MUTED};margin-top:3px;">${contact}</div>` : ""}
          <div style="height:2px;background:${SAPPHIRE};margin-top:11px;"></div>
        </div>
        <div style="padding:12px 28px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${GOLD};font-weight:bold;">${projectName}</div>
          <h1 style="font-size:22px;font-weight:bold;margin:4px 0 0;color:${INK};">${meeting.title}</h1>
          <div style="font-size:12px;color:${MUTED};margin-top:5px;">${dateBits}</div>
        </div>
        <div style="padding:8px 28px 24px;font-size:13px;line-height:1.6;color:${INK};">
          ${personal}
          ${inlineForEmail(minutesHtml)}
        </div>
        <div style="border-top:1px solid ${LINE};padding:12px 28px;font-size:11px;color:${MUTED};">
          ${companyName} - Meeting Minutes. A formatted PDF copy is attached.
        </div>
      </div>`;
  }

  async function prepareEmailDelivery(personalMessage: string): Promise<PreparedReportDelivery> {
    const pdfBase64 = await generatePDFBase64({ elementId: exportId, scale: 1.35 });
    const bodyText = [
      personalMessage,
      `MEETING MINUTES - ${meeting.title}`,
      `Project: ${projectName}`,
      [safeDate(meeting.meeting_date), meeting.meeting_time, meeting.location].filter(Boolean).join(" | "),
      "The complete minutes are included in this email and attached as a formatted PDF.",
    ].filter(Boolean).join("\n\n").replace(/[—–‑]/g, "-");
    return { bodyHtml: buildEmailHtml(personalMessage), bodyText, pdfBase64, pdfSize: Math.round(pdfBase64.length * 0.75) };
  }

  const hidden = (
    <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
      <div id={exportId}>
        <PrintableMeetingMinutes
          id={meeting.id}
          title={meeting.title}
          meetingType={meeting.meeting_type}
          meetingDate={meeting.meeting_date}
          meetingTime={meeting.meeting_time ?? null}
          location={meeting.location ?? null}
          status={meeting.status}
          attendees={meeting.attendees ?? []}
          body={minutesHtml}
          projectName={projectName}
          companyName={companyName}
          logoUrl={branding?.logo_url ?? null}
          brandAddress={[branding?.address_line1, branding?.address_line2].filter(Boolean).join(", ") || null}
          brandPhone={branding?.phone ?? null}
          brandEmail={branding?.email ?? null}
          brandWebsite={branding?.website ?? null}
        />
      </div>
    </div>
  );

  const emailDialog = (
    <BrandedReportEmailDialog
      open={emailOpen}
      onOpenChange={setEmailOpen}
      reportTitle={meeting.title}
      projectName={projectName}
      filename={`${fileBase}.pdf`}
      defaultSubject={`Meeting minutes - ${meeting.title} | ${projectName}`}
      defaultMessage="Please review the meeting minutes and advise if any correction is needed."
      projectId={projectId}
      sourceModule="project-meetings"
      reportType="meeting_minutes"
      prepareDelivery={prepareEmailDelivery}
      dialogTitle="Email the client-ready meeting minutes"
      htmlDescription="The complete minutes are readable directly in the message."
    />
  );

  // ── Inline: prominent Print / PDF / Email buttons ─────────────────────────
  if (layout === "inline") {
    return (
      <>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-9 px-2.5 text-xs" onClick={handlePrint} disabled={busy} aria-label="Print">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">Print</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-2.5 text-xs" onClick={handlePdf} disabled={busy} aria-label="Download PDF">
            <Download className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">PDF</span>
          </Button>
          <Button size="sm" className="h-9 px-2.5 text-xs" onClick={() => setEmailOpen(true)} disabled={busy} aria-label="Email">
            <Mail className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Email</span>
          </Button>
        </div>
        {hidden}
        {emailDialog}
      </>
    );
  }

  // ── Menu: compact dropdown (list rows) ────────────────────────────────────
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {triggerVariant === "icon" ? (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy} aria-label="Export minutes">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
              Export
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</DropdownMenuItem>
          <DropdownMenuItem onClick={handlePdf}><Download className="h-4 w-4 mr-2" /> Download PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmailOpen(true)}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {hidden}
      {emailDialog}
    </>
  );
}
