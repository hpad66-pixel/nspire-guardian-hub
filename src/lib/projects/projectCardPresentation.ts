export type ProjectOwnerSummary = {
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  work_email?: string | null;
  avatar_url?: string | null;
};

export type ProjectCardRecord = {
  status?: string | null;
  closed_at?: string | null;
  close_snapshot?: unknown;
  owner?: ProjectOwnerSummary | null;
};

export type ClosedFinancialResult = {
  amount: number;
  absoluteAmount: number;
  kind: 'profit' | 'loss' | 'break_even';
  label: string;
};

const finiteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function getProjectOwnerLabel(project: ProjectCardRecord): string {
  const owner = project.owner;
  return owner?.full_name?.trim()
    || owner?.work_email?.trim()
    || owner?.email?.trim()
    || 'Unassigned';
}

export function getProjectOwnerInitials(project: ProjectCardRecord): string {
  const label = getProjectOwnerLabel(project);
  if (label === 'Unassigned') return '?';
  const words = label.includes('@') ? [label.split('@')[0]] : label.split(/\s+/);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || '?';
}

export function getClosedFinancialResult(project: ProjectCardRecord): ClosedFinancialResult | null {
  if (project.status !== 'closed') return null;
  if (!project.close_snapshot || typeof project.close_snapshot !== 'object' || Array.isArray(project.close_snapshot)) {
    return null;
  }

  const snapshot = project.close_snapshot as Record<string, unknown>;
  const position = snapshot.financial_position;
  if (!position || typeof position !== 'object' || Array.isArray(position)) return null;

  const amount = finiteNumber((position as Record<string, unknown>).net_profit);
  if (amount === null) return null;

  if (amount < 0) {
    return { amount, absoluteAmount: Math.abs(amount), kind: 'loss', label: 'Final net loss' };
  }
  if (amount > 0) {
    return { amount, absoluteAmount: amount, kind: 'profit', label: 'Final net profit' };
  }
  return { amount: 0, absoluteAmount: 0, kind: 'break_even', label: 'Final result · break-even' };
}

