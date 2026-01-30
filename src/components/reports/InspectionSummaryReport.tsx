import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, TreePine, Building, DoorOpen, CheckCircle2 } from 'lucide-react';
import { useInspectionSummaryReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface InspectionSummaryReportProps {
  dateRange?: DateRange;
}

export function InspectionSummaryReport({ dateRange }: InspectionSummaryReportProps) {
  const { data, isLoading } = useInspectionSummaryReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Inspection Summary</CardTitle>
            <CardDescription>Inspection activity by area and completion status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Inspections</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TreePine className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold">{data.byArea.outside}</p>
            </div>
            <p className="text-sm text-muted-foreground">Outside</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold">{data.byArea.inside}</p>
            </div>
            <p className="text-sm text-muted-foreground">Inside</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <DoorOpen className="h-5 w-5 text-purple-600" />
              <p className="text-3xl font-bold">{data.byArea.unit}</p>
            </div>
            <p className="text-sm text-muted-foreground">Unit</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold">{data.completionRate}%</p>
            </div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatusCard label="Completed" count={data.byStatus.completed} total={data.total} color="bg-green-500" />
          <StatusCard label="In Progress" count={data.byStatus.in_progress} total={data.total} color="bg-blue-500" />
          <StatusCard label="Scheduled" count={data.byStatus.scheduled} total={data.total} color="bg-amber-500" />
        </div>

        {/* Recent Inspections Table */}
        <div>
          <h4 className="font-medium mb-3">Recent Inspections</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.inspections.slice(0, 10).map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>{format(new Date(inspection.inspection_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-medium">
                      {(inspection as any).property?.name || '—'}
                    </TableCell>
                    <TableCell>
                      {(inspection as any).unit?.unit_number || '—'}
                    </TableCell>
                    <TableCell>
                      <AreaBadge area={inspection.area} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={inspection.status || 'scheduled'} />
                    </TableCell>
                  </TableRow>
                ))}
                {data.inspections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No inspections found in this date range
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

function StatusCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-bold">{count}</span>
      </div>
      <Progress value={percentage} className={`h-2 [&>div]:${color}`} />
      <p className="text-xs text-muted-foreground">{percentage}% of total</p>
    </div>
  );
}

function AreaBadge({ area }: { area: string }) {
  const config: Record<string, { label: string; className: string }> = {
    outside: { label: 'Outside', className: 'bg-green-100 text-green-700 border-green-200' },
    inside: { label: 'Inside', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    unit: { label: 'Unit', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  };
  const { label, className } = config[area] || { label: area, className: '' };
  return <Badge variant="outline" className={className}>{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    completed: { label: 'Completed', variant: 'default' },
    in_progress: { label: 'In Progress', variant: 'secondary' },
    scheduled: { label: 'Scheduled', variant: 'outline' },
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
