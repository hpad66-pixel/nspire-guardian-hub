import type { ElementType } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera, CheckCircle2, ClipboardList, FileBadge2, HardHat, Landmark, Receipt,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConstructionCloseoutReadiness } from '@/lib/projects/constructionCloseout';

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  hint?: string;
  tone: 'green' | 'orange' | 'blue' | 'gold';
}) {
  const tones = {
    green: 'bg-[#0D3B30] text-[#FDFCF9]',
    orange: 'bg-[#C45C26] text-white',
    blue: 'bg-[var(--apas-sapphire)] text-white',
    gold: 'bg-[var(--apas-accent,#C4A35A)] text-[#1A1714]',
  };
  return (
    <div className="rounded-xl border bg-card/80 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', tones[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ConstructionCloseoutBanner({
  projectId,
  readiness,
  payAppId,
  onNavigateTab,
  onScanPermit,
}: {
  projectId: string;
  readiness: ConstructionCloseoutReadiness;
  payAppId?: string | null;
  onNavigateTab?: (tab: string) => void;
  onScanPermit?: () => void;
}) {
  return (
    <Card className="overflow-hidden border-[#0D3B30]/25 shadow-sm">
      <div className="bg-gradient-to-r from-[#0D3B30] via-[#0D3B30] to-[#C45C26] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <HardHat className="h-4 w-4 text-[#FDFCF9] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#FDFCF9] truncate">{readiness.headline}</p>
            <p className="text-[11px] text-[#FDFCF9]/80 truncate">{readiness.subline}</p>
          </div>
        </div>
        <Badge className="bg-[#FDFCF9] text-[#0D3B30] font-bold border-0">
          {readiness.overallPct}% closeout ready
        </Badge>
      </div>
      <CardContent className="p-4 space-y-4">
        {(onScanPermit || onNavigateTab) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onScanPermit && (
              <Button
                type="button"
                size="lg"
                onClick={onScanPermit}
                className="h-11 flex-1 bg-[var(--apas-sapphire)] text-white hover:bg-[var(--apas-sapphire)]/90 font-bold"
                data-testid="closeout-scan-permit"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan / Upload Permit
              </Button>
            )}
            {onNavigateTab && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                onClick={() => onNavigateTab('permits')}
                className="h-11 flex-1 font-semibold"
              >
                <FileBadge2 className="mr-2 h-4 w-4" />
                Open Permits
              </Button>
            )}
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Overall closeout readiness</span>
            <span className="text-xs font-bold">{readiness.overallPct}%</span>
          </div>
          <Progress value={readiness.overallPct} className="h-2 [&>div]:bg-[#0D3B30]" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Metric
            icon={Receipt}
            label="Construction"
            value={`${readiness.constructionPct}%`}
            hint={readiness.constructionLabel}
            tone="orange"
          />
          <Metric
            icon={ClipboardList}
            label="Field / Punch"
            value={`${readiness.punchPct}%`}
            hint={readiness.openFieldItems > 0 ? `${readiness.openFieldItems} open (City chase)` : 'All field items closed'}
            tone="green"
          />
          <Metric
            icon={CheckCircle2}
            label="Checklist"
            value={`${readiness.closeoutPct}%`}
            hint="Closeout tab"
            tone="gold"
          />
          <Metric
            icon={Landmark}
            label="City permits"
            value={`${readiness.permitPct}%`}
            hint={readiness.openCityItems > 0 ? `${readiness.openCityItems} still with City` : 'All closed'}
            tone="blue"
          />
        </div>

        {readiness.isConstructionComplete && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0D3B30]/10 text-[#0D3B30] px-2.5 py-1 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Construction 100% done per final invoice
            </span>
            {readiness.remainingDue > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-800 px-2.5 py-1 font-semibold">
                <FileBadge2 className="h-3.5 w-3.5" />
                {money(readiness.remainingDue)} still due from owner
              </span>
            )}
            {payAppId && (
              <Link
                to={`/projects/${projectId}/financials/pay-apps/${payAppId}`}
                className="text-[var(--apas-sapphire)] font-semibold hover:underline ml-auto"
              >
                Open Final Invoice →
              </Link>
            )}
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onNavigateTab?.('project-log')}
            >
              Project Log
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onNavigateTab?.('permits')}
            >
              Permits
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hover:underline"
              onClick={() => onNavigateTab?.('closeout')}
            >
              Closeout
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
