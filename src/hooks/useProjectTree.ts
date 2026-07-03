import { useMemo } from 'react';
import { useProjects, type Project } from '@/hooks/useProjects';
import { useAllProjectFinancials } from '@/hooks/useAllProjectFinancials';
import { buildProjectTree } from '@/lib/projectTree';

// The hierarchy view over all accessible projects, with budget/billed rolled up
// the tree. Every feature that needs program↔subproject math reads from here so
// the rollup logic lives in exactly one place.
export function useProjectTree() {
  const { data: projects, isLoading } = useProjects();
  const { financials } = useAllProjectFinancials();

  const tree = useMemo(() => buildProjectTree((projects ?? []) as Project[]), [projects]);

  // "own" = this node's own money; construction reads the financial view (prime +
  // approved COs), everything else falls back to the projects columns.
  const ownBudget = (id: string) => {
    const f = financials.get(id);
    if (f && f.revised_contract > 0) return f.revised_contract;
    return Number((tree.byId.get(id) as any)?.budget) || 0;
  };
  const ownBilled = (id: string) => {
    const f = financials.get(id);
    if (f && f.billed_to_date > 0) return f.billed_to_date;
    return Number((tree.byId.get(id) as any)?.spent) || 0;
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
