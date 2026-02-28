import { useRef } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import { ExportReportButton } from './ExportReportButton';
import { usePayAppStatusReport } from '@/hooks/useOwnerReports';
import type { DateRange } from '@/hooks/useReports';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
const formatDate = (d: string | null) => d ? format(new Date(d), 'MMM d, yyyy') : '—';

const statusBadge: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-500/10 text-blue-600',
  under_review: 'bg-amber-500/10 text-amber-600',
  certified: 'bg-emerald-500/10 text-emerald-600',
  paid: 'bg-primary/10 text-primary',
  disputed: 'bg-destructive/10 text-destructive',
};

export function PayAppStatusReport({ dateRange }: { dateRange?: DateRange }) {
  const { data, isLoading } = usePayAppStatusReport(dateRange);
  const reportRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  if (!data) return null;

  const { apps, summary } = data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500"><Receipt className="h-5 w-5 text-white" /></div>
          <div>
            <CardTitle className="text-base">Pay Application Status</CardTitle>
            <CardDescription className="text-xs">Contractor billing and certification status</CardDescription>
          </div>
        </div>
        <ExportReportButton reportName="Pay Application Status" targetRef={reportRef} />
      </CardHeader>
      <CardContent ref={reportRef} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">{summary.submitted} Submitted</Badge>
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{summary.underReview} Under Review</Badge>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">{summary.certified} Certified</Badge>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{summary.paid} Paid</Badge>
          {summary.disputed > 0 && <Badge variant="secondary" className="bg-destructive/10 text-destructive">{summary.disputed} Disputed</Badge>}
        </div>

        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No pay applications in this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Project</th>
                  <th className="px-3 py-2 text-left font-medium">Property</th>
                  <th className="px-3 py-2 text-left font-medium">Period</th>
                  <th className="px-3 py-2 text-left font-medium">Contractor</th>
                  <th className="px-3 py-2 text-left font-medium">Submitted</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app: any) => (
                  <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono font-medium">{app.pay_app_number}</td>
                    <td className="px-3 py-2">{app.project?.name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{app.project?.property?.name || '—'}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(app.period_from)} – {formatDate(app.period_to)}</td>
                    <td className="px-3 py-2">{app.contractor_name || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(app.submitted_date)}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className={`text-[10px] ${statusBadge[app.status] || ''}`}>{app.status}</Badge>
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
