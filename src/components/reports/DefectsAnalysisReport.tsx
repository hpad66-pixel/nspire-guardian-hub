import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/ui/severity-badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, XCircle, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { useDefectsAnalysisReport, type DateRange } from '@/hooks/useReports';
import { format } from 'date-fns';

interface DefectsAnalysisReportProps {
  dateRange?: DateRange;
}

const SEVERITY_COLORS = {
  severe: 'hsl(var(--destructive))',
  moderate: 'hsl(45 93% 47%)',
  low: 'hsl(220 70% 55%)',
};

export function DefectsAnalysisReport({ dateRange }: DefectsAnalysisReportProps) {
  const { data, isLoading } = useDefectsAnalysisReport(dateRange);

  const severityPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Severe', value: data.bySeverity.severe, fill: SEVERITY_COLORS.severe },
      { name: 'Moderate', value: data.bySeverity.moderate, fill: SEVERITY_COLORS.moderate },
      { name: 'Low', value: data.bySeverity.low, fill: SEVERITY_COLORS.low },
    ].filter(d => d.value > 0);
  }, [data]);

  const categoryBarData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));
  }, [data]);

  const chartConfig = {
    count: { label: 'Defects', color: 'hsl(var(--destructive))' },
  };

  // Identify LT defects
  const ltDefects = data?.defects.filter((d: any) => d.life_threatening) || [];

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
            <CardDescription>NSPIRE defect trends with scoring impact analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
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
          <div className="rounded-lg border bg-card p-4 text-center border-destructive/30">
            <p className="text-3xl font-bold text-destructive">{ltDefects.length}</p>
            <p className="text-sm text-muted-foreground">Life-Threatening</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Severity Pie */}
          <div>
            <h4 className="font-medium mb-3">By Severity</h4>
            {severityPieData.length > 0 ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {severityPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value} defects`, name]} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data</div>
            )}
          </div>

          {/* Category Bar */}
          <div>
            <h4 className="font-medium mb-3">By Category (Top 10)</h4>
            {categoryBarData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[220px]">
                <BarChart data={categoryBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No data</div>
            )}
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {defect.item_name}
                        {(defect as any).life_threatening && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">LT</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {defect.defect_condition}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={defect.severity} lifeThreatening={(defect as any).life_threatening} />
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
