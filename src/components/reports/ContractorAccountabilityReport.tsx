import { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HardHat } from 'lucide-react';
import { ExportReportButton } from './ExportReportButton';
import { useContractorAccountabilityReport } from '@/hooks/useOwnerReports';
import type { DateRange } from '@/hooks/useReports';

function ScorePill({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-emerald-500/10 text-emerald-600'
    : score >= 60 ? 'bg-amber-500/10 text-amber-600'
    : score >= 40 ? 'bg-orange-500/10 text-orange-600'
    : 'bg-destructive/10 text-destructive';
  return <Badge variant="secondary" className={`font-mono text-xs ${cls}`}>{score}</Badge>;
}

export function ContractorAccountabilityReport({ dateRange }: { dateRange?: DateRange }) {
  const { data, isLoading } = useContractorAccountabilityReport();
  const reportRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  if (!data || data.length === 0) return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500"><HardHat className="h-5 w-5 text-white" /></div>
          <div><CardTitle className="text-base">Contractor Accountability</CardTitle></div>
        </div>
      </CardHeader>
      <CardContent><p className="text-sm text-muted-foreground text-center py-4">No active contractors.</p></CardContent>
    </Card>
  );

  const avgScore = Math.round(data.reduce((s, c) => s + c.performanceScore, 0) / data.length);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500"><HardHat className="h-5 w-5 text-white" /></div>
          <div>
            <CardTitle className="text-base">Contractor Accountability</CardTitle>
            <CardDescription className="text-xs">Performance scorecard across all contractors</CardDescription>
          </div>
        </div>
        <ExportReportButton reportName="Contractor Accountability" targetRef={reportRef} />
      </CardHeader>
      <CardContent ref={reportRef} className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Contractor</th>
                <th className="px-3 py-2 text-left font-medium">Trade</th>
                <th className="px-3 py-2 text-center font-medium">Score</th>
                <th className="px-3 py-2 text-center font-medium">On-Time %</th>
                <th className="px-3 py-2 text-center font-medium">Open WOs</th>
                <th className="px-3 py-2 text-center font-medium">Pay Apps</th>
                <th className="px-3 py-2 text-center font-medium">Disputed</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.contractor.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{row.contractor.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.contractor.trade || '—'}</td>
                  <td className="px-3 py-2 text-center"><ScorePill score={row.performanceScore} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-center">
                      <span className="font-mono text-xs">{row.onTimeRate}%</span>
                      <Progress value={row.onTimeRate} className="h-1.5 w-16" />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{row.openWorkOrders}</td>
                  <td className="px-3 py-2 text-center font-mono">{row.totalPayApps}</td>
                  <td className="px-3 py-2 text-center">
                    {row.disputedPayApps > 0
                      ? <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">{row.disputedPayApps}</Badge>
                      : <span className="text-muted-foreground">0</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-sm font-medium pt-2 border-t">
          Portfolio Average Score: <span className="font-mono">{avgScore}</span>
        </div>
      </CardContent>
    </Card>
  );
}
