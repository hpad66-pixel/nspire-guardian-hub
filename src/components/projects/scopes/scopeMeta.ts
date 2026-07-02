import type { ScopeStatus } from '@/hooks/useProjectScopes';

export const SCOPE_STATUS_META: Record<ScopeStatus, { label: string; className: string }> = {
  not_started: { label: 'Not started', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In progress', className: 'bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]' },
  blocked:     { label: 'Blocked',     className: 'bg-[var(--apas-rose)]/10 text-[var(--apas-rose)]' },
  complete:    { label: 'Complete',    className: 'bg-[var(--apas-emerald)]/10 text-[var(--apas-emerald)]' },
};

export const SCOPE_STATUS_ORDER: ScopeStatus[] = ['not_started', 'in_progress', 'blocked', 'complete'];

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
