import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, DollarSign, TrendingUp, Clock, CheckCircle2, Pause } from 'lucide-react';
import { useProjectStatusReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface ProjectStatusReportProps {
  dateRange?: DateRange;
}

export function ProjectStatusReport({ dateRange }: ProjectStatusReportProps) {
  const { data, isLoading } = useProjectStatusReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const spentPercentage = data.financials.adjustedBudget > 0
    ? Math.round((data.financials.totalSpent / data.financials.adjustedBudget) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500">
            <FolderKanban className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Project Status Summary</CardTitle>
            <CardDescription>Project progress and financial overview</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Projects</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">{data.byStatus.active}</p>
            </div>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <p className="text-3xl font-bold text-amber-600">{data.byStatus.planning}</p>
            </div>
            <p className="text-sm text-muted-foreground">Planning</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Pause className="h-5 w-5 text-slate-500" />
              <p className="text-3xl font-bold text-slate-500">{data.byStatus.on_hold}</p>
            </div>
            <p className="text-sm text-muted-foreground">On Hold</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{data.byStatus.completed}</p>
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium">Financial Overview</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Original Budget</span>
                <span className="font-medium">{formatCurrency(data.financials.totalBudget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Change Orders</span>
                <span className="font-medium text-green-600">+{formatCurrency(data.financials.totalCOAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Adjusted Budget</span>
                <span className="font-bold text-lg">{formatCurrency(data.financials.adjustedBudget)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h4 className="font-medium mb-4">Budget Utilization</h4>
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-4xl font-bold">{spentPercentage}%</p>
                <p className="text-sm text-muted-foreground">of budget spent</p>
              </div>
              <Progress value={Math.min(spentPercentage, 100)} className="h-3" />
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Spent</p>
                  <p className="font-medium">{formatCurrency(data.financials.totalSpent)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Remaining</p>
                  <p className={`font-medium ${data.financials.remaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(data.financials.remaining)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Table */}
        <div>
          <h4 className="font-medium mb-3">Project Details</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Change Orders</TableHead>
                  <TableHead className="text-center">Milestones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.map((project) => {
                  const budget = project.adjustedBudget || 0;
                  const spent = Number(project.spent) || 0;
                  const utilization = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {(project as any).property?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(project.adjustedBudget)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p>{formatCurrency(spent)}</p>
                          <p className="text-xs text-muted-foreground">{utilization}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {project.changeOrderCount > 0 ? (
                          <div>
                            <p>{project.changeOrderCount}</p>
                            <p className="text-xs text-green-600">+{formatCurrency(project.approvedCOAmount)}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {project.milestoneCount > 0 ? (
                          <Badge variant="outline">
                            {project.completedMilestones}/{project.milestoneCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data.projects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No projects found
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    planning: { label: 'Planning', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    active: { label: 'Active', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    on_hold: { label: 'On Hold', className: 'bg-slate-100 text-slate-700 border-slate-200' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
    closed: { label: 'Closed', className: 'bg-slate-100 text-slate-700 border-slate-200' },
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
