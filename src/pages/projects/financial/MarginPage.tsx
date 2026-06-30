import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, X, TrendingUp, FileText, Pencil, Tag, PlusCircle, CheckCircle2 } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useProject } from '@/hooks/useProjects';
import { useCommitments } from '@/hooks/useCommitments';
import { openMarginReport } from '@/lib/financial/marginReport';
import {
  useMargin, useSaveMarginClass, useDeleteMarginClass, usePushToCommitment,
  type MarginCO, type MarginClass, type Treatment,
} from '@/hooks/useMargin';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signed = (n: number) => `${n < 0 ? '-' : '+'}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const coLabel = (c: MarginCO | null) => c ? `${c.co_no != null ? `#${c.co_no} · ` : ''}${c.title}` : '—';
const TREAT: Record<Treatment, { label: string; bg: string; fg: string }> = {
  markup:       { label: 'Markup',      bg: '#E7F0FD', fg: '#1558b0' },
  pass_through: { label: 'Pass-through', bg: '#F1EFE8', fg: '#5F5E5A' },
  apas_100:     { label: '100% APAS',   bg: '#E1F5EE', fg: '#0F6E56' },
};

export default function MarginPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading } = useMargin(projectId);
  const { data: project } = useProject(projectId ?? null);
  const del = useDeleteMarginClass();
  const save = useSaveMarginClass();
  const push = usePushToCommitment();
  const { data: commitments = [] } = useCommitments(projectId ?? null);
  const [classify, setClassify] = useState<{ co: MarginCO; existing?: MarginClass } | null>(null);
  const [pushTarget, setPushTarget] = useState<MarginClass | null>(null);

  return (
    <div>
      <FinancialSubNav />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[var(--apas-sapphire)]" />
          <h1 className="text-lg font-bold">Margin &amp; recovery</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">— what you bill the owner vs what you pay subs</span>
          <div className="flex-1" />
          {data && <Button size="sm" variant="outline" onClick={() => openMarginReport(data, project?.name || 'Project')} className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Report</Button>}
        </div>

        {isLoading || !data ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Owner revenue" value={usd(data.totals.revenue)} hint="Prime + classified COs" />
              <Tile label="Sub cost" value={usd(data.totals.cost)} hint="Commitments + sub costs" />
              <Tile label="APAS recovery" value={usd(data.totals.margin)} hint="Revenue − cost" accent />
              <Tile label="Margin" value={`${data.totals.revenue ? Math.round((data.totals.margin / data.totals.revenue) * 100) : 0}%`} hint="of owner revenue" />
            </div>

            <Section title="Base contract">
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Row left="Owner (prime contract)" right={usd(data.base.prime)} />
                <Row left="Sub (commitments)" right={usd(data.base.sub)} muted />
                <Row left="APAS margin on base" right={signed(data.base.delta)} bold accent last />
              </div>
            </Section>

            <Section title="Change orders" hint="Classify each owner change order — markup, pass-through, or 100% APAS.">
              {data.classified.length === 0 && data.unclassifiedPrime.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No executed owner change orders yet.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-b border-border bg-muted/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Owner change order</span><span className="text-right">Bill</span><span>Treatment</span><span className="text-right">Sub cost</span><span className="text-right pr-7">APAS</span>
                  </div>
                  {data.classified.map((c) => (
                    <div key={c.link_id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-b border-border px-3.5 py-2.5 text-[13px]">
                      <span className="truncate" title={coLabel(c.prime)}>{coLabel(c.prime)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{usd(Number(c.prime.amount ?? 0))}</span>
                      <span><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: TREAT[c.treatment].bg, color: TREAT[c.treatment].fg }}>{TREAT[c.treatment].label}</span></span>
                      <span className="text-right tabular-nums text-muted-foreground">{c.treatment === 'apas_100' ? '—' : usd(c.sub_cost)}{c.sub_label ? <span className="ml-1 text-[11px]">→ {c.sub_label}</span> : ''}</span>
                      <span className="flex items-center justify-end gap-1.5">
                        <b className="tabular-nums" style={{ color: c.recovery > 0 ? '#0F6E56' : c.recovery < 0 ? '#A32D2D' : '#5F5E5A' }}>{c.treatment === 'pass_through' ? '$0' : signed(c.recovery)}</b>
                        {c.treatment !== 'apas_100' && c.sub_cost > 0 && (
                          c.sub_co_id
                            ? <span title="Already pushed to a commitment as a sub change order"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></span>
                            : <button onClick={() => setPushTarget(c)} title="Push to commitment as a sub change order" className="text-[var(--apas-sapphire)] hover:opacity-70"><PlusCircle className="h-3.5 w-3.5" /></button>
                        )}
                        <button onClick={() => setClassify({ co: c.prime, existing: c })} title="Edit" className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => del.mutate({ linkId: c.link_id, projectId: projectId! })} title="Remove classification" className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    </div>
                  ))}
                  {data.unclassifiedPrime.map((co) => (
                    <div key={co.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 border-b border-border bg-amber-50/40 px-3.5 py-2.5 text-[13px] dark:bg-amber-950/20">
                      <span className="truncate" title={coLabel(co)}>{coLabel(co)}</span>
                      <span className="text-right tabular-nums text-muted-foreground">{usd(Number(co.amount ?? 0))}</span>
                      <span className="col-span-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setClassify({ co })} className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Classify</Button>
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 bg-muted/30 px-3.5 py-2.5 text-[13px] font-semibold">
                    <span>Classified CO totals</span>
                    <span className="text-right tabular-nums">{usd(data.totals.coRevenue)}</span>
                    <span />
                    <span className="text-right tabular-nums">{usd(data.totals.coCost)}</span>
                    <span className="pr-7 text-right tabular-nums" style={{ color: '#0F6E56' }}>{signed(data.totals.coMargin)}</span>
                  </div>
                </div>
              )}
              {data.totals.unclassifiedAmount > 0 && (
                <p className="mt-2 text-[12px] text-[#854F0B]">{data.unclassifiedPrime.length} owner CO{data.unclassifiedPrime.length !== 1 ? 's' : ''} ({usd(data.totals.unclassifiedAmount)}) not yet classified — not counted in the totals above.</p>
              )}
            </Section>

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

            {classify && (
              <ClassifyDialog
                co={classify.co} existing={classify.existing} subCOs={data.subCOs} subs={data.subs}
                onClose={() => setClassify(null)}
                onSave={(treatment, subCost, subLabel, subCoId) => save.mutate(
                  { projectId: projectId!, primeCoId: classify.co.id, treatment, subCost, subLabel, subCoId },
                  { onSuccess: () => setClassify(null) },
                )}
                busy={save.isPending}
              />
            )}

            {pushTarget && (
              <PushDialog
                cls={pushTarget} commitments={commitments}
                onClose={() => setPushTarget(null)}
                onPush={(commitmentId, amount, title) => push.mutate(
                  { projectId: projectId!, linkId: pushTarget.link_id, commitmentId, amount, title },
                  { onSuccess: () => setPushTarget(null) },
                )}
                busy={push.isPending}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PushDialog({ cls, commitments, onPush, onClose, busy }: {
  cls: MarginClass; commitments: any[];
  onPush: (commitmentId: string, amount: number, title: string) => void; onClose: () => void; busy: boolean;
}) {
  const label = (cls.sub_label ?? '').trim().toLowerCase();
  const match = label ? commitments.find((c) => `${c.title ?? ''}`.toLowerCase().includes(label)) : null;
  const [commitmentId, setCommitmentId] = useState<string>(match?.id ?? (commitments.length === 1 ? commitments[0].id : ''));
  const [amount, setAmount] = useState<string>(String(cls.sub_cost || ''));
  const title = `${coLabel(cls.prime)}${cls.sub_label ? ` — ${cls.sub_label}` : ''}`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Push to commitment</DialogTitle></DialogHeader>
        <div className="space-y-3 text-[13px]">
          <p className="text-muted-foreground">Creates an <b className="text-foreground">approved sub change order</b> for {cls.sub_label || 'the sub'} on the chosen commitment, so this becomes a payable you can invoice against.</p>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Commitment to add it to</label>
            <Select value={commitmentId} onValueChange={setCommitmentId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a commitment…" /></SelectTrigger>
              <SelectContent>{commitments.map((c) => <SelectItem key={c.id} value={c.id}>{c.commitment_no} · {c.title}</SelectItem>)}</SelectContent>
            </Select>
            {commitments.length === 0 && <p className="mt-1 text-[12px] text-amber-600">No commitments yet — create one for this sub first.</p>}
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Sub change-order amount</label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
          </div>
          <p className="rounded-lg bg-muted/40 p-2 text-[12px] text-muted-foreground">{title}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onPush(commitmentId, Number(amount) || 0, title)} disabled={busy || !commitmentId || !(Number(amount) > 0)} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />} Create sub CO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2"><h2 className="text-[15px] font-semibold">{title}</h2>{hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}</div>
      {children}
    </div>
  );
}
function Row({ left, right, muted, bold, accent, last }: { left: string; right: string; muted?: boolean; bold?: boolean; accent?: boolean; last?: boolean }) {
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

function ClassifyDialog({ co, existing, subCOs, subs, onSave, onClose, busy }: {
  co: MarginCO; existing?: MarginClass; subCOs: MarginCO[]; subs: { id: string; name: string }[];
  onSave: (treatment: Treatment, subCost: number, subLabel: string | null, subCoId: string | null) => void; onClose: () => void; busy: boolean;
}) {
  const [treatment, setTreatment] = useState<Treatment>(existing?.treatment ?? 'markup');
  const [subCost, setSubCost] = useState<string>(existing?.sub_cost ? String(existing.sub_cost) : '');
  const [subLabel, setSubLabel] = useState(existing?.sub_label ?? '');
  const [subCoId, setSubCoId] = useState<string>('');
  const [customSub, setCustomSub] = useState<boolean>(!!existing?.sub_label && !subs.some((s) => s.name === existing.sub_label));

  const prime = Number(co.amount ?? 0);
  const cost = treatment === 'apas_100' ? 0 : treatment === 'pass_through' ? prime : Number(subCost || 0);
  const recovery = prime - cost;

  const onPickSubCO = (id: string) => {
    setSubCoId(id);
    const c = subCOs.find((x) => x.id === id);
    if (c) { setSubCost(String(c.amount ?? 0)); if (!subLabel) setSubLabel(c.title); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> Classify · {coLabel(co)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-[13px]">Owner bills <b>{usd(prime)}</b></div>
          <div className="grid grid-cols-3 gap-2">
            {(['markup', 'pass_through', 'apas_100'] as Treatment[]).map((t) => (
              <button key={t} onClick={() => setTreatment(t)}
                className={cn('rounded-lg border px-2 py-2 text-[12px] font-semibold transition-colors', treatment === t ? 'border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]' : 'border-border text-muted-foreground hover:bg-muted')}>
                {TREAT[t].label}
              </button>
            ))}
          </div>

          {treatment === 'markup' && (
            <>
              <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Subcontractor / vendor</label>
                <Select value={customSub ? '__other__' : subLabel} onValueChange={(v) => { if (v === '__other__') { setCustomSub(true); setSubLabel(''); } else { setCustomSub(false); setSubLabel(v); } }}>
                  <SelectTrigger><SelectValue placeholder="Choose a subcontractor…" /></SelectTrigger>
                  <SelectContent>
                    {subs.map((sub) => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}
                    <SelectItem value="__other__">Other / type a name…</SelectItem>
                  </SelectContent>
                </Select>
                {customSub && <Input className="mt-1.5" value={subLabel} onChange={(e) => setSubLabel(e.target.value)} placeholder="Vendor name" autoFocus />}
                {subs.length === 0 && !customSub && <p className="mt-1 text-[11px] text-muted-foreground">No subcontractors in your directory yet — choose "Other" to type one.</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Paid to sub ($)</label><Input type="number" value={subCost} onChange={(e) => setSubCost(e.target.value)} placeholder="1500" /></div>
                {subCOs.length > 0 && (
                  <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">Pre-fill from sub CO</label>
                    <Select value={subCoId} onValueChange={onPickSubCO}><SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
                      <SelectContent>{subCOs.map((c) => <SelectItem key={c.id} value={c.id}>{coLabel(c)} — {usd(Number(c.amount ?? 0))}</SelectItem>)}</SelectContent></Select></div>
                )}
              </div>
            </>
          )}
          {treatment === 'pass_through' && <p className="text-[13px] text-muted-foreground">Sub gets the full {usd(prime)} — no margin to APAS.</p>}
          {treatment === 'apas_100' && <p className="text-[13px] text-muted-foreground">No sub — 100% of {usd(prime)} is APAS revenue.</p>}

          <div className="rounded-lg bg-muted/40 p-3 text-[13px]">APAS recovery: <b style={{ color: recovery > 0 ? '#0F6E56' : recovery < 0 ? '#A32D2D' : '#5F5E5A' }}>{treatment === 'pass_through' ? '$0' : signed(recovery)}</b></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(treatment, cost, subLabel.trim() || (treatment === 'apas_100' ? 'APAS (self-performed)' : null), subCoId || null)} disabled={busy || (treatment === 'markup' && !subCost)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
