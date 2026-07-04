import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Plus, AlertTriangle, CheckCircle2, Clock, Trash2, Loader2, Repeat } from 'lucide-react';
import { usePermitObligations, FREQ_LABEL, type PermitObligation, type ObligationFrequency } from '@/hooks/usePermitObligations';
import { cn } from '@/lib/utils';

const fmtDate = (s: string | null) => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const daysUntil = (s: string | null) => { if (!s) return null; const d = new Date(s + 'T00:00:00'); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d.getTime() - t.getTime()) / 864e5); };
const FREQS: ObligationFrequency[] = ['one_time', 'monthly', 'quarterly', 'semi_annual', 'annual'];

type Bucket = 'overdue' | 'due_soon' | 'upcoming' | 'done';
const BUCKET: Record<Bucket, { label: string; cls: string; dot: string }> = {
  overdue:  { label: 'Overdue',   cls: 'text-[var(--apas-rose)]',    dot: 'bg-[var(--apas-rose)]' },
  due_soon: { label: 'Due soon (30 days)', cls: 'text-[var(--apas-amber)]', dot: 'bg-[var(--apas-amber)]' },
  upcoming: { label: 'Upcoming',  cls: 'text-[var(--apas-sapphire)]', dot: 'bg-[var(--apas-sapphire)]' },
  done:     { label: 'Complete / waived', cls: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

export function ObligationsPanel({ projectId }: { projectId: string }) {
  const api = usePermitObligations(projectId);
  const items = api.data ?? [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', permit_ref: '', agency: '', frequency: 'quarterly' as ObligationFrequency, next_due_date: '', responsible: '' });

  const bucketOf = (o: PermitObligation): Bucket => {
    if (o.status === 'complete' || o.status === 'waived') return 'done';
    const du = daysUntil(o.next_due_date);
    if (du == null) return 'upcoming';
    if (du < 0) return 'overdue';
    if (du <= 30) return 'due_soon';
    return 'upcoming';
  };

  const grouped = useMemo(() => {
    const g: Record<Bucket, PermitObligation[]> = { overdue: [], due_soon: [], upcoming: [], done: [] };
    for (const o of items) g[bucketOf(o)].push(o);
    return g;
  }, [items]);

  const counts = { overdue: grouped.overdue.length, due_soon: grouped.due_soon.length, upcoming: grouped.upcoming.length, done: grouped.done.length };

  const add = () => {
    if (!form.title.trim()) return;
    api.create.mutate({ ...form, title: form.title.trim(), next_due_date: form.next_due_date || null } as any, {
      onSuccess: () => { setForm({ title: '', permit_ref: '', agency: '', frequency: 'quarterly', next_due_date: '', responsible: '' }); setOpen(false); },
    });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={AlertTriangle} label="Overdue" value={String(counts.overdue)} tone={counts.overdue ? 'text-[var(--apas-rose)]' : undefined} />
        <Stat icon={Clock} label="Due in 30 days" value={String(counts.due_soon)} tone={counts.due_soon ? 'text-[var(--apas-amber)]' : undefined} />
        <Stat icon={CalendarClock} label="Upcoming" value={String(counts.upcoming)} />
        <Stat icon={CheckCircle2} label="Complete" value={String(counts.done)} />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Permit conditions &amp; recurring deadlines for this engagement.</div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add obligation</Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CalendarClock className="mx-auto h-9 w-9 text-muted-foreground mb-3" />
          <p className="font-medium">No obligations tracked yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add permit conditions and recurring deadlines — DMR submittals, quarterly sampling, annual reports — and they roll up here by urgency.</p>
        </div>
      ) : (
        (['overdue', 'due_soon', 'upcoming', 'done'] as Bucket[]).filter((b) => grouped[b].length > 0).map((b) => (
          <div key={b}>
            <div className={cn('mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest', BUCKET[b].cls)}>
              <span className={cn('h-2 w-2 rounded-full', BUCKET[b].dot)} />{BUCKET[b].label}<span className="text-muted-foreground font-normal">· {grouped[b].length}</span>
            </div>
            <div className="space-y-1.5">
              {grouped[b].map((o) => {
                const du = daysUntil(o.next_due_date);
                const done = b === 'done';
                return (
                  <div key={o.id} className={cn('group flex items-start gap-3 rounded-lg border p-3', b === 'overdue' && 'border-[var(--apas-rose)]/30 bg-[var(--apas-rose)]/[0.03]')}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-medium', done && 'text-muted-foreground line-through')}>{o.title}</span>
                        {o.frequency !== 'one_time' && <Badge variant="outline" className="text-[10px] gap-1"><Repeat className="h-3 w-3" />{FREQ_LABEL[o.frequency]}</Badge>}
                        {o.status === 'waived' && <Badge variant="secondary" className="text-[10px]">Waived</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap gap-x-3">
                        {o.permit_ref && <span>{o.permit_ref}</span>}
                        {o.agency && <span>{o.agency}</span>}
                        {o.responsible && <span>Owner: {o.responsible}</span>}
                        {o.last_completed_at && <span>Last done {fmtDate(o.last_completed_at)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn('text-sm font-medium', b === 'overdue' ? 'text-[var(--apas-rose)]' : b === 'due_soon' ? 'text-[var(--apas-amber)]' : 'text-foreground')}>{fmtDate(o.next_due_date)}</div>
                      {!done && du != null && <div className="text-[11px] text-muted-foreground">{du < 0 ? `${Math.abs(du)}d overdue` : du === 0 ? 'today' : `in ${du}d`}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!done && <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => api.complete.mutate(o)} disabled={api.complete.isPending}><CheckCircle2 className="h-3.5 w-3.5" />Done</Button>}
                      <button className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => api.remove.mutate(o.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>Add obligation</DialogTitle><DialogDescription>A permit condition or recurring deadline. Recurring ones roll forward automatically when marked done.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title * — e.g. Submit monthly DMR" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Permit ref (FL0012345)" value={form.permit_ref} onChange={(e) => setForm({ ...form, permit_ref: e.target.value })} />
              <Input placeholder="Agency (FDEP)" value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Frequency</label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as ObligationFrequency })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQS.map((f) => <SelectItem key={f} value={f}>{FREQ_LABEL[f]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Next due</label>
                <Input type="date" className="h-9" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
              </div>
            </div>
            <Input placeholder="Responsible (optional)" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={!form.title.trim() || api.create.isPending}>{api.create.isPending ? 'Adding…' : 'Add obligation'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className={cn('mt-1 text-xl font-bold tracking-tight', tone)}>{value}</div>
    </div>
  );
}
