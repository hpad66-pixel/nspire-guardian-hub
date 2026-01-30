import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useDefectsAnalysisReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface DefectsAnalysisReportProps {
  dateRange?: DateRange;
}

export function DefectsAnalysisReport({ dateRange }: DefectsAnalysisReportProps) {
  const { data, isLoading } = useDefectsAnalysisReport(dateRange);

  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle>Defects Analysis</CardTitle>
            <CardDescription>Defect trends by severity and category</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.total}</p>
            <p className="text-sm text-muted-foreground">Total Defects</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">{data.repaired}</p>
            </div>
            <p className="text-sm text-muted-foreground">Repaired</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <p className="text-3xl font-bold text-amber-600">{data.pending}</p>
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <p className="text-3xl font-bold">{data.resolutionRate}%</p>
            <p className="text-sm text-muted-foreground">Resolution Rate</p>
          </div>
        </div>

        {/* Severity Breakdown */}
        <div>
          <h4 className="font-medium mb-3">By Severity</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <SeverityCard 
              label="Severe" 
              count={data.bySeverity.severe} 
              total={data.total}
              color="bg-destructive"
              icon={XCircle}
            />
            <SeverityCard 
              label="Moderate" 
              count={data.bySeverity.moderate} 
              total={data.total}
              color="bg-amber-500"
              icon={AlertTriangle}
            />
            <SeverityCard 
              label="Low" 
              count={data.bySeverity.low} 
              total={data.total}
              color="bg-blue-500"
              icon={Clock}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <h4 className="font-medium mb-3">By Category</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([category, count]) => (
                    <TableRow key={category}>
                      <TableCell className="font-medium">{category}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell className="text-right">
                        {data.total > 0 ? Math.round((count / data.total) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                {Object.keys(data.byCategory).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No defects found in this date range
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Defects */}
        <div>
          <h4 className="font-medium mb-3">Recent Defects</h4>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.defects.slice(0, 10).map((defect) => (
                  <TableRow key={defect.id}>
                    <TableCell>{format(new Date(defect.created_at), 'MMM d')}</TableCell>
                    <TableCell className="font-medium">
                      {(defect as any).inspection?.property?.name || '—'}
                    </TableCell>
                    <TableCell>{defect.item_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {defect.defect_condition}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={defect.severity} />
                    </TableCell>
                    <TableCell>
                      {defect.repaired_at ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">Repaired</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityCard({ 
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
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <Progress value={percentage} className={`h-2 [&>div]:${color}`} />
      <p className="text-xs text-muted-foreground">{percentage}% of total defects</p>
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
