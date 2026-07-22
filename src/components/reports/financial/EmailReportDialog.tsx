/**
 * EmailReportDialog — email the currently-selected financial report as a branded
 * PDF attachment. Rasterizes the on-screen report node (same output as the
 * "Export branded PDF" button) and sends via the shared send-email function. A
 * copy is auto-BCC'd to the sender.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSendEmail } from "@/hooks/useSendEmail";
import { reportPdfBase64 } from "@/lib/reports/reportPdf";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseEmails(s: string): string[] {
  return s.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => EMAIL_RE.test(x));
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function EmailReportDialog({
  open, onOpenChange, reportTitle, defaultSubject, filename, getNode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportTitle: string;
  defaultSubject: string;
  filename: string;
  getNode: () => HTMLElement | null;
}) {
  const sendEmail = useSendEmail();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-seed the subject each time the dialog opens (the report may have changed).
  useEffect(() => { if (open) setSubject(defaultSubject); }, [open, defaultSubject]);

  async function send() {
    const recipients = parseEmails(to);
    if (!recipients.length) { toast.error("Add at least one valid recipient email."); return; }
    const node = getNode();
    if (!node) { toast.error("The report isn't ready to export yet — reopen it and try again."); return; }
    setBusy(true);
    const t = toast.loading("Building the branded PDF and sending…");
    try {
      const { base64, size } = await reportPdfBase64(node);
      const note = message.trim()
        ? escapeHtml(message).replace(/\n/g, "<br>")
        : `Please find attached the <strong>${escapeHtml(reportTitle)}</strong>.`;
      const bodyHtml = `<p>${note}</p><p style="color:#878581;font-size:12px">Attached: ${escapeHtml(filename)}</p>`;
      await sendEmail.mutateAsync({
        recipients,
        ccRecipients: parseEmails(cc),
        subject: subject.trim() || defaultSubject,
        bodyHtml,
        bodyText: message.trim() || `Please find attached the ${reportTitle}.`,
        attachments: [{ filename, contentBase64: base64, contentType: "application/pdf", size }],
      });
      toast.success(`${reportTitle} emailed to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.`, { id: t });
      onOpenChange(false);
      setTo(""); setCc(""); setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send the report.", { id: t });
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email report</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Sends <span className="font-medium text-foreground">{reportTitle}</span> as a branded PDF attachment. A copy is BCC&apos;d to you.
        </p>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="rpt-to">To</Label>
            <Input id="rpt-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com, other@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rpt-cc">Cc <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Input id="rpt-cc" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rpt-subject">Subject</Label>
            <Input id="rpt-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rpt-msg">Message <span className="text-xs text-muted-foreground">(optional)</span></Label>
            <Textarea id="rpt-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add a short note…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={send} disabled={busy || sendEmail.isPending}>{busy ? "Sending…" : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
