/**
 * WeeklyStatusReportDialog — wrangle every currently-open task in a project into
 * one succinct, branded status update. AI drafts from the raw task list; the
 * draft is always shown as plain editable text before anything is sent — human
 * in the loop, same principle as every other AI feature in this app.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ActionItem } from "@/hooks/useActionItems";
import { useTaskUpdateDraft } from "@/hooks/useTaskUpdateDraft";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { buildStatusReportHtml } from "@/lib/correspondence/statusReportEmail";

const parseRecipients = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));

export function WeeklyStatusReportDialog({
  open, onOpenChange, projectId, projectName, items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName?: string;
  items: ActionItem[];
}) {
  const draftUpdate = useTaskUpdateDraft();
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const [audience, setAudience] = useState<"client" | "internal">("client");
  const [draft, setDraft] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`${projectName ? `${projectName} — ` : ""}Weekly update`);

  const openItems = useMemo(() => items.filter((i) => i.status !== "done" && i.status !== "cancelled"), [items]);

  const generate = async () => {
    if (!openItems.length) { toast.error("No open tasks to report on."); return; }
    try {
      const result = await draftUpdate.mutateAsync({
        project_id: projectId, project_name: projectName, mode: "weekly", audience,
        tasks: openItems.map((i) => ({
          title: i.title, description: i.description, status: i.status, priority: i.priority,
          due_date: i.due_date, assignee: i.assignee?.full_name || i.assignee?.email || undefined,
        })),
      });
      setDraft(result.draft);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't draft the update.");
    }
  };

  const send = async () => {
    const recipients = parseRecipients(to);
    if (!recipients.length) { toast.error("Enter at least one valid email address."); return; }
    if (!draft.trim()) { toast.error("Generate or write the update first."); return; }
    const bodyHtml = buildStatusReportHtml({ projectName, body: draft, date: new Date().toISOString(), openCount: openItems.length });
    try {
      await sendEmail.mutateAsync({ recipients, subject: subject.trim() || "Weekly update", bodyHtml, bodyText: draft });
      try {
        await projectEmails.create.mutateAsync({
          direction: "outbound", status: "sent", channel: "resend",
          subject: subject.trim() || "Weekly update", to_emails: recipients,
          snippet: draft.slice(0, 200), body_text: draft,
        } as any);
      } catch { /* logging is best-effort */ }
      toast.success(`Sent to ${recipients.join(", ")}.`);
      onOpenChange(false);
      setTo(""); setDraft("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send the update.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Weekly status report</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{openItems.length} open task{openItems.length === 1 ? "" : "s"} in this project.</p>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Audience</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as "client" | "internal")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client — outcomes only, no internal detail</SelectItem>
                  <SelectItem value="internal">Internal — direct/procedural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={generate} disabled={draftUpdate.isPending || !openItems.length} className="gap-1.5">
              {draftUpdate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />}
              {draft ? "Regenerate" : "Generate draft"}
            </Button>
          </div>

          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Update</Label>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} placeholder="Click Generate draft, or write the update yourself…" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" />
          </div>
          <p className="text-[11px] text-muted-foreground">Sends a branded status card and logs it to this project's correspondence.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={send} disabled={sendEmail.isPending || !draft.trim()}>
            {sendEmail.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
