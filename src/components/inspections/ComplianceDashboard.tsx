import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { NspireScoreGauge } from './NspireScoreGauge';
import { PriorityPyramid } from './PriorityPyramid';
import { useProperties } from '@/hooks/useProperties';
import { usePropertyScore, useUnitPerformanceScore, useSampleSize } from '@/hooks/useNspireScoring';
import { useDefectStats, useOpenDefects } from '@/hooks/useDefects';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ShieldAlert, Target, AlertTriangle, CheckCircle2, TrendingDown, Calendar, Activity } from 'lucide-react';
import type { DefectForScoring } from '@/lib/nspire-scoring';

const CHART_COLORS = [
  'hsl(var(--destructive))',
  'hsl(45 93% 47%)',
  'hsl(220 70% 55%)',
  'hsl(160 60% 45%)',
  'hsl(280 60% 55%)',
  'hsl(20 80% 55%)',
];

export function ComplianceDashboard() {
  const { data: properties } = useProperties();
  const nspireProperties = properties?.filter(p => p.nspire_enabled) || [];
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  // Auto-select first property
  const propertyId = selectedPropertyId || nspireProperties[0]?.id || null;

  const { data: scoreBreakdown, isLoading: scoreLoading } = usePropertyScore(propertyId);
  const { data: ups, isLoading: upsLoading } = useUnitPerformanceScore(propertyId);
  const { data: sampleSize } = useSampleSize(propertyId);
  const { data: defectStats } = useDefectStats();
  const { data: openDefects } = useOpenDefects();

  // Build defects for pyramid from open defects (simplified)
  const pyramidDefects: DefectForScoring[] = useMemo(() => {
    if (!openDefects) return [];
    return openDefects.map((d: any) => ({
      id: d.id,
      nspireItemId: d.nspire_item_id,
      category: d.category,
      severity: d.severity,
      lifeThreatening: d.life_threatening ?? false,
      area: d.inspection?.area || 'unit',
      unitId: d.inspection?.unit_id,
      isUnscored: false,
      pointValue: d.point_value,
    }));
  }, [openDefects]);

  // Severity pie data
  const severityPieData = useMemo(() => {
    if (!defectStats) return [];
    return [
      { name: 'Severe', value: defectStats.severe, fill: 'hsl(var(--destructive))' },
      { name: 'Moderate', value: defectStats.moderate, fill: 'hsl(45 93% 47%)' },
      { name: 'Low', value: defectStats.low, fill: 'hsl(220 70% 55%)' },
    ].filter(d => d.value > 0);
  }, [defectStats]);

  // Category deduction bar data
  const deductionBarData = useMemo(() => {
    if (!scoreBreakdown) return [];
    return scoreBreakdown.deductions
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 8)
      .map(d => ({
        category: d.category,
        points: Number(d.totalPoints.toFixed(2)),
        defects: d.uniqueDefects,
      }));
  }, [scoreBreakdown]);

  const chartConfig = {
    points: { label: 'Point Deductions', color: 'hsl(var(--destructive))' },
    defects: { label: 'Unique Defects', color: 'hsl(220 70% 55%)' },
  };

  if (nspireProperties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">No NSPIRE-Enabled Properties</p>
          <p className="text-sm text-muted-foreground">Enable NSPIRE compliance on a property to see scoring analytics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="flex items-center gap-4">
        <Select value={propertyId || ''} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {nspireProperties.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sampleSize && (
          <Badge variant="outline" className="text-xs">
            HUD Sample Size: {sampleSize} units
          </Badge>
        )}
      </div>

      {/* Score Cards Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* REAC Score Gauge */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              REAC Property Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {scoreLoading ? (
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
            ) : (
              <div className="relative">
                <NspireScoreGauge score={scoreBreakdown?.totalScore ?? 100} />
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-4 w-full text-center">
              <div>
                <p className="text-lg font-bold">{scoreBreakdown?.defectCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Defects</p>
              </div>
              <div>
                <p className="text-lg font-bold">{scoreBreakdown?.uniqueDefectCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Unique (Scored)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UPS + Auto-Fail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Unit Performance Score
            </CardTitle>
            <CardDescription>≥30 points = Automatic Failure</CardDescription>
          </CardHeader>
          <CardContent>
            {upsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className={`text-5xl font-bold ${ups?.isAutoFail ? 'text-destructive' : ups && ups.score >= 20 ? 'text-amber-500' : 'text-success'}`}>
                    {ups?.score?.toFixed(1) ?? '0.0'}
                  </p>
                  {ups?.isAutoFail && (
                    <Badge variant="destructive" className="mt-2">AUTO-FAIL — Score ≥ 30</Badge>
                  )}
                </div>
                <Progress
                  value={Math.min((ups?.score || 0) / 30 * 100, 100)}
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span className="text-destructive font-medium">Auto-Fail Threshold: 30</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Defect Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {severityPieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px]">
                <CheckCircle2 className="h-10 w-10 text-success mb-2" />
                <p className="text-sm text-muted-foreground">No open defects</p>
              </div>
            ) : (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {severityPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} defects`, name]}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Deductions & Priority Pyramid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Deductions Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" />
              Point Deductions by Category
            </CardTitle>
            <CardDescription>Top categories losing the most points</CardDescription>
          </CardHeader>
          <CardContent>
            {deductionBarData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px]">
                <CheckCircle2 className="h-10 w-10 text-success mb-2" />
                <p className="text-sm text-muted-foreground">No point deductions</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={deductionBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="points" fill="var(--color-points)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Pyramid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" />
              Priority Pyramid
            </CardTitle>
            <CardDescription>12-tier defect impact ranking (highest at top)</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityPyramid defects={pyramidDefects} />
          </CardContent>
        </Card>
      </div>

      {/* Scoring Breakdown Table */}
      {scoreBreakdown && scoreBreakdown.deductions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Breakdown</CardTitle>
            <CardDescription>Detailed point deductions per category with weights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2 px-4 text-left font-medium">Category</th>
                    <th className="py-2 px-4 text-right font-medium">Weight</th>
                    <th className="py-2 px-4 text-right font-medium">Unique Defects</th>
                    <th className="py-2 px-4 text-right font-medium">Points Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {scoreBreakdown.deductions
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((d) => (
                    <tr key={d.category} className="border-b">
                      <td className="py-2 px-4 font-medium">{d.category}</td>
                      <td className="py-2 px-4 text-right text-muted-foreground">{d.weight}</td>
                      <td className="py-2 px-4 text-right">{d.uniqueDefects}</td>
                      <td className="py-2 px-4 text-right font-mono text-destructive">-{d.totalPoints.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-medium">
                    <td className="py-2 px-4">Total</td>
                    <td className="py-2 px-4"></td>
                    <td className="py-2 px-4 text-right">{scoreBreakdown.uniqueDefectCount}</td>
                    <td className="py-2 px-4 text-right font-mono text-destructive">-{scoreBreakdown.totalDeductions.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
