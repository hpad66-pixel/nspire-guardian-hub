import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Plus, ChevronRight, Printer, Search, Loader2, Trash2, Pencil, MessageSquarePlus,
  CheckCircle2, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useTrackerItems, useCreateTrackerItem, useUpdateTrackerItem, useDeleteTrackerItem,
  useAddTrackerUpdate, useSetTrackerStatus,
  type TrackerItem, type TrackerStatus, type TrackerPriority, type TrackerCategory,
} from '@/hooks/useTracker';

const STATUS: Record<TrackerStatus, { label: string; bg: string; fg: string; bar: string }> = {
  open:      { label: 'Open',        bg: '#ECEEF1', fg: '#555',    bar: '#cfd4da' },
  progress:  { label: 'In progress', bg: '#E7F0FD', fg: '#1558b0', bar: '#1558b0' },
  scheduled: { label: 'Scheduled',   bg: '#EDE7F6', fg: '#5e35b1', bar: '#5e35b1' },
  blocked:   { label: 'Blocked',     bg: '#FDECEA', fg: '#c62828', bar: '#c62828' },
  done:      { label: 'Done',        bg: '#E6F4EA', fg: '#1e7e34', bar: '#1e7e34' },
};
const PRIORITY: Record<TrackerPriority, { label: string; bg: string; fg: string }> = {
  high: { label: 'High', bg: '#fdecec', fg: '#c62828' },
  med:  { label: 'Med',  bg: '#fff4e3', fg: '#e68a00' },
  low:  { label: 'Low',  bg: '#e3f6f1', fg: '#0a7d6b' },
};
const CATEGORY: { value: TrackerCategory; label: string }[] = [
  { value: 'punch', label: 'Punch' }, { value: 'decision', label: 'Decision' },
  { value: 'division', label: 'Division' }, { value: 'update', label: 'Update' }, { value: 'general', label: 'General' },
];
const STATUS_ORDER: Record<TrackerStatus, number> = { blocked: 0, progress: 1, scheduled: 2, open: 3, done: 4 };
const PRI_ORDER: Record<TrackerPriority, number> = { high: 0, med: 1, low: 2 };
const TILES: { key: TrackerStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'progress', label: 'In prog.' },
  { key: 'scheduled', label: 'Sched.' }, { key: 'blocked', label: 'Blocked' }, { key: 'done', label: 'Done' },
];

const fmt = (ts?: string | null) => { if (!ts) return '—'; try { return format(new Date(ts), 'MMM d, h:mm a'); } catch { return '—'; } };
const latestTs = (i: TrackerItem) => i.updates[0]?.created_at ?? i.created_at;

