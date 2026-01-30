import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, AlertCircle, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useIssuesOverviewReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface IssuesOverviewReportProps {
  dateRange?: DateRange;
}

export function IssuesOverviewReport({ dateRange }: IssuesOverviewReportProps) {
  const { data, isLoading } = useIssuesOverviewReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Issues Overview</CardTitle>
            <CardDescription>Issue tracking and resolution metrics</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Issues</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-3xl font-bold text-amber-600">{data.byStatus.open}</p>
            </div>
            <p className="text-sm text-muted-foreground">Open</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">{data.byStatus.in_progress}</p>
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{data.byStatus.resolved}</p>
            </div>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-3xl font-bold text-destructive">{data.overdue}</p>
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Resolution Rate</span>
            <span className="font-medium">{data.resolutionRate}%</span>
          </div>
          <Progress value={data.resolutionRate} className="h-2" />
        </div>

        {/* Breakdown Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* By Severity */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium mb-4">By Severity</h4>
            <div className="space-y-3">
              <BreakdownRow label="Severe" count={data.bySeverity.severe} total={data.total} color="bg-destructive" />
              <BreakdownRow label="Moderate" count={data.bySeverity.moderate} total={data.total} color="bg-amber-500" />
              <BreakdownRow label="Low" count={data.bySeverity.low} total={data.total} color="bg-blue-500" />
            </div>
          </div>

          {/* By Source */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium mb-4">By Source Module</h4>
            <div className="space-y-3">
              <BreakdownRow label="Core" count={data.bySource.core} total={data.total} color="bg-slate-500" />
              <BreakdownRow label="NSPIRE" count={data.bySource.nspire} total={data.total} color="bg-green-500" />
              <BreakdownRow label="Projects" count={data.bySource.projects} total={data.total} color="bg-indigo-500" />
            </div>
          </div>
        </div>

        {/* Recent Issues */}
        <div>
          <h4 className="font-medium mb-3">Recent Issues</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.issues.slice(0, 10).map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(issue.created_at), 'MMM d')}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {issue.title}
                    </TableCell>
                    <TableCell>
                      {(issue as any).property?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={issue.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={issue.status || 'open'} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {issue.deadline ? format(new Date(issue.deadline), 'MMM d') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {data.issues.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No issues found in this date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { label: string; className: string }> = {
    severe: { label: 'Severe', className: 'bg-destructive text-destructive-foreground' },
    moderate: { label: 'Moderate', className: 'bg-amber-500 text-white' },
    low: { label: 'Low', className: 'bg-blue-500 text-white' },
  };
  const { label, className } = config[severity] || { label: severity, className: '' };
  return <Badge className={className}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    resolved: { label: 'Resolved', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'secondary' },
    open: { label: 'Open', variant: 'outline' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}
