// Two portfolios that measure different things: construction (budget / change
// orders / schedule / pay apps) vs consulting/client engagements (scope % /
// fees / client invoices).
export type ProjectKind = 'construction' | 'consulting';

/** Raw project_type values that mean consulting billing. */
const CONSULTING_TYPES = new Set(['consulting', 'client']);

/** Raw project_type values that mean construction billing. */
const CONSTRUCTION_TYPES = new Set(['property', 'construction']);

export function projectKind(p: { project_type?: string | null }): ProjectKind {
  const t = (p.project_type ?? '').trim().toLowerCase();
  return CONSULTING_TYPES.has(t) ? 'consulting' : 'construction';
}

/**
 * True when project_type is missing or not a recognized consulting/construction
 * value. Callers should flash a warning — billing mode is too important to guess
 * silently.
 */
export function isProjectTypeMissing(p: { project_type?: string | null }): boolean {
  const t = (p.project_type ?? '').trim().toLowerCase();
  if (!t) return true;
  return !CONSULTING_TYPES.has(t) && !CONSTRUCTION_TYPES.has(t);
}

export function projectKindLabel(kind: ProjectKind): 'Construction' | 'Consulting' {
  return kind === 'consulting' ? 'Consulting' : 'Construction';
}

/** Electrified badge chrome — consulting = green + gold glow, construction = West orange. */
export const PROJECT_KIND_BADGE_STYLE: Record<ProjectKind, string> = {
  consulting:
    'project-kind-badge-consulting text-emerald-50 border-emerald-300/80 bg-emerald-700 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
  construction:
    'project-kind-badge-construction text-orange-950 border-orange-500/90 bg-[var(--kind-construction)] shadow-[0_0_0_1px_rgba(234,88,12,0.45)]',
};

/** Soft tile wash + left accent so cards read green (consulting) or orange (construction). */
export const PROJECT_KIND_TILE_STYLE: Record<ProjectKind, string> = {
  consulting:
    'border-l-[var(--kind-consulting)] bg-gradient-to-br from-emerald-50/90 via-card to-card border-emerald-200/70 dark:from-emerald-950/35 dark:border-emerald-800/50',
  construction:
    'border-l-[var(--kind-construction)] bg-gradient-to-br from-orange-50/90 via-card to-card border-orange-200/80 dark:from-orange-950/30 dark:border-orange-800/50',
};

export function projectKindBadgeClass(kind: ProjectKind): string {
  return PROJECT_KIND_BADGE_STYLE[kind];
}

export function projectKindTileClass(kind: ProjectKind): string {
  return PROJECT_KIND_TILE_STYLE[kind];
}
