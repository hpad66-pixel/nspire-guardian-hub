/**
 * Pure helpers for the project permit command center / owner compliance view.
 * Keep scoring + brief generation out of React so Vitest can lock the math.
 */

export type ProjectPermitStatus =
  | 'open_active'
  | 'pending'
  | 'closed'
  | 'expired'
  | 'on_hold';

export interface ProjectPermitLike {
  id?: string;
  permit_number: string;
  description: string;
  status: ProjectPermitStatus | string;
  building?: string | null;
  department?: string | null;
  trade?: string | null;
  contractor?: string | null;
  notes?: string | null;
  responsible_party?: string | null;
  street_address?: string | null;
  issued_on?: string | null;
}

export interface PermitStatusCounts {
  total: number;
  closed: number;
  openActive: number;
  pending: number;
  blocked: number;
  other: number;
}

export interface PermitReadiness {
  counts: PermitStatusCounts;
  /** 0–100, based on closed / total. */
  percent: number;
  label: string;
}

export interface PermitActionBucket {
  key: string;
  label: string;
  owner: string;
  count: number;
  permits: ProjectPermitLike[];
}

const CLOSED = new Set(['closed']);
const OPEN = new Set(['open_active']);
const PENDING = new Set(['pending']);

export function countPermitStatuses(permits: ProjectPermitLike[]): PermitStatusCounts {
  const counts: PermitStatusCounts = {
    total: permits.length,
    closed: 0,
    openActive: 0,
    pending: 0,
    blocked: 0,
    other: 0,
  };
  for (const p of permits) {
    const s = (p.status || '').toLowerCase();
    if (CLOSED.has(s)) counts.closed += 1;
    else if (OPEN.has(s)) counts.openActive += 1;
    else if (PENDING.has(s)) counts.pending += 1;
    else counts.other += 1;
    if (isCityBlocked(p)) counts.blocked += 1;
  }
  return counts;
}

/** Pending city / agency confirmation or explicit "pending signoff" notes. */
export function isCityBlocked(permit: ProjectPermitLike): boolean {
  const s = (permit.status || '').toLowerCase();
  if (CLOSED.has(s)) return false;
  const notes = (permit.notes || '').toLowerCase();
  return (
    PENDING.has(s)
    || notes.includes('pending signoff')
    || notes.includes('city to confirm')
    || notes.includes('pending sign-off')
  );
}

export function permitReadiness(permits: ProjectPermitLike[]): PermitReadiness {
  const counts = countPermitStatuses(permits);
  const percent = counts.total === 0
    ? 0
    : Math.round((counts.closed / counts.total) * 1000) / 10;
  let label = 'No permits on file';
  if (counts.total > 0) {
    if (percent >= 95) label = 'Closeout ready';
    else if (percent >= 70) label = 'Closing in progress';
    else if (percent >= 40) label = 'Active compliance';
    else label = 'Early / open register';
  }
  return { counts, percent, label };
}

export function groupOpenByOwner(permits: ProjectPermitLike[]): PermitActionBucket[] {
  const open = permits.filter((p) => !CLOSED.has((p.status || '').toLowerCase()));
  const map = new Map<string, ProjectPermitLike[]>();
  for (const p of open) {
    const owner = (p.responsible_party || 'Unassigned').trim() || 'Unassigned';
    const list = map.get(owner) ?? [];
    list.push(p);
    map.set(owner, list);
  }
  return [...map.entries()]
    .map(([owner, list]) => ({
      key: owner.toLowerCase(),
      label: `${owner} · ${list.length} open`,
      owner,
      count: list.length,
      permits: list,
    }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner));
}

export function groupByBuilding(permits: ProjectPermitLike[]): { building: string; total: number; open: number }[] {
  const map = new Map<string, { total: number; open: number }>();
  for (const p of permits) {
    const building = (p.building || 'Site / other').trim() || 'Site / other';
    const cur = map.get(building) ?? { total: 0, open: 0 };
    cur.total += 1;
    if (!CLOSED.has((p.status || '').toLowerCase())) cur.open += 1;
    map.set(building, cur);
  }
  return [...map.entries()]
    .map(([building, v]) => ({ building, ...v }))
    .sort((a, b) => b.open - a.open || a.building.localeCompare(b.building));
}

/**
 * Deterministic "AI-style" monthly compliance brief from live status.
 * No model call — safe for owner PDF / dashboard copy; can later feed CaseIQ.
 */
export function buildPermitComplianceBrief(
  permits: ProjectPermitLike[],
  opts?: { projectName?: string; asOf?: Date },
): string {
  const asOf = opts?.asOf ?? new Date();
  const projectName = opts?.projectName ?? 'the project';
  const { counts, percent, label } = permitReadiness(permits);
  const buckets = groupOpenByOwner(permits);
  const open = permits.filter((p) => !CLOSED.has((p.status || '').toLowerCase()));
  const cityWait = open.filter(isCityBlocked);

  const dateLabel = asOf.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const lines: string[] = [
    `Permit compliance brief — ${projectName}`,
    `As of ${dateLabel}`,
    '',
    `Closeout readiness: ${percent}% (${counts.closed} of ${counts.total} closed) — ${label}.`,
    `Open / active: ${counts.openActive}. Pending city confirmation: ${counts.pending}.`,
  ];

  if (cityWait.length > 0) {
    lines.push('', 'Waiting on the City / agency:');
    for (const p of cityWait.slice(0, 8)) {
      lines.push(`• ${p.permit_number} — ${p.description}${p.responsible_party ? ` (${p.responsible_party})` : ''}`);
    }
  }

  if (buckets.length > 0) {
    lines.push('', 'Action by responsible party:');
    for (const b of buckets) {
      lines.push(`• ${b.owner}: ${b.count} open permit${b.count === 1 ? '' : 's'}`);
    }
  }

  if (open.length === 0) {
    lines.push('', 'All permits on the register are closed. Ready for closeout package assembly.');
  } else {
    lines.push(
      '',
      'APAS is coordinating closure — not only documenting permits, but chasing city confirmations and lining evidence for conveyance / final closeout.',
    );
  }

  return lines.join('\n');
}

export const PERMIT_STATUS_LABEL: Record<string, string> = {
  open_active: 'Open · Active',
  pending: 'Pending city',
  closed: 'Closed',
  expired: 'Expired',
  on_hold: 'On hold',
};
