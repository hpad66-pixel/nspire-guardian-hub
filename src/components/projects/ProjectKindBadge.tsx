import { HardHat, Lightbulb, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  projectKind,
  projectKindLabel,
  projectKindBadgeClass,
  isProjectTypeMissing,
  type ProjectKind,
} from '@/lib/projectKind';

/**
 * Bold Construction / Consulting label for project cards and headers.
 * Consulting = electrified green; Construction = West-orange construction yellow.
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
          'shrink-0 inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider',
          'project-kind-badge-missing bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950/50 dark:text-rose-200',
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
      title={kind === 'consulting' ? 'Consulting — proposals & client invoices' : 'Construction — pay apps & commitments'}
      className={cn(
        'shrink-0 inline-flex items-center gap-1 rounded-full border font-black uppercase tracking-wider',
        projectKindBadgeClass(kind),
        size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2.5 py-0.5',
        className,
      )}
      data-kind={kind as ProjectKind}
    >
      <Icon className={cn(size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3', 'drop-shadow-sm')} />
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
        'flex items-start gap-2 rounded-lg border border-rose-400 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:bg-rose-950/40 dark:text-rose-100 project-kind-badge-missing',
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
