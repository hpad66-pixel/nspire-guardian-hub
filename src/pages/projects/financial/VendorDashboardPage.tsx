import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Trash2, ShieldCheck, AlertTriangle, Users, Pencil, Check } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { useCommitments, useCommitmentSov, type Commitment } from '@/hooks/useCommitments';
import { useVendorReconciliation, type VendorReconciliation } from '@/hooks/useVendorReconciliation';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const vendorName = (c: Commitment) => ((c.title ?? '').split('—')[0].trim() || c.commitment_no);
const TREAT_LABEL: Record<string, string> = { markup: 'Markup', pass_through: 'Pass-through', apas_100: '100% APAS' };

export default function VendorDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: commitments = [], isLoading } = useCommitments(projectId ?? null);
  const [active, setActive] = useState<string>('');
  const current = commitments.find((c) => c.id === active) ?? commitments[0];

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <FinancialSubNav />
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-6 w-6 text-[var(--apas-sapphire)]" />
        <div>
          <h1 className="text-2xl font-bold">Vendor Dashboards</h1>
          <p className="text-sm text-muted-foreground">Per-vendor reconciliation — contract, change orders, retainage, and what's left to pay.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : commitments.length === 0 ? (
        <p className="text-muted-foreground">No vendors yet. Add a commitment (subcontract) first.</p>
      ) : (
        <>
          {/* Vendor tabs */}
          <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
            {commitments.map((c) => {
              const on = (current?.id) === c.id;
              return (
                <button key={c.id} onClick={() => setActive(c.id)}
                  className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${on ? 'border-[var(--apas-sapphire)] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {vendorName(c)}
                </button>
              );
            })}
          </div>

          {current && <VendorPanel key={current.id} projectId={projectId!} commitment={current} />}
        </>
      )}
    </div>
  );
}

