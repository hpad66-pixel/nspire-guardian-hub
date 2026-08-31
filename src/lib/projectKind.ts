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
