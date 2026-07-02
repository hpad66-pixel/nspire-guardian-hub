import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useUpdateActionItem, useDeleteActionItem, useActionItemComments, useCreateActionItemComment,
  type ActionItem,
} from '@/hooks/useActionItems';
import type { ProjectScope } from '@/hooks/useProjectScopes';
import type { ProjectTeamMember } from '@/hooks/useProjectTeam';
import { STATUS_META, STATUS_ORDER, PRIORITY_META, PRIORITY_ORDER } from './actionItemMeta';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item: ActionItem | null;
  scopes: ProjectScope[];
  team: ProjectTeamMember[];
}

const UNASSIGNED = '__unassigned__';
const NO_SCOPE = '__no_scope__';

export function ActionItemDetailDialog({ open, onOpenChange, projectId, item, scopes, team }: Props) {
  const update = useUpdateActionItem(projectId);
  const del = useDeleteActionItem(projectId);
  const { data: comments } = useActionItemComments(open && item ? item.id : null);
  const createComment = useCreateActionItemComment();

  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  useEffect(() => { if (item) setDesc(item.description ?? ''); }, [item, open]);

  if (!item) return null;

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

          <div className="flex justify-between border-t pt-3">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { del.mutate(item.id); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
