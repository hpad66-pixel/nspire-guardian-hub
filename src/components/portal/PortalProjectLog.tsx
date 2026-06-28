import { useMemo, useState } from 'react';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { usePortalData, type PortalTrackerItem } from '@/hooks/usePortalData';

const STATUS: Record<string, { label: string; bg: string; fg: string; bar: string }> = {
  open:      { label: 'Open',        bg: '#ECEEF1', fg: '#555',    bar: '#cfd4da' },
  progress:  { label: 'In progress', bg: '#E7F0FD', fg: '#1558b0', bar: '#1558b0' },
  scheduled: { label: 'Scheduled',   bg: '#EDE7F6', fg: '#5e35b1', bar: '#5e35b1' },
  blocked:   { label: 'Blocked',     bg: '#FDECEA', fg: '#c62828', bar: '#c62828' },
  done:      { label: 'Done',        bg: '#E6F4EA', fg: '#1e7e34', bar: '#1e7e34' },
};
const CAT_LABEL: Record<string, string> = { punch: 'Punch', decision: 'Decision', division: 'Division', update: 'Update', general: 'General' };
const ORDER: Record<string, number> = { blocked: 0, progress: 1, scheduled: 2, open: 3, done: 4 };
const fmt = (ts?: string | null) => { if (!ts) return ''; try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };

export function PortalProjectLog({ slug, accent }: { slug?: string; accent: string }) {
  const { data } = usePortalData(slug);
  const items = data?.tracker ?? [];
  const [cat, setCat] = useState('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, open: 0, progress: 0, scheduled: 0, blocked: 0, done: 0 };
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);
  const cats = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const pct = items.length ? Math.round((counts.done / items.length) * 100) : 0;
  const list = useMemo(() => {
    const out = items.filter((i) => cat === 'all' || i.category === cat);
    out.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    return out;
  }, [items, cat]);

  if (!items.length) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <ClipboardList className="h-[18px] w-[18px] text-muted-foreground" /> Project log
        </div>
        <span className="text-[12px] text-muted-foreground">{pct}% complete · {counts.done}/{items.length} closed</span>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        {/* Progress bar */}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {(['done', 'progress', 'scheduled', 'blocked', 'open'] as const).map((s) =>
            counts[s] ? <span key={s} style={{ width: `${(counts[s] / items.length) * 100}%`, background: STATUS[s].bar }} /> : null)}
        </div>

        {/* Category filter */}
        {cats.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['all', ...cats].map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors"
                style={cat === c ? { background: accent, color: '#fff' } : { background: '#F1EFE8', color: '#5F5E5A' }}>
                {c === 'all' ? 'All' : CAT_LABEL[c] ?? c}
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        <div className="mt-3 space-y-2">
          {list.map((i) => <LogRow key={i.id} item={i} accent={accent} />)}
        </div>
      </div>
    </div>
  );
}

function LogRow({ item, accent }: { item: PortalTrackerItem; accent: string }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[item.status] ?? STATUS.open;
  const last = item.updates[0]?.created_at;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/40">
        {item.code && <span className="w-9 shrink-0 text-[12px] font-bold text-muted-foreground">{item.code}</span>}
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
        <span className="flex-1 text-[13px] font-medium text-foreground">{item.title}{last && <span className="block text-[11px] font-normal text-muted-foreground">Updated {fmt(last)}</span>}</span>
        {item.owner && <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:block">{item.owner}</span>}
        <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border bg-muted/20 p-3">
          {item.description && <p className="mb-2.5 text-[12.5px] text-foreground/80">{item.description}</p>}
          {item.updates.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {item.updates.map((u, k) => (
                <div key={k} className="rounded-md border border-border bg-white px-3 py-2" style={{ borderLeft: `3px solid ${accent}` }}>
                  <div className="text-[11px] font-semibold text-muted-foreground">{fmt(u.created_at)} · <span style={{ color: accent }}>{u.author || 'Contractor'}</span></div>
                  <div className="mt-0.5 text-[12.5px]">{u.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
