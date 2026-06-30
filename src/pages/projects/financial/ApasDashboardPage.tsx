import { useParams, Link } from 'react-router-dom';
import { Scale, TrendingUp, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { useApasTrueUp } from '@/hooks/useApasTrueUp';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ApasDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: d, isLoading } = useApasTrueUp(projectId);

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <FinancialSubNav />
      <div className="mb-4 flex items-center gap-2">
        <Scale className="h-6 w-6 text-[var(--apas-sapphire)]" />
        <div>
          <h1 className="text-2xl font-bold">APAS Dashboard</h1>
          <p className="text-sm text-muted-foreground">What APAS made — money in from the owner, money out to subs, and the true-up.</p>
        </div>
      </div>

      {isLoading || !d ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Headline */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="APAS revenue (owner)" value={usd(d.primeRevised)} icon={ArrowDownLeft} />
            <Tile label="Sub cost (committed)" value={usd(d.subCost)} icon={ArrowUpRight} />
            <Tile label="APAS margin" value={usd(d.apasMargin)} icon={TrendingUp} accent />
            <Tile label="Net cash on hand" value={usd(d.netCashOnHand)} icon={Scale} className={d.netCashOnHand >= 0 ? 'text-emerald-600' : 'text-destructive'} />
          </div>

          {/* Money flow */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Flow label="Money in — received from owner" value={usd(d.receivedFromOwner)} sub={`Billed ${usd(d.billedToOwner)}`} color="text-emerald-600" />
            <Flow label="Money out — paid to subs" value={usd(d.paidToSubs)} sub={`${d.subs.length} subcontractor${d.subs.length !== 1 ? 's' : ''}`} color="text-[var(--apas-sapphire)]" />
            <Flow label="Retainage held by owner" value={usd(d.ownerRetainageHeld)} sub="released to APAS later" color="text-amber-600" />
          </div>

          {/* Per-sub breakdown */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-3 text-sm font-semibold">Money out — by subcontractor</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="p-2.5 text-left">Subcontractor</th>
                  <th className="p-2.5 text-right">Contract</th>
                  <th className="p-2.5 text-right">Paid</th>
                  <th className="p-2.5 text-right">Retainage</th>
                  <th className="p-2.5 text-right">Remaining</th>
                </tr></thead>
                <tbody>
                  {d.subs.map((s) => (
                    <tr key={s.commitmentId} className="border-b border-border last:border-0">
                      <td className="p-2.5"><Link to={`/projects/${projectId}/financials/vendors`} className="font-medium hover:underline">{s.name}</Link></td>
                      <td className="p-2.5 text-right tabular-nums">{usd(s.contract)}</td>
                      <td className="p-2.5 text-right tabular-nums text-emerald-600">{usd(s.paid)}</td>
                      <td className="p-2.5 text-right tabular-nums text-amber-600">{usd(s.retainage)}</td>
                      <td className="p-2.5 text-right tabular-nums font-semibold">{usd(s.remaining)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="p-2.5">Total</td>
                    <td className="p-2.5 text-right tabular-nums">{usd(d.subCost)}</td>
                    <td className="p-2.5 text-right tabular-nums">{usd(d.paidToSubs)}</td>
                    <td className="p-2.5 text-right tabular-nums">{usd(d.subs.reduce((t, x) => t + x.retainage, 0))}</td>
                    <td className="p-2.5 text-right tabular-nums">{usd(d.subs.reduce((t, x) => t + x.remaining, 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* True-up */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">True-up</h3>
            <div className="space-y-1.5 text-[13px]">
              <Row label="Money in from owner (received)" value={usd(d.receivedFromOwner)} />
              <Row label="Less paid to subcontractors" value={`− ${usd(d.paidToSubs)}`} className="text-[var(--apas-sapphire)]" />
              <div className="my-1 border-t border-border" />
              <Row label="Net cash on hand" value={usd(d.netCashOnHand)} bold />
              <Row label="Retainage held by owner (released to APAS later)" value={usd(d.ownerRetainageHeld)} className="text-amber-600" />
              <div className="my-1 border-t border-border" />
              <Row label="APAS revenue (owner contract incl. COs)" value={usd(d.primeRevised)} />
              <Row label="Less total sub cost (committed)" value={`− ${usd(d.subCost)}`} className="text-[var(--apas-sapphire)]" />
              <div className="my-1 border-t border-border" />
              <Row label="APAS margin at completion" value={usd(d.apasMargin)} bold className="text-emerald-700" />
            </div>
          </div>

          {/* Stamp */}
          <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/60 p-4 dark:bg-emerald-950/20">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-emerald-600 text-emerald-700"><ShieldCheck className="h-6 w-6" /></div>
            <div className="text-[12.5px] text-muted-foreground">
              At completion, APAS collects <b className="text-foreground">{usd(d.primeRevised)}</b> from the owner (less retainage of {usd(d.ownerRetainageHeld)} held in the bank until release) and pays subs <b className="text-foreground">{usd(d.subCost)}</b> — netting an APAS margin of <b className="text-emerald-700">{usd(d.apasMargin)}</b>. Every dollar reconciles: owner payments − sub payments − retainage held.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, icon: Icon, accent, className }: { label: string; value: string; icon: any; accent?: boolean; className?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <div className={`mt-0.5 text-[17px] font-bold ${accent ? 'text-[var(--apas-sapphire)]' : ''} ${className ?? ''}`}>{value}</div>
    </div>
  );
}
function Flow({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-[20px] font-bold ${color}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return <div className={`flex justify-between ${bold ? 'font-bold' : ''} ${className ?? ''}`}><span className={bold ? '' : 'text-muted-foreground'}>{label}</span><span className="tabular-nums">{value}</span></div>;
}
