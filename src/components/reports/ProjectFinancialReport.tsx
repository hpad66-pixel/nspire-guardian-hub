import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign } from 'lucide-react';
import { ExportReportButton } from './ExportReportButton';
import { useProjectFinancialReport } from '@/hooks/useOwnerReports';
import type { DateRange } from '@/hooks/useReports';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export function ProjectFinancialReport({ dateRange }: { dateRange?: DateRange }) {
  const { data, isLoading } = useProjectFinancialReport();
  const reportRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  if (!data) return null;

  const { rows, totals } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600"><DollarSign className="h-5 w-5 text-white" /></div>
          <div>
            <CardTitle className="text-base">Project Financial Summary</CardTitle>
            <CardDescription className="text-xs">Budget, spend, and change order overview</CardDescription>
          </div>
        </div>
        <ExportReportButton reportName="Project Financial Summary" targetRef={reportRef} />
      </CardHeader>
      <CardContent ref={reportRef} className="space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Original Budget</p>
            <p className="text-lg font-mono font-bold">{fmt(totals.originalBudget)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Adjusted Budget</p>
            <p className="text-lg font-mono font-bold">{fmt(totals.adjustedBudget)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Spent</p>
            <p className="text-lg font-mono font-bold">{fmt(totals.spent)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</p>
            <p className={`text-lg font-mono font-bold ${totals.remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{fmt(totals.remaining)}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No projects found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Project</th>
                  <th className="px-3 py-2 text-left font-medium">Property</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Budget</th>
                  <th className="px-3 py-2 text-right font-medium">COs</th>
                  <th className="px-3 py-2 text-right font-medium">Spent</th>
                  <th className="px-3 py-2 text-center font-medium">%</th>
                  <th className="px-3 py-2 text-right font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.project.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{row.project.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{(row.project as any).property?.name || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">{row.project.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(row.originalBudget)}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.approvedCOs > 0 ? fmt(row.approvedCOs) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(row.spent)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 justify-center">
                        <Progress value={row.spentPct} className="h-1.5 w-12" />
                        <span className="text-[10px] font-mono">{row.spentPct}%</span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${row.remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {fmt(row.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
