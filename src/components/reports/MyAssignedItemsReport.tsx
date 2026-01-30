import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Wrench, AtSign, Clock, AlertCircle } from 'lucide-react';
import { useMyAssignedItemsReport } from '@/hooks/useReports';
import { format } from 'date-fns';

export function MyAssignedItemsReport() {
  const { data, isLoading } = useMyAssignedItemsReport();

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>My Assigned Items</CardTitle>
            <CardDescription>Issues and work orders assigned to you that need attention</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalAssignedIssues}</p>
                <p className="text-sm text-muted-foreground">Assigned Issues</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalAssignedWorkOrders}</p>
                <p className="text-sm text-muted-foreground">Work Orders</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <AtSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.totalMentions}</p>
                <p className="text-sm text-muted-foreground">Mentions</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {data.overdueIssues + data.overdueWorkOrders}
                </p>
                <p className="text-sm text-muted-foreground">Overdue Items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assigned Issues */}
        {data.assignedIssues.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Assigned Issues ({data.assignedIssues.length})
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assignedIssues.map((issue) => {
                    const isOverdue = issue.deadline && new Date(issue.deadline) < new Date();
                    return (
                      <TableRow key={issue.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{issue.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(issue as any).property?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={issue.severity} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={issue.status || 'open'} />
                        </TableCell>
                        <TableCell>
                          {issue.deadline ? (
                            <div className="flex items-center gap-2">
                              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                {format(new Date(issue.deadline), 'MMM d')}
                              </span>
                              {isOverdue && <Clock className="h-3 w-3 text-destructive" />}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Assigned Work Orders */}
        {data.assignedWorkOrders.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-600" />
              Assigned Work Orders ({data.assignedWorkOrders.length})
            </h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assignedWorkOrders.map((wo) => {
                    const isOverdue = new Date(wo.due_date) < new Date();
                    return (
                      <TableRow key={wo.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium">{wo.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(wo as any).property?.name || '—'}
                        </TableCell>
                        <TableCell>
                          {wo.priority === 'emergency' ? (
                            <Badge variant="destructive">Emergency</Badge>
                          ) : (
                            <Badge variant="secondary">Routine</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <WorkOrderStatusBadge status={wo.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                              {format(new Date(wo.due_date), 'MMM d')}
                            </span>
                            {isOverdue && <Clock className="h-3 w-3 text-destructive" />}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.assignedIssues.length === 0 && data.assignedWorkOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">No items assigned to you</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        )}
      </CardContent>
    </Card>
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

function WorkOrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    assigned: { label: 'Assigned', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
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
