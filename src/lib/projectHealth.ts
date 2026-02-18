import { differenceInDays } from 'date-fns';
import { CheckCircle, AlertTriangle, XCircle, PauseCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type HealthStatus = 'on_track' | 'at_risk' | 'overdue' | 'stalled';

export interface HealthConfig {
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const HEALTH_CONFIG: Record<HealthStatus, HealthConfig> = {
  on_track: {
    label: 'On Track',
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-950/30',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  overdue: {
    label: 'Overdue',
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
  },
  stalled: {
    label: 'Stalled',
    icon: PauseCircle,
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

export interface ProjectForHealth {
  target_end_date?: string | null;
  budget?: number | string | null;
  spent?: number | string | null;
  updated_at: string;
  status?: string | null;
}

export function computeHealth(project: ProjectForHealth): HealthStatus {
  const daysUntilEnd = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null;

  const budgetPct =
    project.budget && project.spent
      ? (Number(project.spent) / Number(project.budget)) * 100
      : 0;

  const daysSinceUpdate = differenceInDays(new Date(), new Date(project.updated_at));

  if (daysUntilEnd !== null && daysUntilEnd < 0) return 'overdue';
  if (daysSinceUpdate > 14 && project.status === 'active') return 'stalled';
  if (budgetPct > 90 || (daysUntilEnd !== null && daysUntilEnd < 7)) return 'at_risk';
  return 'on_track';
}
