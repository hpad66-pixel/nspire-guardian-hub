import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  CategorySpend,
  MonthlyIssue,
  PartMover,
  RepeatOffender,
  UnitHeat,
} from '@/lib/stores/storesAnalytics';

const COLORS = ['#0D3B30', '#C4A35A', '#1D6FE8', '#F59E0B', '#10B981', '#F43F5E', '#878581'];

export function StoresAnalyticsCharts({
  byCategory,
  byMonth,
  topParts,
  byUnit,
  repeats,
}: {
  byCategory: CategorySpend[];
  byMonth: MonthlyIssue[];
  topParts: PartMover[];
  byUnit: UnitHeat[];
  repeats: RepeatOffender[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="stores-analytics-charts">
      <Card className="border-[#0D3B30]/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Issues by month</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {byMonth.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qty" name="Parts issued" fill="#0D3B30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#0D3B30]/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spend by trade</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {byCategory.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="spend" nameKey="category" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`$${Number(v).toFixed(2)}`, 'Spend']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#0D3B30]/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top replaced parts</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {topParts.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topParts} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="qty" name="Qty" fill="#C4A35A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#0D3B30]/15 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Units with most repairs</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          {byUnit.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                <XAxis dataKey="unit" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="issues" name="Issues" fill="#1D6FE8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {repeats.length > 0 && (
        <Card className="border-amber-300/50 bg-amber-50/40 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Repeat offenders — same part, same unit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {repeats.slice(0, 8).map((r) => (
              <span
                key={`${r.itemId}-${r.unit}`}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                {r.name} · {r.unit} · {r.count}×
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Empty() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}
