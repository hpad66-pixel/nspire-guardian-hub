/**
 * C5 · MeetingRunPage — live minute-taking surface for a single meeting.
 *
 * Features:
 *   - Header with date/time/location/attendees (count).
 *   - Two-column layout: agenda/attendees panel + the raw notes editor.
 *   - Status transitions (draft → reviewed → finalized) via the hook.
 *   - One-click "Download minutes" using the meetingMinutes PDF generator.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useProjectMeetings } from "@/hooks/useProjectMeetings";
import { useProject } from "@/hooks/useProjects";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import { generatePDF, generatePDFBase64, printReport } from "@/lib/generatePDF";
import { useSendReportEmail } from "@/hooks/useReportEmails";
import { PrintableMeetingMinutes } from "@/components/projects/PrintableMeetingMinutes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Download, ArrowLeft, CheckCheck, Lock, Printer, Mail, Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const MEETING_EXPORT_ID = "meeting-minutes-export";

export default function MeetingRunPage() {
  const { projectId = "", meetingId = "" } = useParams();
  const navigate = useNavigate();
  const { meetings, isLoading, updateMeeting, finalizeMeeting } =
    useProjectMeetings(projectId);
  const { data: project } = useProject(projectId || null);
  const { data: branding } = useCompanyBranding();
  const sendEmail = useSendReportEmail();

  const meeting = meetings.find((m) => m.id === meetingId);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "print">(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  useEffect(() => {
    if (meeting) {
      setNotes(meeting.polished_notes ?? meeting.raw_notes ?? "");
      setDirty(false);
    }
  }, [meeting?.id, meeting?.polished_notes, meeting?.raw_notes, meeting]);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading meeting…</div>;
  }
  if (!meeting) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Meeting not found.</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate(`/projects/${projectId}/meetings`)}>
          Back to meetings
        </Button>
      </div>
    );
  }

  const isFinalized = meeting.status === "finalized";

  async function handleSave(advance?: "reviewed" | "finalized") {
    try {
      const patch: any = { id: meeting.id, polished_notes: notes };
      if (advance === "reviewed") patch.status = "reviewed";
      if (advance === "finalized") {
        await finalizeMeeting.mutateAsync(meeting.id);
      } else {
        await updateMeeting.mutateAsync(patch);
      }
      setDirty(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const fileBase = `minutes-${meeting.meeting_date}-${(meeting.title || "meeting").slice(0, 24).replace(/\s+/g, "-")}`;

  async function handlePdf() {
    setBusy("pdf");
    try {
      await generatePDF({ filename: `${fileBase}.pdf`, elementId: MEETING_EXPORT_ID, scale: 2 });
    } catch (e: any) { toast.error(e?.message || "Could not generate PDF"); }
    finally { setBusy(null); }
  }

  async function handlePrint() {
    setBusy("print");
    try { await printReport(MEETING_EXPORT_ID); }
    catch (e: any) { toast.error(e?.message || "Could not print"); }
    finally { setBusy(null); }
  }

  async function handleEmail() {
    if (!emailTo.trim()) { toast.error("Enter a recipient email."); return; }
    try {
      const pdfBase64 = await generatePDFBase64({ elementId: MEETING_EXPORT_ID, scale: 2 });
      await sendEmail.mutateAsync({
        recipients: [emailTo.trim()],
        subject: `Meeting minutes — ${meeting.title} · ${project?.name ?? "Project"}`,
        reportType: "daily_report",
        reportId: meeting.id,
        propertyName: project?.name ?? "Project",
        inspectorName: branding?.company_name ?? "APAS Consulting",
        inspectionDate: meeting.meeting_date,
        pdfBase64,
        pdfFilename: `${fileBase}.pdf`,
        projectId: projectId || undefined,
      });
      toast.success("Minutes emailed.");
      setEmailOpen(false); setEmailTo("");
    } catch (e: any) { toast.error(e?.message || "Could not send email."); }
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/projects/${projectId}/meetings`}
            className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Meetings
          </Link>
          <h1 className="text-3xl font-bold mt-1 truncate">{meeting.title}</h1>
          <div className="text-muted-foreground text-sm mt-1">
            {meeting.meeting_type} · {format(new Date(meeting.meeting_date), "PPP")}
            {meeting.meeting_time && <> · {meeting.meeting_time}</>}
            {meeting.location && <> · {meeting.location}</>}
          </div>
        </div>
        <Badge variant={isFinalized ? "default" : "outline"} className="capitalize">
          {meeting.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <aside className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Attendees · {meeting.attendees?.length ?? 0}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(meeting.attendees?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">No attendees recorded.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {meeting.attendees.map((a, i) => (
                    <li key={i} className="py-1.5">
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[a.role, a.company].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handlePdf} disabled={busy !== null}>
                {busy === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download PDF
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handlePrint} disabled={busy !== null}>
                  {busy === "print" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Printer className="h-4 w-4 mr-1.5" />}
                  Print
                </Button>
                <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={busy !== null}>
                  <Mail className="h-4 w-4 mr-1.5" /> Email
                </Button>
              </div>
              {!isFinalized && (
                <>
                  <Button
                    className="w-full" variant="secondary"
                    disabled={!dirty || updateMeeting.isPending}
                    onClick={() => handleSave()}
                  >
                    {updateMeeting.isPending ? "Saving…" : "Save draft"}
                  </Button>
                  <Button
                    className="w-full" variant="outline"
                    onClick={() => handleSave("reviewed")}
                    disabled={updateMeeting.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-2" /> Mark as reviewed
                  </Button>
                  <Button
                    className="w-full" variant="outline"
                    onClick={() => handleSave("finalized")}
                    disabled={finalizeMeeting.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {finalizeMeeting.isPending ? "Finalizing…" : "Finalize meeting"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        <section className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Minutes
                {dirty && <Badge variant="outline">Unsaved changes</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                rows={20}
                placeholder="Capture discussion, decisions, and action items…"
                disabled={isFinalized}
                className="font-sans"
              />
              {isFinalized && (
                <p className="text-xs text-muted-foreground mt-2">
                  This meeting is finalized — minutes are read-only. Create a new
                  meeting to amend.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Hidden branded export source — used by Print, Download PDF, and Email. */}
      <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden>
        <div id={MEETING_EXPORT_ID}>
          <PrintableMeetingMinutes
            id={meeting.id}
            title={meeting.title}
            meetingType={meeting.meeting_type}
            meetingDate={meeting.meeting_date}
            meetingTime={meeting.meeting_time ?? null}
            location={meeting.location ?? null}
            status={meeting.status}
            attendees={meeting.attendees ?? []}
            body={meeting.polished_notes ?? notes ?? meeting.raw_notes ?? null}
            projectName={project?.name ?? "Project"}
            companyName={branding?.company_name ?? "APAS Consulting"}
            logoUrl={branding?.logo_url ?? null}
            brandAddress={[branding?.address_line1, branding?.address_line2].filter(Boolean).join(", ") || null}
            brandPhone={branding?.phone ?? null}
            brandEmail={branding?.email ?? null}
            brandWebsite={branding?.website ?? null}
          />
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email meeting minutes</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Recipient email</Label>
            <Input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="name@example.com"
            />
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
    </div>
  );
}
