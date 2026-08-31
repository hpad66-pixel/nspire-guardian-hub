import { useMemo } from 'react';
import { useProjects, type Project } from '@/hooks/useProjects';
import { useAllProjectFinancials } from '@/hooks/useAllProjectFinancials';
import { useAllApprovedProposalTotals } from '@/hooks/useAllApprovedProposalTotals';
import { resolveProjectTileAmounts } from '@/lib/projectTileAmounts';
import { buildProjectTree } from '@/lib/projectTree';

// The hierarchy view over all accessible projects, with budget/billed rolled up
// the tree. Every feature that needs program↔subproject math reads from here so
// the rollup logic lives in exactly one place.
export function useProjectTree() {
  const { data: projects, isLoading } = useProjects();
  const { financials } = useAllProjectFinancials();
  const { consultingTotals } = useAllApprovedProposalTotals();

  const tree = useMemo(() => buildProjectTree((projects ?? []) as Project[]), [projects]);

  // Construction → prime + COs; consulting → approved proposal fee stack.
  const ownBudget = (id: string) => {
    const p = tree.byId.get(id) as Project | undefined;
    return resolveProjectTileAmounts({
      project: p ?? { budget: 0 },
      construction: financials.get(id),
      consulting: consultingTotals.get(id),
    }).budget;
  };
  const ownBilled = (id: string) => {
    const p = tree.byId.get(id) as Project | undefined;
    return resolveProjectTileAmounts({
      project: p ?? { budget: 0 },
      construction: financials.get(id),
      consulting: consultingTotals.get(id),
    }).spent;
  };

  // "rolled" = self + every descendant.
  const rolledBudget = (id: string) => tree.rollup(id, (n) => ownBudget(n.id));
  const rolledBilled = (id: string) => tree.rollup(id, (n) => ownBilled(n.id));

  return {
    tree,
    projects: (projects ?? []) as Project[],
    financials,
    isLoading,
    ownBudget,
    ownBilled,
    rolledBudget,
    rolledBilled,
  };
}

/** Direct children of a project (subprojects). */
export function useSubprojects(projectId: string | null | undefined) {
  const { tree, ...rest } = useProjectTree();
  const children = projectId ? tree.children(projectId) : [];
  return { children, tree, ...rest };
}
