/**
 * Connects inspections ↔ daily reports ↔ compliance permits ↔ reports archive
 * inside Property Management so users don't bounce across buckets.
 */
import { Link } from 'react-router-dom';
import { ClipboardCheck, ClipboardList, FileBarChart2, ArrowRight, Sun, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  {
    to: '/inspections',
    label: 'NSPIRE',
    hint: 'Conduct / review inspections',
    icon: ClipboardCheck,
  },
  {
    to: '/inspections/daily',
    label: 'Daily Grounds',
    hint: 'Walk the property today',
    icon: Sun,
  },
  {
    to: '/daily-reports',
    label: 'Daily Reports',
    hint: 'View field reports',
    icon: ClipboardList,
  },
  {
    to: '/permits',
    label: 'Compliance Permits',
    hint: 'Scan & track property permits',
    icon: Shield,
  },
  {
    to: '/reports',
    label: 'Reports archive',
    hint: 'Analytics & history',
    icon: FileBarChart2,
  },
] as const;

export function FieldReportsStrip({
  className,
  highlight,
}: {
  className?: string;
  /** Soft-highlight the current surface */
  highlight?: 'nspire' | 'grounds' | 'daily-reports' | 'permits' | 'reports';
}) {
  const activeFor = (to: string) => {
    if (highlight === 'nspire' && to === '/inspections') return true;
    if (highlight === 'grounds' && to === '/inspections/daily') return true;
    if (highlight === 'daily-reports' && to === '/daily-reports') return true;
    if (highlight === 'permits' && to === '/permits') return true;
    if (highlight === 'reports' && to === '/reports') return true;
    return false;
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--apas-sapphire)]/15 bg-gradient-to-br from-[var(--apas-sapphire)]/[0.06] via-card to-card p-4 shadow-sm',
        className,
      )}
      data-testid="field-reports-strip"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Inspect &amp; report</h3>
          <p className="text-xs text-muted-foreground">
            Run an inspection, then view daily reports in the same Property Management bucket.
          </p>
        </div>
      </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {LINKS.map((item) => {
          const active = activeFor(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'group flex items-center gap-3 rounded-xl border bg-background/80 px-3 py-3 transition hover:border-[var(--apas-sapphire)]/40 hover:shadow-sm',
                active && 'border-[var(--apas-sapphire)]/50 bg-[var(--apas-sapphire)]/5 ring-1 ring-[var(--apas-sapphire)]/20',
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
