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

/**
 * Solid project tiles — consulting uses the brand dark green (`--apas-surface`
 * #0D3B30) with cream/white text; construction uses West-orange. CSS classes in
 * index.css also remap `.text-muted-foreground` so secondary copy stays readable.
 */
export const PROJECT_KIND_TILE_STYLE: Record<ProjectKind, string> = {
  consulting: 'project-kind-tile-consulting border-l-4',
  construction: 'project-kind-tile-construction border-l-4',
};

export function projectKindBadgeClass(kind: ProjectKind): string {
  return PROJECT_KIND_BADGE_STYLE[kind];
}

export function projectKindTileClass(kind: ProjectKind): string {
  return PROJECT_KIND_TILE_STYLE[kind];
}

/** Split a project list into Construction / Consulting buckets for portfolio grids. */
export function groupProjectsByKind<T extends { project_type?: string | null; name?: string | null }>(
  projects: T[],
): { construction: T[]; consulting: T[]; missingType: T[] } {
  const construction: T[] = [];
  const consulting: T[] = [];
  const missingType: T[] = [];
  for (const p of projects) {
    if (isProjectTypeMissing(p)) missingType.push(p);
    if (projectKind(p) === 'consulting') consulting.push(p);
    else construction.push(p);
  }
  const byName = (a: T, b: T) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
  construction.sort(byName);
  consulting.sort(byName);
  missingType.sort(byName);
  return { construction, consulting, missingType };
}
