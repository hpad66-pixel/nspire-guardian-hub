// Two portfolios that measure different things: construction (budget / change
// orders / schedule) vs consulting/client engagements (scope % / fees / actions).
export type ProjectKind = 'construction' | 'consulting';

export function projectKind(p: { project_type?: string | null }): ProjectKind {
  const t = p.project_type;
  return t === 'consulting' || t === 'client' ? 'consulting' : 'construction';
}
