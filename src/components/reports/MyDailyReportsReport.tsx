import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileBarChart, Users, AlertTriangle, Clock } from 'lucide-react';
import { useMyDailyReportsReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface MyDailyReportsReportProps {
  dateRange?: DateRange;
}

export function MyDailyReportsReport({ dateRange }: MyDailyReportsReportProps) {
  const { data, isLoading } = useMyDailyReportsReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500">
            <FileBarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>My Daily Reports</CardTitle>
            <CardDescription>Field reports you've submitted</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <FileBarChart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalReports}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalWorkers}</p>
                <p className="text-sm text-muted-foreground">Total Workers Logged</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.avgWorkersPerDay}</p>
                <p className="text-sm text-muted-foreground">Avg Workers/Day</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.reportsWithDelays}</p>
                <p className="text-sm text-muted-foreground">Reports with Delays</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div>
          <h4 className="font-medium mb-3">Recent Reports</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-center">Workers</TableHead>
                  <TableHead>Weather</TableHead>
                  <TableHead>Delays</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.reports.slice(0, 15).map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {format(new Date(report.report_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {(report as any).project?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(report as any).project?.property?.name || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{report.workers_count || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.weather || '—'}
                    </TableCell>
                    <TableCell>
                      {report.delays && report.delays.trim().length > 0 ? (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                          <Clock className="h-3 w-3 mr-1" />
                          Delay
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No daily reports found in this date range
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

function ReportSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}
