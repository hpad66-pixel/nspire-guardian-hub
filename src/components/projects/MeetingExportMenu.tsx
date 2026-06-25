/**
 * Reusable Print / Download PDF / Email control for a single meeting's minutes.
 * Renders a compact dropdown plus a hidden branded printable (PrintableMeetingMinutes)
 * scoped by a unique element id, so it can be dropped onto every row of a meetings list.
 */
import { useState } from "react";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { useSendReportEmail } from "@/hooks/useReportEmails";
import { generatePDF, generatePDFBase64, printReport } from "@/lib/generatePDF";
import { PrintableMeetingMinutes, type MeetingMinutesAttendee } from "./PrintableMeetingMinutes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  polished_notes?: string | null;
  raw_notes?: string | null;
}

export function MeetingExportMenu({
  meeting, projectId, projectName, triggerVariant = "icon",
}: {
  meeting: MeetingForExport;
  projectId: string;
  projectName: string;
  triggerVariant?: "icon" | "button";
}) {
  const { data: branding } = useCompanyBranding();
  const sendEmail = useSendReportEmail();
  const [busy, setBusy] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  const exportId = `meeting-export-${meeting.id}`;
  const fileBase = `minutes-${meeting.meeting_date}-${(meeting.title || "meeting").slice(0, 24).replace(/\s+/g, "-")}`;

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e?.message || "Export failed"); }
    finally { setBusy(false); }
  }

  const handlePrint = () => withBusy(() => printReport(exportId));
  const handlePdf = () => withBusy(() => generatePDF({ filename: `${fileBase}.pdf`, elementId: exportId, scale: 2 }));

  async function handleEmail() {
    if (!emailTo.trim()) { toast.error("Enter a recipient email."); return; }
    try {
      const pdfBase64 = await generatePDFBase64({ elementId: exportId, scale: 2 });
      await sendEmail.mutateAsync({
        recipients: [emailTo.trim()],
        subject: `Meeting minutes — ${meeting.title} · ${projectName}`,
        reportType: "daily_report",
        reportId: meeting.id,
        propertyName: projectName,
        inspectorName: branding?.company_name ?? "APAS Consulting",
        inspectionDate: meeting.meeting_date,
        pdfBase64,
        pdfFilename: `${fileBase}.pdf`,
        projectId,
      });
      toast.success("Minutes emailed.");
      setEmailOpen(false); setEmailTo("");
    } catch (e: any) { toast.error(e?.message || "Could not send email."); }
  }

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

      {/* Hidden branded export source */}
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
            body={meeting.polished_notes ?? meeting.raw_notes ?? null}
            projectName={projectName}
            companyName={branding?.company_name ?? "APAS Consulting"}
            logoUrl={branding?.logo_url ?? null}
            brandAddress={[branding?.address_line1, branding?.address_line2].filter(Boolean).join(", ") || null}
            brandPhone={branding?.phone ?? null}
            brandEmail={branding?.email ?? null}
            brandWebsite={branding?.website ?? null}
          />
        </div>
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Email meeting minutes</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Recipient email</Label>
            <Input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com" />
            <p className="text-xs text-muted-foreground">A branded PDF of these minutes will be attached.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleEmail} disabled={sendEmail.isPending || !emailTo.trim()}>
              {sendEmail.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Mail className="h-4 w-4 mr-2" /> Send</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
