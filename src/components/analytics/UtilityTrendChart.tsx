import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useUtilityBillSummary } from '@/hooks/useUtilityBills';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface UtilityTrendChartProps {
  propertyId: string;
  year: number;
}

const UTILITY_COLORS: Record<string, string> = {
  electric: '#F59E0B',
  water:    '#3B82F6',
  gas:      '#F97316',
  sewer:    '#14B8A6',
  trash:    '#6B7280',
  internet: '#EC4899',
  other:    '#8B5CF6',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const FILTERS = ['All', 'Electric', 'Water', 'Gas', 'Sewer', 'Trash'];

function buildMonthlyData(
  rawData: Array<{ utility_type: string; month: string; total_amount: number; total_consumption: number | null }>,
  filterType?: string
) {
  // Build 12-month scaffold
  const scaffold: Record<string, Record<string, number>> = {};
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, '0');
    scaffold[key] = {};
  }

  for (const row of rawData) {
    const monthNum = row.month.slice(5, 7); // YYYY-MM → MM
    if (!scaffold[monthNum]) continue;
    if (filterType && row.utility_type !== filterType) continue;
    scaffold[monthNum][row.utility_type] = (scaffold[monthNum][row.utility_type] ?? 0) + row.total_amount;
  }

  return Object.entries(scaffold).map(([mm, vals]) => ({
    month: MONTHS[parseInt(mm) - 1],
    ...vals,
  }));
}

function buildConsumptionData(
  rawData: Array<{ utility_type: string; month: string; total_consumption: number | null }>,
  filterType: string
) {
  const scaffold: Record<string, number | null> = {};
  for (let m = 1; m <= 12; m++) {
    scaffold[String(m).padStart(2, '0')] = null;
  }
  for (const row of rawData) {
    if (row.utility_type !== filterType) continue;
    const mm = row.month.slice(5, 7);
    scaffold[mm] = (scaffold[mm] ?? 0) + (row.total_consumption ?? 0);
  }
  return Object.entries(scaffold).map(([mm, val]) => ({
    month: MONTHS[parseInt(mm) - 1],
    consumption: val,
  }));
}

export function UtilityTrendChart({ propertyId, year }: UtilityTrendChartProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const { data, isLoading } = useUtilityBillSummary(propertyId, year);

  const filterType = activeFilter === 'All' ? undefined : activeFilter.toLowerCase();
  const chartData = buildMonthlyData(data ?? [], filterType);

  const presentTypes = [...new Set((data ?? []).map((d) => d.utility_type))];
  const displayTypes = filterType ? [filterType] : presentTypes;

  const consumptionData = filterType
    ? buildConsumptionData(data ?? [], filterType)
    : [];

  const hasConsumption = filterType && (data ?? []).some(
    (d) => d.utility_type === filterType && d.total_consumption != null
  );

  if (isLoading) {
    return <Skeleton className="w-full h-72 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Header + pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">Utility Spend by Month</h3>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={
                activeFilter === f
                  ? 'rounded-full px-3 py-1 text-xs font-medium bg-primary text-primary-foreground'
                  : 'rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Main chart */}
      <ResponsiveContainer width="100%" height={280}>
        {activeFilter === 'All' ? (
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value: number, name: string) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
            {displayTypes.map((type) => (
              <Bar key={type} dataKey={type} stackId="a" fill={UTILITY_COLORS[type] ?? '#8B5CF6'} radius={[0, 0, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, activeFilter]}
              contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
            />
            {filterType && (
              <Line
                type="monotone"
                dataKey={filterType}
                stroke={UTILITY_COLORS[filterType] ?? '#8B5CF6'}
                strokeWidth={2.5}
                dot={{ r: 4, fill: UTILITY_COLORS[filterType] ?? '#8B5CF6' }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Consumption secondary chart */}
      {hasConsumption && consumptionData.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            Consumption trend — this shows if you're using <em>more</em> or just <em>spending</em> more.
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={consumptionData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [value, 'Consumption']}
                contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
              />
              <Line
                type="monotone"
                dataKey="consumption"
                stroke={UTILITY_COLORS[filterType!] ?? '#8B5CF6'}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
