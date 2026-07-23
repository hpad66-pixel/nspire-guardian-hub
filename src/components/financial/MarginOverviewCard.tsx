import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight, Info } from 'lucide-react';
import { useMargin } from '@/hooks/useMargin';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Metric({ label, value, valueCls, tip }: { label: string; value: React.ReactNode; valueCls?: string; tip: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="cursor-help text-muted-foreground/60 hover:text-foreground"
              aria-label={`What does "${label}" mean?`}
            >
              <Info className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">{tip}</TooltipContent>
        </Tooltip>
      </div>
      <div className={`text-[17px] font-bold ${valueCls ?? ''}`}>{value}</div>
    </div>
  );
}

// Compact prime↔sub recovery card for the Financial Overview.
export function MarginOverviewCard({ projectId }: { projectId: string }) {
  const { data } = useMargin(projectId);
  if (!data || data.totals.revenue === 0) return null;
  const pct = data.totals.revenue ? Math.round((data.totals.margin / data.totals.revenue) * 100) : 0;

  return (
    <TooltipProvider delayDuration={150}>
      <Link to={`/projects/${projectId}/financials/margin`} className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-[var(--apas-sapphire)]/40">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-[var(--apas-sapphire)]" /> Margin &amp; recovery</div>
          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">Open <ArrowRight className="h-3.5 w-3.5" /></span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="Owner revenue"
            value={usd(data.totals.revenue)}
            tip="What this job earns you — the revenue side of the prime contract with the owner (your billable contract value, including approved change orders)."
          />
          <Metric
            label="Sub cost"
            value={usd(data.totals.cost)}
            tip="What this job costs you — the total you've committed to your subcontractors and suppliers."
          />
          <Metric
            label="APAS recovery"
            value={<>{usd(data.totals.margin)} <span className="text-[12px] font-normal text-muted-foreground">({pct}%)</span></>}
            valueCls="text-[var(--apas-sapphire)]"
            tip="Your margin — owner revenue minus sub cost. The % is margin as a share of revenue: roughly what this job makes for APAS."
          />
        </div>
      </Link>
    </TooltipProvider>
  );
}
