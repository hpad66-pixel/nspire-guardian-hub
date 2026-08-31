/**
 * EmailDocumentDialog — send a finalized/edited letter straight from the Documents
 * workspace with a searchable CRM recipient picker (workspace or project scope).
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { RecipientsInput } from "./RecipientsInput";

export interface DocAttachment { filename: string; contentBase64: string; contentType: string; size: number }

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function EmailDocumentDialog({
  open, onOpenChange, projectId, defaultSubject, attachment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  defaultSubject: string;
  attachment: DocAttachment | null;
}) {
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const savedRecipients = useSavedRecipients();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecipients([]);
    setSubject(defaultSubject);
    setMessage("");
  }, [open, defaultSubject]);

  const send = async () => {
    if (!recipients.length) { toast.error("Choose at least one recipient."); return; }
    if (!subject.trim()) { toast.error("Add a subject."); return; }
    const bodyText = message.trim() || "Please find the attached letter.";
    const bodyHtml = `<p>${escapeHtml(bodyText).replace(/\n/g, "<br/>")}</p>`;
    try {
      await sendEmail.mutateAsync({
        recipients, subject: subject.trim(), bodyHtml, bodyText,
        attachments: attachment ? [attachment] : undefined,
      });
      try { await savedRecipients.rememberAll(recipients); } catch { /* best-effort */ }
      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound", status: "sent", channel: "resend",
          subject: subject.trim(), to_emails: recipients,
          snippet: bodyText.slice(0, 200), body_text: bodyText,
        } as any);
      } catch { /* logging is best-effort */ }
      toast.success(`Sent to ${recipients.join(", ")}.`);
      onOpenChange(false);
      setRecipients([]); setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the email.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Email this letter</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">To</Label>
            <div className="mt-1">
              <RecipientsInput
                value={recipients}
                onChange={setRecipients}
                projectId={projectId}
                placeholder="Search contacts or type email — Enter to add"
              />
            </div>
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
              <Paperclip className="h-3.5 w-3.5" /> {attachment.filename}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sendEmail.isPending || recipients.length === 0}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
