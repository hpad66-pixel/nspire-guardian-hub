import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { useMargin } from '@/hooks/useMargin';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Compact prime↔sub recovery card for the Financial Overview.
export function MarginOverviewCard({ projectId }: { projectId: string }) {
  const { data } = useMargin(projectId);
  if (!data || data.totals.revenue === 0) return null;
  const pct = data.totals.revenue ? Math.round((data.totals.margin / data.totals.revenue) * 100) : 0;

  return (
    <Link to={`/projects/${projectId}/financials/margin`} className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-[var(--apas-sapphire)]/40">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-[var(--apas-sapphire)]" /> Margin &amp; recovery</div>
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">Open <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><div className="text-[11px] text-muted-foreground">Owner revenue</div><div className="text-[17px] font-bold">{usd(data.totals.revenue)}</div></div>
        <div><div className="text-[11px] text-muted-foreground">Sub cost</div><div className="text-[17px] font-bold">{usd(data.totals.cost)}</div></div>
        <div><div className="text-[11px] text-muted-foreground">APAS recovery</div><div className="text-[17px] font-bold text-[var(--apas-sapphire)]">{usd(data.totals.margin)} <span className="text-[12px] font-normal text-muted-foreground">({pct}%)</span></div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <div><div className="text-[11px] text-muted-foreground">Paid to date by owner → prime</div><div className="text-[16px] font-bold text-emerald-600">{usd(data.cash.receivedFromOwner)}</div></div>
        <div><div className="text-[11px] text-muted-foreground">Paid to date to subs</div><div className="text-[16px] font-bold text-[var(--apas-sapphire)]">{usd(data.cash.paidToSubs)}</div></div>
      </div>
    </Link>
  );
}
