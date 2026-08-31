/**
 * DocumentTasksPanel — tasks tied to one document. Assign to internal team OR
 * project CRM contacts (same model as QuickAssignDialog).
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useActionItemsByProject, useCreateActionItem, useUpdateActionItem } from "@/hooks/useActionItems";
import { useProjectTeamMembers } from "@/hooks/useProjectTeam";
import { useProjectContacts } from "@/hooks/useProjectPeople";
import { TaskUpdateEmailDialog } from "./TaskUpdateEmailDialog";

const LINKED_TYPE = "authored_document";
const UNASSIGNED = "__unassigned__";
const contactKey = (id: string) => `contact:${id}`;
const userKey = (id: string) => `user:${id}`;

export function DocumentTasksPanel({ documentId, projectId, projectName }: { documentId: string; projectId: string; projectName?: string | null }) {
  const { data: items = [], isLoading } = useActionItemsByProject(projectId);
  const { data: team = [] } = useProjectTeamMembers(projectId);
  const { data: contacts = [] } = useProjectContacts(projectId);
  const create = useCreateActionItem(projectId);
  const update = useUpdateActionItem(projectId);

  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(UNASSIGNED);
  const [emailTarget, setEmailTarget] = useState<{ id: string; title: string; status: "done" | "in_progress" | "todo" } | null>(null);

  const tasks = useMemo(
    () => items.filter((i) => i.linked_entity_type === LINKED_TYPE && i.linked_entity_id === documentId),
    [items, documentId],
  );

  const addTask = () => {
    const t = title.trim();
    if (!t) return;
    const assignedUserId = assignee.startsWith("user:") ? assignee.slice("user:".length) : null;
    const assignedContactId = assignee.startsWith("contact:") ? assignee.slice("contact:".length) : null;
    create.mutate(
      {
        title: t,
        assigned_to: assignedUserId,
        assigned_contact_id: assignedContactId,
        linked_entity_type: LINKED_TYPE,
        linked_entity_id: documentId,
      },
      { onSuccess: () => { setTitle(""); setAssignee(UNASSIGNED); }, onError: (e: any) => toast.error(e?.message ?? "Couldn't add task.") },
    );
  };

  const toggleDone = (id: string, done: boolean, previous_assigned_to: string | null) => {
    update.mutate({ id, status: done ? "done" : "todo", previous_assigned_to } as any);
  };

  const nameFor = (task: (typeof tasks)[number]) => {
    if (task.assignedContact) {
      return task.assignedContact.full_name || task.assignedContact.email || "Contact";
    }
    if (!task.assigned_to) return null;
    const m = team.find((t) => t.user_id === task.assigned_to);
    return m?.profile?.full_name || m?.profile?.email || null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium"><CheckSquare className="h-4 w-4" /> Tasks</div>

      <div className="flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Add a task for this document…" className="flex-1 min-w-[200px] h-9" />
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Assign to" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {team.length > 0 && (
              <SelectGroup>
                <SelectLabel>Internal team</SelectLabel>
                {team.map((m) => (
                  <SelectItem key={m.user_id} value={userKey(m.user_id)}>
                    {m.profile?.full_name || m.profile?.email || "Team member"}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {contacts.length > 0 && (
              <SelectGroup>
                <SelectLabel>Project contacts (CRM)</SelectLabel>
                {contacts.map((c) => (
                  <SelectItem key={c.contactId} value={contactKey(c.contactId)} disabled={!c.email}>
                    {c.name}{c.email ? "" : " · no email"}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" onClick={addTask} disabled={!title.trim() || create.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No tasks yet — add one above. Assign to team or CRM contacts.</p>
      ) : (
        <Card><CardContent className="p-0 divide-y">
          {tasks.map((t) => {
            const done = t.status === "done";
            const owner = nameFor(t);
            return (
              <div key={t.id} className="flex items-center gap-2.5 px-3 py-2">
                <Checkbox checked={done} onCheckedChange={(v) => toggleDone(t.id, Boolean(v), t.assigned_to)} />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  {owner && <div className="text-xs text-muted-foreground">{owner}{t.assigned_contact_id ? " · CRM" : ""}</div>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0" onClick={() => setEmailTarget({ id: t.id, title: t.title, status: done ? "done" : "in_progress" })} title="Send a branded update to the client">
                  <Mail className="h-3.5 w-3.5 mr-1" /> Update
                </Button>
              </div>
            );
          })}
        </CardContent></Card>
      )}

      {emailTarget && (
        <TaskUpdateEmailDialog
          open={Boolean(emailTarget)}
          onOpenChange={(v) => !v && setEmailTarget(null)}
          projectId={projectId}
          projectName={projectName}
          taskTitle={emailTarget.title}
          status={emailTarget.status}
        />
      )}
    </div>
  );
}
