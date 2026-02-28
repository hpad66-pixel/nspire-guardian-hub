import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerPortfolioScore, useOwnerProjects, useOwnerComplianceEvents } from '@/hooks/useOwnerPortal';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const statusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  on_track: 'bg-green-100 text-green-800',
  at_risk: 'bg-amber-100 text-amber-800',
  delayed: 'bg-red-100 text-red-800',
  on_hold: 'bg-muted text-muted-foreground',
  completed: 'bg-blue-100 text-blue-800',
};

export default function OwnerOverviewPage() {
  const { user } = useAuth();
  const { data: score } = useOwnerPortfolioScore();
  const { data: projects = [] } = useOwnerProjects();
  const { data: compliance = [] } = useOwnerComplianceEvents();

  const firstName = (user?.user_metadata?.full_name as string)?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const scoreColor = (score?.score ?? 0) >= 80 ? 'text-green-600' : (score?.score ?? 0) >= 60 ? 'text-amber-500' : 'text-red-500';

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'closed');

  const overdue = compliance.filter(c => c.due_date && isPast(new Date(c.due_date)));
  const due30 = compliance.filter(c => {
    if (!c.due_date) return false;
    const d = new Date(c.due_date);
    return !isPast(d) && differenceInDays(d, new Date()) <= 30;
  });
  const upcoming = compliance.filter(c => {
    if (!c.due_date) return false;
    return differenceInDays(new Date(c.due_date), new Date()) > 30;
  });

  const subScores = [
    { label: 'Inspection Coverage', value: score?.inspection ?? 0 },
    { label: 'Permit Compliance', value: score?.compliance ?? 0 },
    { label: 'Maintenance Health', value: score?.maintenance ?? 0 },
    { label: 'Project Health', value: score?.projects ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'Georgia, serif' }}>
          {greeting}, {firstName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(new Date(), 'MMMM dd, yyyy')}
        </p>
      </div>

      {/* Portfolio Score */}
      <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex flex-col items-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Portfolio Score</p>
          <p className={cn('mt-2 text-7xl font-bold tabular-nums', scoreColor)} style={{ fontFamily: 'monospace' }}>
            {score?.score ?? '—'}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {subScores.map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground" style={{ fontFamily: 'monospace' }}>{s.value}%</p>
              <Progress value={s.value} className="mt-2 h-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Projects */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-foreground">Active Projects</h2>
          <Badge variant="secondary">{activeProjects.length}</Badge>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {activeProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No active projects.</p>
          )}
          {activeProjects.map(p => {
            const pct = p.budget ? Math.round(((p.spent ?? 0) / p.budget) * 100) : 0;
            const budgetColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
            const endPast = p.target_end_date && isPast(new Date(p.target_end_date));
            const propertyName = (p as any).property?.name;

            return (
              <div key={p.id} className="min-w-[240px] shrink-0 rounded-lg border border-border bg-background p-4 shadow-sm">
                <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                {propertyName && <p className="truncate text-xs text-muted-foreground">{propertyName}</p>}
                <Badge className={cn('mt-2 text-[10px]', statusColor[p.status ?? ''] ?? 'bg-muted text-muted-foreground')}>
                  {p.status?.replace('_', ' ')}
                </Badge>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${(p.spent ?? 0).toLocaleString()}</span>
                    <span>${(p.budget ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', budgetColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                {p.target_end_date && (
                  <p className={cn('mt-2 text-xs', endPast ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                    {endPast ? 'Overdue' : `in ${formatDistanceToNow(new Date(p.target_end_date))}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Summary */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Compliance Overview</h2>
        <div className="flex gap-3 mb-4">
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            {overdue.length} Overdue
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {due30.length} Due in 30 Days
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            {upcoming.length} Upcoming
          </span>
        </div>
        <div className="space-y-2">
          {compliance.slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <span className="text-sm text-foreground">{c.title}</span>
              <div className="flex items-center gap-3">
                {c.agency && <Badge variant="outline" className="text-[10px]">{c.agency}</Badge>}
                <span className={cn('text-xs', c.due_date && isPast(new Date(c.due_date)) ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                  {c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : '—'}
                </span>
              </div>
            </div>
          ))}
          {compliance.length === 0 && <p className="text-sm text-muted-foreground">No pending compliance events.</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Questions about this report? Contact{' '}
          <a href="mailto:hardeep@apas.ai" className="font-medium text-primary hover:underline">
            Hardeep Anand, P.E.
          </a>
        </p>
      </div>
    </div>
  );
}
