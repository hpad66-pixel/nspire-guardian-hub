/**
 * Interactive permit analytics — status donut, trade bars, building readiness, aging.
 * Click a slice/bar to filter the register (parent owns filter state).
 */
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
import { Card, CardContent } from '@/components/ui/card';
import {
  agingBreakdown,
  buildingReadiness,
  closeoutPipeline,
  daysOpen,
  groupByTrade,
  isCityBlocked,
  statusBreakdown,
  type ProjectPermitLike,
} from '@/lib/permits/projectPermitStats';
import { cn } from '@/lib/utils';

export type PermitAnalyticsFilter =
  | { type: 'all' }
  | { type: 'status'; key: string }
  | { type: 'trade'; key: string }
  | { type: 'building'; key: string }
  | { type: 'aging'; key: string }
  | { type: 'pipeline'; key: string };

interface PermitAnalyticsChartsProps {
  permits: ProjectPermitLike[];
  filter: PermitAnalyticsFilter;
  onFilterChange: (filter: PermitAnalyticsFilter) => void;
  /** Softer styling for the owner portal. */
  variant?: 'internal' | 'owner';
}

function toggleFilter(
  current: PermitAnalyticsFilter,
  next: PermitAnalyticsFilter,
): PermitAnalyticsFilter {
  if (
    current.type === next.type
    && 'key' in current
    && 'key' in next
    && current.key === next.key
  ) {
    return { type: 'all' };
  }
  return next;
}