export function ProjectTrackerTab({ projectId }: { projectId: string }) {
  const { data: items = [], isLoading } = useTrackerItems(projectId);
  const del = useDeleteTrackerItem();
  const setStatus = useSetTrackerStatus();

  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState<TrackerStatus | 'all'>('all');
  const [fOwner, setFOwner] = useState('all');
  const [fPriority, setFPriority] = useState<TrackerPriority | 'all'>('all');
  const [fCategory, setFCategory] = useState<TrackerCategory | 'all'>('all');
  const [sort, setSort] = useState<'code' | 'priority' | 'status' | 'updated'>('status');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editItem, setEditItem] = useState<TrackerItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [updItem, setUpdItem] = useState<TrackerItem | null>(null);

  const owners = useMemo(() => [...new Set(items.map(i => i.owner).filter(Boolean))].sort() as string[], [items]);
  const counts = useMemo(() => {
    const c = { all: items.length, open: 0, progress: 0, scheduled: 0, blocked: 0, done: 0 } as Record<string, number>;
    items.forEach(i => { c[i.status]++; });
    return c;
  }, [items]);
  const pct = items.length ? Math.round((counts.done / items.length) * 100) : 0;
  const ownerLoad = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach(i => { if (i.status !== 'done') m[i.owner || 'Unassigned'] = (m[i.owner || 'Unassigned'] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);
  const maxLoad = Math.max(1, ...ownerLoad.map(([, n]) => n));

  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    const out = items.filter(i => {
      if (fStatus !== 'all' && i.status !== fStatus) return false;
      if (fOwner !== 'all' && i.owner !== fOwner) return false;
      if (fPriority !== 'all' && i.priority !== fPriority) return false;
      if (fCategory !== 'all' && i.category !== fCategory) return false;
      if (q) {
        const hay = `${i.code} ${i.owner} ${i.title} ${i.description} ${i.updates.map(u => u.body).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sort === 'priority') return PRI_ORDER[a.priority] - PRI_ORDER[b.priority];
      if (sort === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (sort === 'updated') return (latestTs(b)).localeCompare(latestTs(a));
      return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
    });
    return out;
  }, [items, search, fStatus, fOwner, fPriority, fCategory, sort]);

  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const print = () => { setExpanded(new Set(items.map(i => i.id))); setTimeout(() => window.print(), 60); };

  return (
    <div className="space-y-4 print:space-y-3">
      {/* Dashboard */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status overview · tap to filter</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TILES.map(t => {
              const active = fStatus === t.key || (t.key === 'all' && fStatus === 'all');
              const color = t.key === 'all' ? 'var(--foreground)' : STATUS[t.key as TrackerStatus].fg;
              return (
                <button key={t.key} onClick={() => setFStatus(t.key)}
                  className={cn('rounded-lg border bg-background/60 p-2.5 text-center transition-colors', active ? 'ring-2 ring-[var(--apas-sapphire)]' : 'border-border hover:border-muted-foreground/40')}>
                  <div className="text-2xl font-bold leading-none" style={{ color }}>{counts[t.key]}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t.label}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3.5">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {(['done', 'progress', 'scheduled', 'blocked', 'open'] as TrackerStatus[]).map(s => (
                counts[s] ? <span key={s} style={{ width: `${(counts[s] / (items.length || 1)) * 100}%`, background: STATUS[s].bar }} /> : null
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[12px] text-muted-foreground">
              <span>{pct}% complete</span><span>{counts.done} of {items.length} closed</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Open + in-progress by owner</p>
          <div className="space-y-2">
            {ownerLoad.length === 0 ? <span className="text-sm text-muted-foreground">All clear 🎉</span> :
              ownerLoad.map(([o, n]) => (
                <div key={o} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-28 shrink-0 truncate font-medium">{o}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(n / maxLoad) * 100}%` }} /></span>
                  <span className="w-12 text-right text-muted-foreground">{n} open</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add item</Button>
        <Button variant="outline" onClick={() => setExpanded(new Set(items.map(i => i.id)))}>Expand all</Button>
        <Button variant="outline" onClick={() => setExpanded(new Set())}>Collapse all</Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={print} className="gap-1.5"><Printer className="h-4 w-4" /> Print / PDF</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items, owners, updates…" className="pl-8" />
        </div>
        <Select value={fOwner} onValueChange={setFOwner}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All owners</SelectItem>{owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
        <Select value={fCategory} onValueChange={(v) => setFCategory(v as any)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORY.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
        <Select value={fPriority} onValueChange={(v) => setFPriority(v as any)}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="med">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="status">Sort: status</SelectItem><SelectItem value="priority">Sort: priority</SelectItem><SelectItem value="code">Sort: code</SelectItem><SelectItem value="updated">Sort: recently updated</SelectItem></SelectContent></Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {items.length === 0 ? 'No items yet — add your first to start the log.' : 'No items match your filters.'}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(i => (
            <ItemRow key={i.id} item={i} open={expanded.has(i.id)} onToggle={() => toggle(i.id)}
              onEdit={() => setEditItem(i)} onUpdate={() => setUpdItem(i)}
              onDelete={() => { if (confirm(`Delete ${i.code || ''} — "${i.title}"? This cannot be undone.`)) del.mutate({ id: i.id, projectId }); }}
              onStatus={(s) => setStatus.mutate({ id: i.id, projectId, status: s })} />
          ))}
        </div>
      )}

      {(addOpen || editItem) && (
        <ItemModal projectId={projectId} item={editItem} owners={owners} onClose={() => { setAddOpen(false); setEditItem(null); }} />
      )}
      {updItem && <UpdateModal projectId={projectId} item={updItem} onClose={() => setUpdItem(null)} />}
    </div>
  );
}

