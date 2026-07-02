import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useProjectScopes, type ProjectScope, type ScopeStatus } from '@/hooks/useProjectScopes';
import { useProjectTeamMembers } from '@/hooks/useProjectTeam';
import { SCOPE_STATUS_META, SCOPE_STATUS_ORDER } from './scopeMeta';

interface ScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  scope?: ProjectScope | null;
}

const UNASSIGNED = '__unassigned__';

export function ScopeDialog({ open, onOpenChange, projectId, scope }: ScopeDialogProps) {
  const { create, update } = useProjectScopes(projectId);
  const { data: team } = useProjectTeamMembers(projectId);
  const isEditing = !!scope;

  const [form, setForm] = useState({
    title: '', description: '', owner_id: UNASSIGNED, status: 'not_started' as ScopeStatus,
    start_date: '', due_date: '', fee_amount: '' as string, pct_complete: 0,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      title: scope?.title ?? '',
      description: scope?.description ?? '',
      owner_id: scope?.owner_id ?? UNASSIGNED,
      status: (scope?.status as ScopeStatus) ?? 'not_started',
      start_date: scope?.start_date ?? '',
      due_date: scope?.due_date ?? '',
      fee_amount: scope?.fee_amount != null ? String(scope.fee_amount) : '',
      pct_complete: scope?.pct_complete != null ? Number(scope.pct_complete) : 0,
    });
  }, [open, scope]);

  const isPending = create.isPending || update.isPending;
  const canSave = !!form.title.trim();

  const handleSave = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      owner_id: form.owner_id === UNASSIGNED ? null : form.owner_id,
      status: form.status,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      fee_amount: form.fee_amount ? Number(form.fee_amount.replace(/[^0-9.]/g, '')) : 0,
      pct_complete: Math.max(0, Math.min(100, Number(form.pct_complete) || 0)),
    };
    try {
      if (isEditing && scope) await update.mutateAsync({ id: scope.id, ...payload });
      else await create.mutateAsync(payload);
      onOpenChange(false);
    } catch { /* toast handled by hook */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit scope' : 'Add scope'}</DialogTitle>
          <DialogDescription>A workstream or deliverable with an owner, fee, and % complete.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="scope-title">Title *</Label>
            <Input id="scope-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Discovery & assessment" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scope-desc">Description</Label>
            <Textarea id="scope-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this workstream covers..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {(team ?? []).map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || 'Team member'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ScopeStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPE_STATUS_ORDER.map((s) => (<SelectItem key={s} value={s}>{SCOPE_STATUS_META[s].label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="scope-fee">Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="scope-fee" className="pl-7" inputMode="decimal" value={form.fee_amount ? new Intl.NumberFormat('en-US').format(Number(form.fee_amount)) : ''} onChange={(e) => setForm({ ...form, fee_amount: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="e.g. 42,000" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scope-pct">% complete: {Math.round(form.pct_complete)}%</Label>
              <input id="scope-pct" type="range" min={0} max={100} step={1} value={form.pct_complete} onChange={(e) => setForm({ ...form, pct_complete: Number(e.target.value) })} className="w-full" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? 'Save scope' : 'Add scope'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
