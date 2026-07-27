/**
 * WeeklyStatusReportDialog — wrangle open tasks into a status update, with real
 * choices instead of one fixed shape:
 *   • Report on: the whole project, one specific scope/workstream, or an exact
 *     set of hand-picked tasks (pass `preselectedItems` — e.g. from checkbox
 *     selection in the task list — to skip the scope filter entirely).
 *   • Style: a flowing narrative, or a scannable "task — status: update" list.
 * AI drafts from the raw task list; the draft is always shown as plain editable
 * text before anything is sent — human in the loop.
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
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/hooks/useActionItems";
import { useProjectScopes } from "@/hooks/useProjectScopes";
import { useTaskUpdateDraft } from "@/hooks/useTaskUpdateDraft";
import { useSendEmail } from "@/hooks/useSendEmail";
import { useProjectEmails } from "@/hooks/useProjectEmails";
import { buildStatusReportHtml } from "@/lib/correspondence/statusReportEmail";

const parseRecipients = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
const WHOLE_PROJECT = "__whole__";

export function WeeklyStatusReportDialog({
  open, onOpenChange, projectId, projectName, items, preselectedItems,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectName?: string;
  items: ActionItem[];
  /** Exact tasks to report on (e.g. checkbox-selected in the task list) — when
   *  given, the "Report on" scope filter is skipped and these are used as-is. */
  preselectedItems?: ActionItem[];
}) {
  const isSelection = !!preselectedItems && preselectedItems.length > 0;
  const { data: scopes = [] } = useProjectScopes(projectId);
  const draftUpdate = useTaskUpdateDraft();
  const sendEmail = useSendEmail();
  const projectEmails = useProjectEmails(projectId);
  const [reportOn, setReportOn] = useState(WHOLE_PROJECT);
  const [format, setFormat] = useState<"narrative" | "list">("narrative");
  const [audience, setAudience] = useState<"client" | "internal">("client");
  const [draft, setDraft] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`${projectName ? `${projectName} — ` : ""}Weekly update`);

  const openAll = useMemo(() => items.filter((i) => i.status !== "done" && i.status !== "cancelled"), [items]);
  const scopeName = isSelection || reportOn === WHOLE_PROJECT ? null : scopes.find((s) => s.id === reportOn)?.title ?? null;
  const openItems = useMemo(() => {
    if (isSelection) return preselectedItems!;
    return reportOn === WHOLE_PROJECT ? openAll : openAll.filter((i) => i.scope_id === reportOn);
  }, [isSelection, preselectedItems, openAll, reportOn]);

  const generate = async () => {
    if (!openItems.length) { toast.error(scopeName ? `No open tasks in "${scopeName}".` : "No tasks to report on."); return; }
    try {
      const result = await draftUpdate.mutateAsync({
        project_id: projectId, project_name: projectName, mode: "weekly", audience, format,
        scope_name: scopeName ?? undefined,
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
        <DialogHeader><DialogTitle>Status report</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className={cn("grid gap-2", isSelection ? "grid-cols-1" : "grid-cols-2")}>
            {!isSelection && (
              <div>
                <Label className="text-xs">Report on</Label>
                <Select value={reportOn} onValueChange={setReportOn}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={WHOLE_PROJECT}>Whole project</SelectItem>
                    {scopes.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Style</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "narrative" | "list")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrative">Narrative summary</SelectItem>
                  <SelectItem value="list">Action item list</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isSelection
              ? `${openItems.length} selected task${openItems.length === 1 ? "" : "s"}.`
              : `${openItems.length} open task${openItems.length === 1 ? "" : "s"}${scopeName ? ` in "${scopeName}"` : " across the whole project"}.`}
          </p>

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
