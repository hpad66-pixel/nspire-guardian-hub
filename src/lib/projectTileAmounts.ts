import { projectKind, type ProjectKind } from '@/lib/projectKind';

export interface ConstructionFinLike {
  revised_contract?: number | null;
  billed_to_date?: number | null;
}

export interface ConsultingTotalsLike {
  approvedFee: number;
  invoiced: number;
}

export interface ProjectTileAmounts {
  kind: ProjectKind;
  budget: number;
  spent: number;
  /** For consulting: approved proposal fee total (PROP-001 + PROP-002 …). */
  approvedFee: number;
  source: 'construction_financials' | 'approved_proposals' | 'project_budget';
}

const num = (v: unknown) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

/**
 * Resolve the dollar figures shown on project tiles / list / detail.
 * Construction → prime + COs (v_project_financial_summary).
 * Consulting → sum of approved proposal totals (e.g. Larkin $3,369 + $14,500).
 */
export function resolveProjectTileAmounts(input: {
  project: { project_type?: string | null; budget?: number | string | null; spent?: number | string | null };
  construction?: ConstructionFinLike | null;
  consulting?: ConsultingTotalsLike | null;
}): ProjectTileAmounts {
  const kind = projectKind(input.project);
  const fallbackBudget = num(input.project.budget);
  const fallbackSpent = num(input.project.spent);

  if (kind === 'consulting') {
    const approvedFee = Math.max(0, num(input.consulting?.approvedFee));
    const invoiced = Math.max(0, num(input.consulting?.invoiced));
    if (approvedFee > 0) {
      return {
        kind,
        budget: approvedFee,
        spent: invoiced,
        approvedFee,
        source: 'approved_proposals',
      };
    }
    return {
      kind,
      budget: fallbackBudget,
      spent: invoiced > 0 ? invoiced : fallbackSpent,
      approvedFee: 0,
      source: 'project_budget',
    };
  }

  const revised = Math.max(0, num(input.construction?.revised_contract));
  const billed = Math.max(0, num(input.construction?.billed_to_date));
  if (revised > 0) {
    return {
      kind,
      budget: revised,
      spent: billed,
      approvedFee: 0,
      source: 'construction_financials',
    };
  }
  return {
    kind,
    budget: fallbackBudget,
    spent: billed > 0 ? billed : fallbackSpent,
    approvedFee: 0,
    source: 'project_budget',
  };
}
