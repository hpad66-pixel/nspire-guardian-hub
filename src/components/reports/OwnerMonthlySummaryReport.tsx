import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExportReportButton } from './ExportReportButton';
import { useOwnerMonthlySummary } from '@/hooks/useOwnerReports';
import type { DateRange } from '@/hooks/useReports';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

interface KPITileProps {
  label: string;
  value: string | number;
  sub: string;
  borderColor: string;
}

function KPITile({ label, value, sub, borderColor }: KPITileProps) {
  return (
    <div className={`rounded-xl border bg-card p-4`} style={{ borderLeft: `4px solid ${borderColor}` }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="text-3xl font-mono font-bold mt-1 text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function SignalCircle({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="h-20 w-20 rounded-full flex items-center justify-center border-4"
        style={{ borderColor: color }}
      >
        <span className="text-xl font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
    </div>
  );
}

export function OwnerMonthlySummaryReport({ dateRange }: { dateRange?: DateRange }) {
  const { data, isLoading } = useOwnerMonthlySummary(dateRange);
  const reportRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  if (!data) return null;

  const inspPassRate = data.inspections.total > 0
    ? Math.round((data.inspections.completed / data.inspections.total) * 100) : 100;

  const woTotal = data.workOrders.total;
  const woCompleted = woTotal - data.workOrders.open;
  const woOnTimeRate = woTotal > 0 ? Math.round((woCompleted / woTotal) * 100) : 100;

  const defectResRate = data.defects.total > 0
    ? Math.round((data.defects.verified / data.defects.total) * 100) : 100;

  const budgetPct = data.projects.totalBudget > 0
    ? Math.round((data.projects.totalSpent / data.projects.totalBudget) * 100) : 0;

  const getSignalColor = (pct: number) =>
    pct >= 80 ? 'hsl(142 76% 36%)' : pct >= 60 ? 'hsl(38 92% 50%)' : 'hsl(0 84% 60%)';

  return (
    <Card className="border-2 border-[hsl(var(--gold,43_78%_41%))] relative overflow-hidden">
      <div className="absolute top-3 right-3 no-print">
        <ExportReportButton reportName="Owner Monthly Summary" targetRef={reportRef} />
      </div>
      <div className="absolute top-3 right-3 print:right-6">
        <span className="text-[10px] font-mono font-bold tracking-widest text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">★ FLAGSHIP</span>
      </div>

      <CardContent ref={reportRef} className="p-0 space-y-0">
        {/* Hero */}
        <div className="bg-[#0A1628] text-white p-6 md:p-8 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold">Owner Monthly Summary</h2>
              <p className="text-amber-400 text-sm mt-1 font-mono">{data.period}</p>
            </div>
            <span className="text-amber-400 font-mono text-xs tracking-[0.2em] font-bold hidden md:block">APAS OS</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-6">
          <KPITile
            label="Properties"
            value={data.properties.active}
            sub={`${data.properties.total} total`}
            borderColor="hsl(217 91% 60%)"
          />
          <KPITile
            label="Inspections"
            value={data.inspections.total}
            sub={`${data.inspections.completed} completed`}
            borderColor="hsl(142 76% 36%)"
          />
          <KPITile
            label="Open Issues"
            value={data.issues.open}
            sub={`${data.issues.critical} critical`}
            borderColor={data.issues.critical > 0 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)'}
          />
          <KPITile
            label="Work Orders"
            value={`${data.workOrders.open} open`}
            sub={`${data.workOrders.overdue} overdue`}
            borderColor={data.workOrders.overdue > 0 ? 'hsl(0 84% 60%)' : 'hsl(142 76% 36%)'}
          />
          <KPITile
            label="Pay Apps"
            value={`${data.payApplications.pending} pending`}
            sub={`${data.payApplications.certified} certified`}
            borderColor={data.payApplications.pending > 0 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)'}
          />
          <KPITile
            label="Defects"
            value={data.defects.total}
            sub={`${data.defects.verified} verified`}
            borderColor={data.defects.total === data.defects.verified ? 'hsl(142 76% 36%)' : 'hsl(38 92% 50%)'}
          />
        </div>

        {/* Budget Bar */}
        <div className="px-6 pb-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Project Budget Summary</p>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(budgetPct, 100)}%`,
                  backgroundColor: budgetPct > 100 ? 'hsl(0 84% 60%)' : budgetPct > 80 ? 'hsl(38 92% 50%)' : 'hsl(142 76% 36%)',
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {fmt(data.projects.totalSpent)} spent of {fmt(data.projects.totalBudget)} budget ({budgetPct}%)
            </p>
          </div>
        </div>

        {/* Compliance Signals */}
        <div className="px-6 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Compliance Signal</p>
          <div className="flex justify-center gap-8 md:gap-12">
            <SignalCircle value={inspPassRate} label="Inspection Completion" color={getSignalColor(inspPassRate)} />
            <SignalCircle value={woOnTimeRate} label="Work Order Completion" color={getSignalColor(woOnTimeRate)} />
            <SignalCircle value={defectResRate} label="Defect Resolution" color={getSignalColor(defectResRate)} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            This report was prepared by APAS Consulting LLC for the period {data.period}.
            Data is sourced directly from APAS OS property intelligence platform.
            Contact{' '}
            <a href="mailto:hardeep@apas.ai" className="text-primary hover:underline">hardeep@apas.ai</a>
            {' '}for questions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
