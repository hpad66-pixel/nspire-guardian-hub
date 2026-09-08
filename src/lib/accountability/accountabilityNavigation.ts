export interface AccountabilityNavigationProject {
  id: string;
  name?: string | null;
  status?: string | null;
  client_id?: string | null;
  program_meta?: Record<string, unknown> | null;
}

const text = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

/**
 * A dedicated Site Accountability project is a property-wide evidence record,
 * not merely a project that happens to have the accountability module enabled.
 * Prefer an explicit feature marker while retaining the original Glorieta
 * program key/name as backwards-compatible fallbacks.
 */
export function isDedicatedSiteAccountabilityProject(
  project: AccountabilityNavigationProject | null | undefined,
) {
  if (!project) return false;
  const meta = project.program_meta ?? {};
  return text(meta.feature_key) === 'site_accountability'
    || text(meta.owner_feature_key) === 'site_accountability'
    || text(meta.project_key) === 'pmo-03'
    || text(meta.type).includes('field accountability')
    || text(project.name).includes('site accountability');
}

/** Pick the single, intentionally designated record that should own the shortcut. */
export function selectSiteAccountabilityProject<T extends AccountabilityNavigationProject>(
  projects: T[],
  clientId?: string | null,
): T | null {
  const scoped = clientId
    ? projects.filter((project) => project.client_id === clientId)
    : projects;
  const dedicated = scoped.filter(isDedicatedSiteAccountabilityProject);
  if (!dedicated.length) return null;

  return [...dedicated].sort((a, b) => {
    const aPriority = a.program_meta?.owner_navigation_priority === true ? 1 : 0;
    const bPriority = b.program_meta?.owner_navigation_priority === true ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    const aOpen = ['planning', 'active'].includes(text(a.status)) ? 1 : 0;
    const bOpen = ['planning', 'active'].includes(text(b.status)) ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    return text(a.name).localeCompare(text(b.name));
  })[0] ?? null;
}

export function staffSiteAccountabilityPath(projectId: string) {
  return `/projects/${projectId}/accountability`;
}