export function PermitAnalyticsCharts({
  permits,
  filter,
  onFilterChange,
  variant = 'internal',
}: PermitAnalyticsChartsProps) {
  const status = statusBreakdown(permits);
  const trades = groupByTrade(permits).slice(0, 6);
  const buildings = buildingReadiness(permits);
  const aging = agingBreakdown(permits);
  const pipeline = closeoutPipeline(permits);

  const soft = variant === 'owner';

  return (
    <div className="space-y-4" data-testid="permit-analytics-charts">
      {/* Interactive closeout pipeline strip */}
      <div className="grid gap-2 sm:grid-cols-3">
        {pipeline.map((step, i) => {
          const active = filter.type === 'pipeline' && filter.key === step.key;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() =>
                onFilterChange(toggleFilter(filter, { type: 'pipeline', key: step.key }))
              }
              className={cn(
                'group relative rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                active
                  ? 'border-[#0D3B30] ring-2 ring-[#0D3B30]/25 shadow-md'
                  : soft
                    ? 'border-slate-200 bg-white/80'
                    : 'border-border/70 bg-card',
              )}
            >
              {i < pipeline.length - 1 && (
                <span
                  className="pointer-events-none absolute -right-1 top-1/2 z-10 hidden h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-border/60 bg-background sm:block"
                  aria-hidden
                />
              )}
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {step.label}
                </span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: step.fill }}
                />
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums" style={{ color: step.fill }}>
                {step.count}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status donut */}
        <Card className={cn('shadow-sm', soft ? 'border-slate-200/80' : 'border-border/70')}>
          <CardContent className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Status mix</h3>
              <span className="text-[11px] text-muted-foreground">Click to filter</span>
            </div>
            {status.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No permits yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={status}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      cursor="pointer"
                      onClick={(_, index) => {
                        const slice = status[index];
                        if (!slice) return;
                        onFilterChange(
                          toggleFilter(filter, { type: 'status', key: slice.key }),
                        );
                      }}
                    >
                      {status.map((d) => (
                        <Cell
                          key={d.key}
                          fill={d.fill}
                          opacity={
                            filter.type === 'status' && filter.key !== d.key ? 0.35 : 1
                          }
                          stroke={
                            filter.type === 'status' && filter.key === d.key
                              ? '#0D3B30'
                              : 'transparent'
                          }
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, name: string) => [`${v} permits`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  {status.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() =>
                        onFilterChange(toggleFilter(filter, { type: 'status', key: d.key }))
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors',
                        filter.type === 'status' && filter.key === d.key
                          ? 'border-[#0D3B30] bg-[#0D3B30]/10'
                          : 'border-transparent hover:bg-muted',
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                      {d.name} {d.value}
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Trade bars */}
        <Card className={cn('shadow-sm', soft ? 'border-slate-200/80' : 'border-border/70')}>
          <CardContent className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">By trade</h3>
              <span className="text-[11px] text-muted-foreground">Click a bar to filter</span>
            </div>
            {trades.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No trade data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={trades}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000010" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => [`${v} permits`, 'Count']} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data) => {
                      const name = (data as { name?: string })?.name;
                      if (!name) return;
                      onFilterChange(
                        toggleFilter(filter, { type: 'trade', key: name.toLowerCase() }),
                      );
                    }}
                  >
                    {trades.map((d) => (
                      <Cell
                        key={d.key}
                        fill={
                          filter.type === 'trade' && filter.key === d.key
                            ? '#0D3B30'
                            : '#1D6FE8'
                        }
                        opacity={
                          filter.type === 'trade' && filter.key !== d.key ? 0.35 : 1
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Building readiness */}
        <Card className={cn('shadow-sm', soft ? 'border-slate-200/80' : 'border-border/70')}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Building closeout %</h3>
              <span className="text-[11px] text-muted-foreground">Click to focus</span>
            </div>
            {buildings.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No buildings</p>
            ) : (
              <ul className="space-y-2.5">
                {buildings.map((b) => {
                  const active =
                    filter.type === 'building' && filter.key === b.key;
                  const pct = b.percent ?? 0;
                  return (
                    <li key={b.key}>
                      <button
                        type="button"
                        onClick={() =>
                          onFilterChange(
                            toggleFilter(filter, { type: 'building', key: b.key }),
                          )
                        }
                        className={cn(
                          'w-full rounded-xl border px-3 py-2.5 text-left transition-all',
                          active
                            ? 'border-[#0D3B30] bg-[#0D3B30]/5 ring-1 ring-[#0D3B30]/20'
                            : 'border-border/60 hover:bg-muted/40',
                        )}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="font-semibold">{b.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {b.closed}/{b.value} · <strong className="text-foreground">{pct}%</strong>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              background:
                                pct >= 100
                                  ? '#10B981'
                                  : pct >= 50
                                    ? '#C4A35A'
                                    : '#F59E0B',
                            }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Aging urgency */}
        <Card className={cn('shadow-sm', soft ? 'border-slate-200/80' : 'border-border/70')}>
          <CardContent className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Open permit age</h3>
              <span className="text-[11px] text-muted-foreground">Urgency for chase</span>
            </div>
            {aging.length === 0 ? (
              <p className="py-10 text-center text-sm text-emerald-700">
                No open permits — age chart clears when the register is closed.
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aging} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip formatter={(v: number) => [`${v} open`, 'Count']} />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const key = (data as { key?: string })?.key;
                        if (!key) return;
                        onFilterChange(
                          toggleFilter(filter, { type: 'aging', key }),
                        );
                      }}
                    >
                      {aging.map((d) => (
                        <Cell
                          key={d.key}
                          fill={d.fill}
                          opacity={
                            filter.type === 'aging' && filter.key !== d.key ? 0.35 : 1
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-1 text-xs text-muted-foreground">
                  Age is measured from the city issue date. 61+ day opens are the chase priority.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {filter.type !== 'all' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Active chart filter:</span>
          <button
            type="button"
            onClick={() => onFilterChange({ type: 'all' })}
            className="rounded-full border border-[#0D3B30]/30 bg-[#0D3B30]/10 px-3 py-1 text-xs font-semibold text-[#0D3B30] hover:bg-[#0D3B30]/15"
          >
            Clear filter ×
          </button>
        </div>
      )}
    </div>
  );
}

/** Apply analytics filter + text search to the permit register. */
export function applyPermitAnalyticsFilter(
  permits: ProjectPermitLike[],
  filter: PermitAnalyticsFilter,
  opts?: { asOf?: Date },
): ProjectPermitLike[] {
  if (filter.type === 'all') return permits;
  const asOf = opts?.asOf ?? new Date();
  return permits.filter((p) => {
    if (filter.type === 'status') {
      return (p.status || '').toLowerCase() === filter.key;
    }
    if (filter.type === 'trade') {
      return ((p.trade || 'Unspecified').trim() || 'Unspecified').toLowerCase() === filter.key;
    }
    if (filter.type === 'building') {
      return ((p.building || 'Site / other').trim() || 'Site / other').toLowerCase() === filter.key;
    }
    if (filter.type === 'pipeline') {
      if (filter.key === 'closed') return (p.status || '').toLowerCase() === 'closed';
      if (filter.key === 'open_active') return (p.status || '').toLowerCase() === 'open_active';
      if (filter.key === 'city_wait') return isCityBlocked(p);
    }
    if (filter.type === 'aging') {
      if ((p.status || '').toLowerCase() === 'closed') return false;
      const d = daysOpen(p, asOf);
      if (filter.key === 'unknown') return d == null;
      if (filter.key === '0_30') return d != null && d <= 30;
      if (filter.key === '31_60') return d != null && d > 30 && d <= 60;
      if (filter.key === '61_plus') return d != null && d > 60;
    }
    return true;
  });
}
