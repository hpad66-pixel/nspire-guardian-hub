import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Link2, X, TrendingUp, ArrowRight } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  useMargin, useLinkCoMargin, useUnlinkCoMargin, useToggleCoPassThrough,
  type MarginCO,
} from '@/hooks/useMargin';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signed = (n: number) => `${n < 0 ? '-' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const coLabel = (c: MarginCO | null) => c ? `${c.co_no != null ? `#${c.co_no} · ` : ''}${c.title}` : '—';

export default function MarginPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useMargin(projectId);
  const link = useLinkCoMargin();
  const unlink = useUnlinkCoMargin();
  const togglePT = useToggleCoPassThrough();
  const [linkOpen, setLinkOpen] = useState(false);

  return (
    <div>
      <FinancialSubNav />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--apas-sapphire)]" />
          <h1 className="text-lg font-bold">Margin &amp; recovery</h1>
          <span className="text-sm text-muted-foreground">— what you bill the owner vs what you pay subs</span>
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Owner revenue" value={usd(data.totals.revenue)} hint="Prime contract + COs" />
              <Tile label="Sub cost" value={usd(data.totals.cost)} hint="Commitments + sub COs" />
              <Tile label="APAS recovery" value={usd(data.totals.margin)} hint="Revenue − cost" accent />
              <Tile label="Margin" value={`${data.totals.revenue ? Math.round((data.totals.margin / data.totals.revenue) * 100) : 0}%`} hint="of owner revenue" />
            </div>

            {/* Base contract */}
            <Section title="Base contract">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Row3 left="Owner (prime contract)" right={usd(data.base.prime)} />
                <Row3 left="Sub (commitments)" right={usd(data.base.sub)} muted />
                <Row3 left="APAS margin on base" right={signed(data.base.delta)} bold accent last />
              </div>
            </Section>

            {/* Change orders */}
            <Section title="Change orders" action={(data.unlinkedPrime.length > 0 || data.unlinkedSub.length > 0) && (
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)} className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Link prime ↔ sub</Button>
            )}>
              {data.pairs.length === 0 && data.unlinkedPrime.length === 0 && data.unlinkedSub.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No executed change orders yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 border-b border-border bg-muted/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Owner (prime)</span><span className="text-right">Bill</span><span>Sub</span><span className="text-right">Pay</span><span className="text-right pr-7">APAS</span>
                  </div>
                  {data.pairs.map((p) => (
                    <div key={p.link_id} className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 border-b border-border px-3.5 py-2.5 text-[13px]">
                      <span className="truncate" title={coLabel(p.prime)}>{coLabel(p.prime)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{usd(Number(p.prime?.amount ?? 0))}</span>
                      <span className="truncate text-muted-foreground" title={coLabel(p.sub)}>{coLabel(p.sub)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{usd(Number(p.sub?.amount ?? 0))}</span>
                      <span className="flex items-center justify-end gap-1.5">
                        {p.is_pass_through
                          ? <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pass-through</span>
                          : <b className="tabular-nums" style={{ color: p.delta >= 0 ? '#0F6E56' : '#A32D2D' }}>{signed(p.delta)}</b>}
                        <button onClick={() => togglePT.mutate({ linkId: p.link_id, value: !p.is_pass_through, projectId: projectId! })} title="Toggle pass-through" className="text-muted-foreground hover:text-foreground"><ArrowRight className="h-3.5 w-3.5" /></button>
                        <button onClick={() => unlink.mutate({ linkId: p.link_id, projectId: projectId! })} title="Unlink" className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  ))}
                  {/* CO totals */}
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2 bg-muted/30 px-3.5 py-2.5 text-[13px] font-semibold">
                    <span>Change-order totals</span>
                    <span className="text-right tabular-nums">{usd(data.totals.coRevenue)}</span>
                    <span />
                    <span className="text-right tabular-nums">{usd(data.totals.coCost)}</span>
                    <span className="pr-7 text-right tabular-nums" style={{ color: '#0F6E56' }}>{signed(data.totals.coMargin)}</span>
                  </div>
                </div>
              )}

              {/* Unlinked */}
              {(data.unlinkedPrime.length > 0 || data.unlinkedSub.length > 0) && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <UnlinkedList title="Unlinked owner COs" cos={data.unlinkedPrime} />
                  <UnlinkedList title="Unlinked sub COs" cos={data.unlinkedSub} />
                </div>
              )}
            </Section>

            {/* Cash */}
            <Section title="Cash position">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Owner (A/R)</p>
                  <Line label="Billed to owner" value={usd(data.cash.billedToOwner)} />
                  <Line label="Received" value={usd(data.cash.receivedFromOwner)} />
                  <Line label="Outstanding" value={usd(data.cash.billedToOwner - data.cash.receivedFromOwner)} bold />
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Subs (A/P)</p>
                  <Line label="Committed" value={usd(data.cash.committed)} />
                  <Line label="Paid to subs" value={usd(data.cash.paidToSubs)} />
                  <Line label="Owed to subs" value={usd(data.cash.owedToSubs)} bold />
                </div>
              </div>
            </Section>

            {linkOpen && (
              <LinkDialog
                primeOptions={data.unlinkedPrime} subOptions={data.unlinkedSub}
                onClose={() => setLinkOpen(false)}
                onLink={(primeCoId, subCoId, passThrough) => link.mutate({ projectId: projectId!, primeCoId, subCoId, passThrough }, { onSuccess: () => setLinkOpen(false) })}
                busy={link.isPending}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-[22px] font-bold" style={accent ? { color: 'var(--apas-sapphire)' } : undefined}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Row3({ left, right, muted, bold, accent, last }: { left: string; right: string; muted?: boolean; bold?: boolean; accent?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 text-[13px] ${last ? '' : 'border-b border-border'} ${bold ? 'font-semibold' : ''}`}>
      <span className={muted ? 'text-muted-foreground' : ''}>{left}</span>
      <span className="tabular-nums" style={accent ? { color: '#0F6E56' } : undefined}>{right}</span>
    </div>
  );
}
function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between py-1 text-[13px] ${bold ? 'border-t border-border pt-2 font-semibold' : 'text-muted-foreground'}`}><span>{label}</span><span className="tabular-nums text-foreground">{value}</span></div>;
}
function UnlinkedList({ title, cos }: { title: string; cos: MarginCO[] }) {
  if (!cos.length) return <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-muted-foreground">{title}: none</div>;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1">{cos.map(c => <div key={c.id} className="flex justify-between text-[12.5px]"><span className="truncate pr-2">{coLabel(c)}</span><span className="tabular-nums text-muted-foreground">{usd(Number(c.amount ?? 0))}</span></div>)}</div>
    </div>
  );
}

function LinkDialog({ primeOptions, subOptions, onLink, onClose, busy }: {
  primeOptions: MarginCO[]; subOptions: MarginCO[]; onLink: (primeCoId: string, subCoId: string, passThrough: boolean) => void; onClose: () => void; busy: boolean;
}) {
  const [prime, setPrime] = useState('');
  const [sub, setSub] = useState('');
  const [pt, setPt] = useState(false);
  const p = primeOptions.find(c => c.id === prime); const s = subOptions.find(c => c.id === sub);
  const delta = (Number(p?.amount ?? 0) - Number(s?.amount ?? 0));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Link a prime CO to its sub CO</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Owner (prime) change order</label>
            <Select value={prime} onValueChange={setPrime}><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{primeOptions.map(c => <SelectItem key={c.id} value={c.id}>{coLabel(c)} — {usd(Number(c.amount ?? 0))}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Subcontractor change order</label>
            <Select value={sub} onValueChange={setSub}><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{subOptions.map(c => <SelectItem key={c.id} value={c.id}>{coLabel(c)} — {usd(Number(c.amount ?? 0))}</SelectItem>)}</SelectContent></Select></div>
          {p && s && (
            <div className="rounded-lg bg-muted/40 p-3 text-[13px]">APAS recovery on this pair: <b style={{ color: delta >= 0 ? '#0F6E56' : '#A32D2D' }}>{signed(delta)}</b></div>
          )}
          <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={pt} onChange={e => setPt(e.target.checked)} className="h-4 w-4 accent-[var(--apas-sapphire)]" /> Pass-through (no margin)</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onLink(prime, sub, pt)} disabled={busy || !prime || !sub}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
