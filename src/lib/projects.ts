/**
 * WS-5 · #14 · Single source of truth for "active project".
 *
 * Dashboard counted {active, planning} (whitelist) while ProjectsDashboard
 * used "not completed/closed" (blacklist), so e.g. an on_hold project was
 * active in one place and not the other. Define it once: a project is
 * active unless it is completed, closed, or archived. A null/blank status
 * counts as active (it isn't terminal).
 */
export const INACTIVE_PROJECT_STATUSES = ['completed', 'closed', 'archived'] as const;

export function isActiveProjectStatus(status: string | null | undefined): boolean {
  return !INACTIVE_PROJECT_STATUSES.includes((status ?? '') as (typeof INACTIVE_PROJECT_STATUSES)[number]);
}

export function isActiveProject(project: { status?: string | null }): boolean {
  return isActiveProjectStatus(project.status);
}