function ItemRow({ item, open, onToggle, onEdit, onUpdate, onDelete, onStatus }: {
  item: TrackerItem; open: boolean; onToggle: () => void; onEdit: () => void; onUpdate: () => void; onDelete: () => void; onStatus: (s: TrackerStatus) => void;
}) {
  const st = STATUS[item.status]; const pr = PRIORITY[item.priority];
  const last = item.updates[0]?.created_at;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card print:break-inside-avoid">
      <div className="flex cursor-pointer items-center gap-3 px-3.5 py-3 hover:bg-muted/40" onClick={onToggle}>
        {item.code && <span className="w-10 shrink-0 text-[12px] font-bold text-muted-foreground">{item.code}</span>}
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold" style={{ background: pr.bg, color: pr.fg }}>{pr.label}</span>
        <span className="flex-1 font-semibold text-foreground">{item.title}{last && <span className="block text-[12px] font-normal text-muted-foreground">Last update {fmt(last)}</span>}</span>
        {item.owner && <span className="hidden w-28 shrink-0 text-right text-[11.5px] text-muted-foreground sm:block">{item.owner}</span>}
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </div>
      {open && (
        <div className="border-t border-border bg-muted/20 p-3.5">
          {item.description && <p className="mb-3 text-[13px] text-foreground/80">{item.description}</p>}
          <div className="space-y-2">
            {item.updates.length === 0 ? <p className="text-[12.5px] text-muted-foreground">No updates yet.</p> :
              item.updates.map(u => (
                <div key={u.id} className="rounded-md border border-border border-l-[3px] border-l-[var(--apas-sapphire)] bg-background px-3 py-2">
                  <div className="text-[11px] font-semibold text-muted-foreground">{fmt(u.created_at)} · <span className="text-[var(--apas-sapphire)]">{u.author || 'Contractor'}</span></div>
                  <div className="mt-0.5 text-[13px]">{u.body}</div>
                </div>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3 print:hidden">
            <Button size="sm" onClick={onUpdate} className="gap-1.5"><MessageSquarePlus className="h-3.5 w-3.5" /> Add update</Button>
            {item.status !== 'done'
              ? <Button size="sm" variant="outline" onClick={() => onStatus('done')} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Close</Button>
              : <Button size="sm" variant="outline" onClick={() => onStatus('progress')} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Reopen</Button>}
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            <div className="ml-auto">
              <Select value="" onValueChange={(v) => onStatus(v as TrackerStatus)}>
                <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Set status…" /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS) as TrackerStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemModal({ projectId, item, owners, onClose }: { projectId: string; item: TrackerItem | null; owners: string[]; onClose: () => void }) {
  const create = useCreateTrackerItem(); const update = useUpdateTrackerItem();
  const [code, setCode] = useState(item?.code ?? '');
  const [owner, setOwner] = useState(item?.owner ?? '');
  const [category, setCategory] = useState<TrackerCategory>(item?.category ?? 'punch');
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [priority, setPriority] = useState<TrackerPriority>(item?.priority ?? 'med');
  const [status, setStatus] = useState<TrackerStatus>(item?.status ?? 'open');
  const [firstNote, setFirstNote] = useState('');
  const busy = create.isPending || update.isPending;

  const save = () => {
    if (!title.trim()) { return; }
    if (item) {
      update.mutate({ id: item.id, projectId, patch: { code: code || null, owner: owner || null, category, title: title.trim(), description: description || null, priority, status } as any }, { onSuccess: onClose });
    } else {
      create.mutate({ projectId, code, owner, category, title: title.trim(), description, priority, status, firstNote }, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Edit item' : 'Add item'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Code</label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. D16" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Owner</label><Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. Donnell" list="tracker-owners" /><datalist id="tracker-owners">{owners.map(o => <option key={o} value={o} />)}</datalist></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Title / scope</label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short description" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Detail (optional)</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Location, conditions, extra detail…" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as TrackerCategory)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORY.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TrackerPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="med">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
            <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TrackerStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(STATUS) as TrackerStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {!item && <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">First update note (optional)</label><Textarea value={firstNote} onChange={e => setFirstNote(e.target.value)} rows={2} placeholder="Add an initial timestamped note…" /></div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || !title.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save item'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpdateModal({ projectId, item, onClose }: { projectId: string; item: TrackerItem; onClose: () => void }) {
  const add = useAddTrackerUpdate();
  const [body, setBody] = useState('');
  const [statusTo, setStatusTo] = useState<TrackerStatus | ''>('');
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add update · {item.code || item.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Update note</label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="What changed? (timestamp added automatically)" autoFocus /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Set status to</label>
            <Select value={statusTo || 'keep'} onValueChange={(v) => setStatusTo(v === 'keep' ? '' : v as TrackerStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="keep">— keep current —</SelectItem>{(Object.keys(STATUS) as TrackerStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS[s].label}</SelectItem>)}</SelectContent>
            </Select></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => add.mutate({ itemId: item.id, projectId, body, statusTo }, { onSuccess: onClose })} disabled={add.isPending || (!body.trim() && !statusTo)}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
