/**
 * EmailDocumentDialog — send a finalized/edited letter straight from the Documents
 * workspace: Resend delivery (auto-BCC to you) with the letter attached, and the
 * send is logged to the project's correspondence trail as an outbound record.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Paperclip, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";

export interface DocAttachment { filename: string; contentBase64: string; contentType: string; size: number }

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const parseRecipients = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));

export function EmailDocumentDialog({
  open, onOpenChange, projectId, defaultSubject, attachment, staleEditsWarning,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSubject: string;
  attachment: DocAttachment | null;
  /** True when an in-app text edit exists that the attached exact file does NOT include. */
  staleEditsWarning?: boolean;
}) {
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  const send = async () => {
    const recipients = parseRecipients(to);
    if (!recipients.length) { toast.error("Enter at least one valid email address."); return; }
    if (!subject.trim()) { toast.error("Add a subject."); return; }
    const bodyText = message.trim() || "Please find the attached letter.";
    const bodyHtml = `<p>${escapeHtml(bodyText).replace(/\n/g, "<br/>")}</p>`;
    try {
      await sendEmail.mutateAsync({
        recipients, subject: subject.trim(), bodyHtml, bodyText,
        attachments: attachment ? [attachment] : undefined,
      });
      // Log to the correspondence trail as an outbound send.
      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound", status: "sent", channel: "resend",
          subject: subject.trim(), to_emails: recipients,
          snippet: bodyText.slice(0, 200), body_text: bodyText,
        } as any);
      } catch { /* logging is best-effort */ }
      toast.success(`Sent to ${recipients.join(", ")}.`);
      onOpenChange(false);
      setTo(""); setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the email.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Email this letter</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {staleEditsWarning && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>The attached file is the exact original — it does <span className="font-medium">not</span> include your in-app text edits (those can't be converted back into a perfect Word file). To send your edited text with 100% formatting, use “Replace version” with a copy edited in Word/Copilot, then Finalize again.</span>
            </div>
          )}
          <div>
            <Label htmlFor="email-to" className="text-xs">To</Label>
            <Input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com, another@…" autoFocus />
          </div>
          <div>
            <Label htmlFor="email-subject" className="text-xs">Subject</Label>
            <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email-message" className="text-xs">Message</Label>
            <Textarea id="email-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Please find the attached letter…" rows={4} />
          </div>
          {attachment && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" /> {attachment.filename} ({Math.max(1, Math.round(attachment.size / 1024))} KB)
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Sent via the app mailer with a copy BCC'd to you, and logged to this project's correspondence.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sendEmail.isPending}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
