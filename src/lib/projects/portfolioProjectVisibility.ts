export type PortfolioStatusFilter =
  | 'all'
  | 'active'
  | 'planning'
  | 'on_hold'
  | 'completed'
  | 'closed';

type ProjectWithStatus = {
  status?: string | null;
};

/** "All" means the active main portfolio; closed work is shown only by choosing Closed. */
export function matchesPortfolioStatus(
  project: ProjectWithStatus,
  statusFilter: PortfolioStatusFilter,
  options?: { includeClosedInAll?: boolean },
) {
  if (statusFilter === 'all') return options?.includeClosedInAll ? true : project.status !== 'closed';
  return project.status === statusFilter;
}

/** Historical closeout sorter for explicit closed/audit views. */
export function compareClosedProjectsFirst(
  a: ProjectWithStatus,
  b: ProjectWithStatus,
) {
  const aRank = a.status === 'closed' ? 0 : 1;
  const bRank = b.status === 'closed' ? 0 : 1;
  return aRank - bRank;
}