function VendorPanel({ projectId, commitment }: { projectId: string; commitment: Commitment }) {
  const { data: r } = useVendorReconciliation(projectId, commitment.id);
  if (!r) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{vendorName(commitment)}</h2>
        <span className="font-mono text-xs text-muted-foreground">{commitment.commitment_no}</span>
      </div>

      {/* Headline tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Revised contract" value={usd(r.revisedContract)} strong />
        <Tile label="Paid to date" value={usd(r.paidToDate)} className="text-emerald-600" />
        <Tile label="Retainage held" value={usd(r.retainageHeld)} className="text-amber-600" />
        <Tile label="Remaining to pay" value={usd(r.remainingToPay)} className={r.overpaid ? 'text-destructive' : 'text-[var(--apas-sapphire)]'} strong />
      </div>

      {/* Reconciliation waterfall */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Reconciliation</h3>
        <div className="space-y-1.5 text-[13px]">
          <Row label="Base contract" value={usd(r.base)} />
          <Row label="Additive change orders" value={`+ ${usd(r.additiveCO)}`} className="text-emerald-600" />
          <Row label="Deductive change orders" value={`− ${usd(r.deductiveCO)}`} className="text-destructive" />
          <Divider />
          <Row label="Revised contract" value={usd(r.revisedContract)} bold />
          <Row label={`Less retainage held by owner${r.latestPayAppNo ? ` · live from Pay App #${r.latestPayAppNo}` : ` (${r.retainagePct}%)`}`} value={`− ${usd(r.retainageHeld)}`} className="text-amber-600" />
          <Divider />
          <Row label="Max payable (won't overpay)" value={usd(r.maxPayable)} bold />
          <Row label="Less paid to date" value={`− ${usd(r.paidToDate)}`} className="text-emerald-600" />
          <Divider />
          <Row label="Remaining to pay" value={usd(r.remainingToPay)} bold className={r.overpaid ? 'text-destructive' : ''} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
          <div>Billed to date: <b className="text-foreground">{usd(r.billedToDate)}</b></div>
          <div className="text-right">Left to earn (unbilled): <b className="text-foreground">{usd(r.leftToEarn)}</b></div>
        </div>
      </div>

      {/* Change orders */}
      {r.cos.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Change orders ({r.cos.length})</h3>
          <div className="divide-y divide-border text-[13px]">
            {r.cos.map((c) => {
              const counted = c.status === 'approved' || c.status === 'executed';
              return (
              <Link key={c.id} to={`/projects/${projectId}/financials/cos/${c.id}`} className="-mx-1 flex items-center gap-2 rounded px-1 py-1.5 hover:bg-muted/60">
                <span className="flex-1 truncate">{c.co_no != null ? `#${c.co_no} · ` : ''}{c.title}</span>
                {c.treatment && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{TREAT_LABEL[c.treatment] ?? c.treatment}</span>}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${counted ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>{c.status}</span>
                <span className={`w-24 text-right font-mono ${!counted ? 'text-muted-foreground' : c.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{c.amount < 0 ? '−' : '+'} {usd(Math.abs(c.amount))}</span>
              </Link>
            );})}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Markup = he gets the sub cost, APAS keeps the delta · Pass-through = he gets it all · 100% APAS = he gets nothing. Only approved/executed COs count toward the contract above.</p>
        </div>
      )}

      {/* Base-contract line items */}
      <LineItems commitmentId={commitment.id} base={r.base} />

      {/* Reconciliation stamp */}
      <ReconcileStamp r={r} vendor={vendorName(commitment)} />
    </div>
  );
}

function LineItems({ commitmentId, base }: { commitmentId: string; base: number }) {
  const { data: lines = [], updateLine, removeLine } = useCommitmentSov(commitmentId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [val, setVal] = useState('');
  const total = lines.reduce((t, l) => t + Number(l.scheduled_value ?? 0), 0);
  const mismatch = lines.length > 0 && Math.abs(total - base) > 0.5;

  const save = (id: string) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return setEditing(null);
    updateLine.mutate({ id, patch: { scheduled_value: n } }, { onSuccess: () => toast.success('Line updated — base recalculated') });
    setEditing(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4 text-sm font-semibold">
        <span className="flex items-center gap-2">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />} Base-contract line items ({lines.length})</span>
        <span className="font-mono text-[13px] text-muted-foreground">{usd(total)}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-3">
          {lines.length === 0 ? (
            <p className="py-3 text-[13px] text-muted-foreground">No SOV line items on this commitment — base uses the commitment value.</p>
          ) : (
            <div className="divide-y divide-border text-[13px]">
              {lines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 py-2">
                  <span className="w-8 shrink-0 font-mono text-muted-foreground">{l.line_no}</span>
                  <span className="flex-1 truncate">{l.description}</span>
                  {editing === l.id ? (
                    <>
                      <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-8 w-32 text-right font-mono" inputMode="decimal" autoFocus />
                      <button onClick={() => save(l.id)} className="text-emerald-600"><Check className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="w-32 text-right font-mono">{usd(l.scheduled_value)}</span>
                      <button onClick={() => { setEditing(l.id); setVal(String(l.scheduled_value)); }} className="text-muted-foreground hover:text-foreground" title="Edit value"><Pencil className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  <button onClick={() => { if (confirm(`Delete line "${l.description}"? The base contract will decrease by ${usd(l.scheduled_value)}.`)) removeLine.mutate(l.id, { onSuccess: () => toast.success('Line deleted — base recalculated') }); }} className="text-muted-foreground hover:text-destructive" title="Delete line"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {mismatch
            ? <p className="pt-2 text-[11px] text-amber-600">These line items sum to {usd(total)}, which differs from the contract base of {usd(base)}. Clean up the lines so they reconcile to the contract.</p>
            : <p className="pt-2 text-[11px] text-muted-foreground">Line items break down this vendor's contract base.</p>}
        </div>
      )}
    </div>
  );
}

function ReconcileStamp({ r, vendor }: { r: VendorReconciliation; vendor: string }) {
  if (r.overpaid) {
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
        <AlertTriangle className="h-8 w-8 shrink-0 text-destructive" />
        <div>
          <div className="text-sm font-bold text-destructive">OVERPAYMENT WARNING</div>
          <div className="text-[12.5px] text-muted-foreground">{vendor} has been paid {usd(r.paidToDate)} — that's {usd(r.paidToDate - r.maxPayable)} over the max payable of {usd(r.maxPayable)} (revised contract less retainage). Do not issue further payment.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-emerald-600 text-emerald-700">
        <ShieldCheck className="h-7 w-7" />
      </div>
      <div>
        <div className="text-sm font-bold uppercase tracking-wide text-emerald-700">Reconciled · QC Checked</div>
        <div className="text-[12.5px] text-muted-foreground">
          {vendor} is within contract. Paid {usd(r.paidToDate)} of {usd(r.maxPayable)} payable; <b className="text-foreground">{usd(r.remainingToPay)}</b> remaining to pay (retainage of {usd(r.retainageHeld)} held by owner, released later). No overpayment.
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, className, strong }: { label: string; value: string; className?: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`${strong ? 'text-[18px] font-bold' : 'text-[16px] font-semibold'} ${className ?? ''}`}>{value}</div>
    </div>
  );
}
function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${className ?? ''}`}><span className={bold ? '' : 'text-muted-foreground'}>{label}</span><span className="tabular-nums">{value}</span></div>;
}
function Divider() { return <div className="my-1 border-t border-border" />; }
