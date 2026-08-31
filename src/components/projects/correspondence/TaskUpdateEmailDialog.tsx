/**
 * TaskUpdateEmailDialog — branded task status update with searchable CRM recipients.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { useSavedRecipients } from "@/hooks/useSavedRecipients";
import { buildTaskUpdateHtml } from "@/lib/correspondence/taskUpdateEmail";
import { RecipientsInput } from "./RecipientsInput";

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
  const savedRecipients = useSavedRecipients();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState(`${status === "done" ? "Completed" : "Update"}: ${taskTitle}`);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecipients([]);
    setSubject(`${status === "done" ? "Completed" : "Update"}: ${taskTitle}`);
    setNote("");
  }, [open, status, taskTitle]);

  const send = async () => {
    if (!recipients.length) { toast.error("Choose at least one recipient."); return; }
    const bodyHtml = buildTaskUpdateHtml({ projectName, taskTitle, status, note, date: new Date().toISOString() });
    try {
      await sendEmail.mutateAsync({
        recipients,
        subject: subject.trim() || taskTitle,
        bodyHtml,
        bodyText: `${taskTitle} — ${status === "done" ? "Completed" : "Update"}${note ? `\n\n${note}` : ""}`,
      });
      try { await savedRecipients.rememberAll(recipients); } catch { /* best-effort */ }
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
      setRecipients([]); setNote("");
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
          <Button onClick={send} disabled={sendEmail.isPending || recipients.length === 0}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
