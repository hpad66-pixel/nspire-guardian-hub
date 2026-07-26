/**
 * TaskUpdateEmailDialog — send a client a beautifully branded status update for
 * one task ("this was a task, it's been completed"). Reuses the same mailer +
 * correspondence-logging pattern as EmailDocumentDialog.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { buildTaskUpdateHtml } from "@/lib/correspondence/taskUpdateEmail";

const parseRecipients = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));

export function TaskUpdateEmailDialog({
  open, onOpenChange, projectId, projectName, taskTitle, status,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName?: string | null;
  taskTitle: string;
  status: "done" | "in_progress" | "todo";
}) {
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`${status === "done" ? "Completed" : "Update"}: ${taskTitle}`);
  const [note, setNote] = useState("");

  const send = async () => {
    const recipients = parseRecipients(to);
    if (!recipients.length) { toast.error("Enter at least one valid email address."); return; }
    const bodyHtml = buildTaskUpdateHtml({ projectName, taskTitle, status, note, date: new Date().toISOString() });
    try {
      await sendEmail.mutateAsync({ recipients, subject: subject.trim() || taskTitle, bodyHtml, bodyText: `${taskTitle} — ${status === "done" ? "Completed" : "Update"}${note ? `\n\n${note}` : ""}` });
      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound", status: "sent", channel: "resend",
          subject: subject.trim() || taskTitle, to_emails: recipients,
          snippet: note.slice(0, 200) || `${taskTitle} — ${status === "done" ? "Completed" : "Update"}`,
          body_text: note,
        } as any);
      } catch { /* logging is best-effort */ }
      toast.success(`Update sent to ${recipients.join(", ")}.`);
      onOpenChange(false);
      setTo(""); setNote("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the update.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Send task update to client</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="tu-to" className="text-xs">To</Label>
            <Input id="tu-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" autoFocus />
          </div>
          <div>
            <Label htmlFor="tu-subject" className="text-xs">Subject</Label>
            <Input id="tu-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tu-note" className="text-xs">Note (optional)</Label>
            <Textarea id="tu-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any detail you'd like to add…" rows={4} />
          </div>
          <p className="text-[11px] text-muted-foreground">Sends a branded status card and logs it to this project's correspondence.</p>
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
