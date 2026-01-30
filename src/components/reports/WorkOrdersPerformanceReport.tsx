import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, Clock, CheckCircle2, AlertTriangle, Timer, Zap } from 'lucide-react';
import { useWorkOrdersPerformanceReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface WorkOrdersPerformanceReportProps {
  dateRange?: DateRange;
}

export function WorkOrdersPerformanceReport({ dateRange }: WorkOrdersPerformanceReportProps) {
  const { data, isLoading } = useWorkOrdersPerformanceReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Work Orders Performance</CardTitle>
            <CardDescription>Work order completion and efficiency metrics</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Work Orders</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{data.completionRate}%</p>
            </div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">{data.avgResolutionDays}</p>
            </div>
            <p className="text-sm text-muted-foreground">Avg Days to Complete</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-3xl font-bold text-destructive">{data.overdue}</p>
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-red-600" />
              <p className="text-3xl font-bold text-red-600">{data.byPriority.emergency}</p>
            </div>
            <p className="text-sm text-muted-foreground">Emergency</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div>
          <h4 className="font-medium mb-3">Status Breakdown</h4>
          <div className="grid gap-4 md:grid-cols-5">
            <StatusCard label="Pending" count={data.byStatus.pending} total={data.total} color="bg-slate-400" icon={Clock} />
            <StatusCard label="Assigned" count={data.byStatus.assigned} total={data.total} color="bg-blue-400" icon={Clock} />
            <StatusCard label="In Progress" count={data.byStatus.in_progress} total={data.total} color="bg-amber-500" icon={Wrench} />
            <StatusCard label="Completed" count={data.byStatus.completed} total={data.total} color="bg-green-500" icon={CheckCircle2} />
            <StatusCard label="Verified" count={data.byStatus.verified} total={data.total} color="bg-emerald-600" icon={CheckCircle2} />
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium mb-4">By Priority</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <Zap className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Emergency</p>
                    <p className="text-xs text-muted-foreground">24-hour response required</p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-lg px-3">
                  {data.byPriority.emergency}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Routine</p>
                    <p className="text-xs text-muted-foreground">Standard maintenance</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-3">
                  {data.byPriority.routine}
                </Badge>
              </div>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="rounded-lg border bg-card p-4">
            <h4 className="font-medium mb-4">Overall Progress</h4>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-5xl font-bold">{data.completionRate}%</p>
                <p className="text-sm text-muted-foreground mt-1">Work Orders Completed</p>
              </div>
              <Progress value={data.completionRate} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.byStatus.completed + data.byStatus.verified} completed</span>
                <span>{data.byStatus.pending + data.byStatus.assigned + data.byStatus.in_progress} pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Work Orders */}
        <div>
          <h4 className="font-medium mb-3">Recent Work Orders</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workOrders.slice(0, 10).map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(wo.created_at), 'MMM d')}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {wo.title}
                    </TableCell>
                    <TableCell>
                      {(wo as any).property?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={wo.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={wo.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(wo.due_date), 'MMM d')}
                    </TableCell>
                  </TableRow>
                ))}
                {data.workOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No work orders found in this date range
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

function StatusCard({ 
  label, 
  count, 
  total, 
  color, 
  icon: Icon 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-2`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-xl font-bold">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{percentage}%</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'emergency') {
    return <Badge variant="destructive">Emergency</Badge>;
  }
  return <Badge variant="secondary">Routine</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
    verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  };
  const { label, className } = config[status] || { label: status, className: '' };
  return <Badge variant="outline" className={className}>{label}</Badge>;
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
