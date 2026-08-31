import { HardHat, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  projectKind,
  projectKindLabel,
  isProjectTypeMissing,
  type ProjectKind,
} from '@/lib/projectKind';

const KIND_STYLE: Record<ProjectKind, string> = {
  construction:
    'bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-600',
  consulting:
    'bg-[var(--apas-sapphire)]/15 text-[var(--apas-sapphire)] border-[var(--apas-sapphire)]/40',
};

/**
 * Bold Construction / Consulting label for project cards and headers.
 * If project_type is missing or unrecognized, flash a critical warning —
 * billing mode (pay apps vs client invoices) depends on this field.
 */
export function ProjectKindBadge({
  project,
  className,
  size = 'sm',
}: {
  project: { project_type?: string | null };
  className?: string;
  size?: 'sm' | 'md';
}) {
  const missing = isProjectTypeMissing(project);
  if (missing) {
    return (
      <span
        role="alert"
        title="Project type is missing. Set Construction or Consulting — this controls pay apps vs client invoices."
        className={cn(
          'shrink-0 inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide',
          'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950/50 dark:text-rose-200',
          size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5',
          className,
        )}
      >
        <AlertTriangle className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
        Type missing
      </span>
    );
  }

  const kind = projectKind(project);
  const Icon = kind === 'consulting' ? Lightbulb : HardHat;
  return (
    <span
      className={cn(
        'shrink-0 inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide',
        KIND_STYLE[kind],
        size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5',
        className,
      )}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {projectKindLabel(kind)}
    </span>
  );
}

/** Inline banner when type is missing — use on project detail / financials. */
export function ProjectTypeMissingAlert({
  project,
  className,
}: {
  project: { project_type?: string | null };
  className?: string;
}) {
  if (!isProjectTypeMissing(project)) return null;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
        className,
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-bold">Project type is not set</p>
        <p className="text-xs mt-0.5 opacity-90">
          This is critical. Set the project to <strong>Construction</strong> (pay apps, commitments, budget)
          or <strong>Consulting</strong> (proposals → client invoices). Until then, billing UI may be wrong.
        </p>
      </div>
    </div>
  );
}
