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

/** "All" means the complete portfolio, including certified closed projects. */
export function matchesPortfolioStatus(
  project: ProjectWithStatus,
  statusFilter: PortfolioStatusFilter,
) {
  return statusFilter === 'all' || project.status === statusFilter;
}

/** Keep certified closeouts celebratory and visible at the top of the full portfolio. */
export function compareClosedProjectsFirst(
  a: ProjectWithStatus,
  b: ProjectWithStatus,
) {
  const aRank = a.status === 'closed' ? 0 : 1;
  const bRank = b.status === 'closed' ? 0 : 1;
  return aRank - bRank;
}
