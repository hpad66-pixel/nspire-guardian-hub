import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Send, Printer, Mail, Loader2, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useUpdateActionItem, useDeleteActionItem, useActionItemComments, useCreateActionItemComment,
  type ActionItem,
} from '@/hooks/useActionItems';
import { useSendEmail } from '@/hooks/useSendEmail';
import { useClickUpStatus, usePushToClickUp } from '@/hooks/useClickUp';
import type { ProjectScope } from '@/hooks/useProjectScopes';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';
import { buildTaskHtml, printTaskHtml } from '@/lib/actionItems/taskDocument';
import { STATUS_META, STATUS_ORDER, PRIORITY_META, PRIORITY_ORDER } from './actionItemMeta';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item: ActionItem | null;
  scopes: ProjectScope[];
  team: ProjectTeamMember[];
  projectName?: string;
}

const UNASSIGNED = '__unassigned__';
const NO_SCOPE = '__no_scope__';

export function ActionItemDetailDialog({ open, onOpenChange, projectId, item, scopes, team, projectName }: Props) {
  const update = useUpdateActionItem(projectId);
  const del = useDeleteActionItem(projectId);
  const { data: comments } = useActionItemComments(open && item ? item.id : null);
  const createComment = useCreateActionItemComment();
  const sendEmail = useSendEmail();
  const { data: clickup } = useClickUpStatus();
  const pushClickUp = usePushToClickUp();

  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailNote, setEmailNote] = useState('');
  useEffect(() => {
    if (item) {
      setDesc(item.description ?? '');
      setEmailTo(item.assignee?.email ?? '');
      setEmailNote('');
      setEmailOpen(false);
    }
  }, [item, open]);

  if (!item) return null;

  const scopeName = scopes.find((s) => s.id === item.scope_id)?.title ?? null;
  const assigneeName = item.assignee?.full_name || item.assignee?.email || null;

  const taskHtml = (note?: string) => buildTaskHtml({
    title: item.title, description: item.description, status: item.status, priority: item.priority,
    dueDate: item.due_date, assigneeName, projectName, scopeName, note: note ?? null,
  });

  const handlePrint = () => printTaskHtml(taskHtml());

  const handleSendEmail = async () => {
    const to = emailTo.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!to.length) return;
    try {
      await sendEmail.mutateAsync({
        recipients: to,
        subject: `Action item: ${item.title}`,
        bodyHtml: taskHtml(emailNote.trim() || undefined),
      });
      setEmailOpen(false);
    } catch { /* toast handled by useSendEmail */ }
  };

  const patch = (updates: Record<string, unknown>) =>
    update.mutate({ id: item.id, previous_assigned_to: item.assigned_to, ...updates } as never);

  const commenterName = (uid: string) => {
    const c = comments?.find((x) => x.created_by === uid)?.creator;
    return c?.full_name || c?.email || 'Someone';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="pr-6">{item.title}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={item.status} onValueChange={(v) => patch({ status: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={item.priority} onValueChange={(v) => patch({ priority: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITY_ORDER.map((p) => <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Owner</Label>
              <Select value={item.assigned_to ?? UNASSIGNED} onValueChange={(v) => patch({ assigned_to: v === UNASSIGNED ? null : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {team.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || 'Team member'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Due date</Label>
              <Input type="date" className="h-9" value={item.due_date ?? ''} onChange={(e) => patch({ due_date: e.target.value || null })} />
            </div>
            <div className="grid gap-1.5 col-span-2">
              <Label className="text-xs">Scope</Label>
              <Select value={item.scope_id ?? NO_SCOPE} onValueChange={(v) => patch({ scope_id: v === NO_SCOPE ? null : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SCOPE}>No scope</SelectItem>
                  {scopes.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => { if (desc !== (item.description ?? '')) patch({ description: desc || null }); }} placeholder="Add detail…" />
          </div>

          <div className="border-t pt-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Updates</div>
            <div className="space-y-2 mb-3 max-h-52 overflow-y-auto">
              {(comments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No updates yet. Post one below.</p>}
              {(comments ?? []).map((c) => (
                <div key={c.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{commenterName(c.created_by)}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-foreground/90 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Textarea rows={1} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment or update…" className="min-h-9" />
              <Button size="icon" disabled={!comment.trim() || createComment.isPending} onClick={() => { createComment.mutate({ actionItemId: item.id, content: comment.trim() }); setComment(''); }}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {emailOpen && (
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs">Email this task</Label>
              <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="name@example.com, teammate@example.com" className="h-9" />
              <Textarea rows={2} value={emailNote} onChange={(e) => setEmailNote(e.target.value)} placeholder="Add a note (optional)…" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEmailOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSendEmail} disabled={sendEmail.isPending || !emailTo.trim()} className="gap-1.5">
                  {sendEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { del.mutate(item.id); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
            <div className="flex items-center gap-2">
              {clickup?.connected && (
                <Button variant="outline" size="sm" onClick={() => pushClickUp.mutate(item.id)} disabled={pushClickUp.isPending} className="gap-1.5">
                  {pushClickUp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {item.clickup_task_id ? 'Update in ClickUp' : 'Push to ClickUp'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5"><Printer className="h-4 w-4" />Print</Button>
              <Button variant="outline" size="sm" onClick={() => setEmailOpen((v) => !v)} className="gap-1.5"><Mail className="h-4 w-4" />Email</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
