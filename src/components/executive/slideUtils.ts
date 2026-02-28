export const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export function computePortfolioScore(metrics: {
  openIssues: number;
  urgentIssues: number;
  openWorkOrders: number;
  complianceRate: number;
  activeProjects: number;
}): number {
  const { openIssues, urgentIssues, openWorkOrders, complianceRate, activeProjects } = metrics;
  const complianceScore = complianceRate * 0.4;
  const issueScore = Math.max(0, 30 - urgentIssues * 5 - openIssues * 0.5);
  const woScore = Math.max(0, 20 - openWorkOrders * 0.5);
  const projectScore = Math.min(10, activeProjects > 0 ? 10 : 5);
  return Math.round(complianceScore + issueScore + woScore + projectScore);
}
