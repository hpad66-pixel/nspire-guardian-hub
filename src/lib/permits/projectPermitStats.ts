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
  closed_on?: string | null;
  city_confirmed_on?: string | null;
  next_action?: string | null;
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

/** Chart / badge colors keyed by status. */
export const PERMIT_STATUS_COLOR: Record<string, string> = {
  closed: '#10B981',
  open_active: '#F59E0B',
  pending: '#1D6FE8',
  expired: '#F43F5E',
  on_hold: '#878581',
};

export interface PermitChartSlice {
  key: string;
  name: string;
  value: number;
  fill: string;
}

export interface PermitNamedCount {
  key: string;
  name: string;
  value: number;
  open?: number;
  closed?: number;
  percent?: number;
}

export interface PermitAgingBucket {
  key: string;
  name: string;
  value: number;
  fill: string;
}

export interface PermitPipelineStep {
  key: ProjectPermitStatus | 'city_wait';
  label: string;
  count: number;
  fill: string;
  description: string;
}

/** Ordered closeout pipeline for interactive status advances. */
export const CLOSEOUT_PIPELINE: Array<{
  status: ProjectPermitStatus;
  label: string;
  next?: ProjectPermitStatus;
  actionLabel?: string;
}> = [
  { status: 'open_active', label: 'Open · Active', next: 'pending', actionLabel: 'Send to City' },
  { status: 'pending', label: 'Pending city', next: 'closed', actionLabel: 'Mark closed' },
  { status: 'on_hold', label: 'On hold', next: 'open_active', actionLabel: 'Resume' },
  { status: 'closed', label: 'Closed' },
  { status: 'expired', label: 'Expired', next: 'open_active', actionLabel: 'Reopen' },
];

export function nextPipelineAction(
  status: ProjectPermitStatus | string,
): { next: ProjectPermitStatus; actionLabel: string } | null {
  const step = CLOSEOUT_PIPELINE.find((s) => s.status === status);
  if (!step?.next || !step.actionLabel) return null;
  return { next: step.next, actionLabel: step.actionLabel };
}

/** Days since issued (or Infinity if unknown) for open permits. */
export function daysOpen(permit: ProjectPermitLike, asOf: Date = new Date()): number | null {
  if (CLOSED.has((permit.status || '').toLowerCase())) return null;
  if (!permit.issued_on) return null;
  const issued = new Date(`${permit.issued_on}T00:00:00`);
  if (Number.isNaN(issued.getTime())) return null;
  const ms = asOf.getTime() - issued.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function statusBreakdown(permits: ProjectPermitLike[]): PermitChartSlice[] {
  const map = new Map<string, number>();
  for (const p of permits) {
    const key = (p.status || 'on_hold').toLowerCase();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const order = ['closed', 'open_active', 'pending', 'on_hold', 'expired'];
  return order
    .filter((k) => (map.get(k) ?? 0) > 0)
    .map((key) => ({
      key,
      name: PERMIT_STATUS_LABEL[key] ?? key,
      value: map.get(key) ?? 0,
      fill: PERMIT_STATUS_COLOR[key] ?? '#878581',
    }));
}

export function groupByTrade(permits: ProjectPermitLike[]): PermitNamedCount[] {
  const map = new Map<string, number>();
  for (const p of permits) {
    const name = (p.trade || 'Unspecified').trim() || 'Unspecified';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ key: name.toLowerCase(), name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function groupByDepartment(permits: ProjectPermitLike[]): PermitNamedCount[] {
  const map = new Map<string, number>();
  for (const p of permits) {
    const name = (p.department || 'Unspecified').trim() || 'Unspecified';
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ key: name.toLowerCase(), name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

/** Per-building closeout % for horizontal readiness bars. */
export function buildingReadiness(permits: ProjectPermitLike[]): PermitNamedCount[] {
  const map = new Map<string, { total: number; closed: number }>();
  for (const p of permits) {
    const name = (p.building || 'Site / other').trim() || 'Site / other';
    const cur = map.get(name) ?? { total: 0, closed: 0 };
    cur.total += 1;
    if (CLOSED.has((p.status || '').toLowerCase())) cur.closed += 1;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({
      key: name.toLowerCase(),
      name,
      value: v.total,
      open: v.total - v.closed,
      closed: v.closed,
      percent: v.total === 0 ? 0 : Math.round((v.closed / v.total) * 1000) / 10,
    }))
    .sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0) || a.name.localeCompare(b.name));
}

/** Aging of still-open permits for chase urgency. */
export function agingBreakdown(
  permits: ProjectPermitLike[],
  asOf: Date = new Date(),
): PermitAgingBucket[] {
  const buckets: PermitAgingBucket[] = [
    { key: '0_30', name: '0–30 days', value: 0, fill: '#10B981' },
    { key: '31_60', name: '31–60 days', value: 0, fill: '#F59E0B' },
    { key: '61_plus', name: '61+ days', value: 0, fill: '#F43F5E' },
    { key: 'unknown', name: 'No issue date', value: 0, fill: '#878581' },
  ];
  for (const p of permits) {
    if (CLOSED.has((p.status || '').toLowerCase())) continue;
    const d = daysOpen(p, asOf);
    if (d == null) buckets[3].value += 1;
    else if (d <= 30) buckets[0].value += 1;
    else if (d <= 60) buckets[1].value += 1;
    else buckets[2].value += 1;
  }
  return buckets.filter((b) => b.value > 0);
}

/** High-level pipeline counts for the interactive closeout strip. */
export function closeoutPipeline(permits: ProjectPermitLike[]): PermitPipelineStep[] {
  const counts = countPermitStatuses(permits);
  return [
    {
      key: 'open_active',
      label: 'Open · Active',
      count: counts.openActive,
      fill: PERMIT_STATUS_COLOR.open_active,
      description: 'Work / inspections in flight',
    },
    {
      key: 'city_wait',
      label: 'City wait',
      count: counts.blocked,
      fill: PERMIT_STATUS_COLOR.pending,
      description: 'Awaiting Building / Public Works',
    },
    {
      key: 'closed',
      label: 'Closed',
      count: counts.closed,
      fill: PERMIT_STATUS_COLOR.closed,
      description: 'Confirmed closed — evidence on file',
    },
  ];
}

/** Patch fields when advancing a permit through the closeout pipeline. */
export function buildStatusAdvancePatch(
  permit: ProjectPermitLike,
  next: ProjectPermitStatus,
  asOf: Date = new Date(),
): {
  status: ProjectPermitStatus;
  closed_on?: string | null;
  city_confirmed_on?: string | null;
  notes?: string;
  next_action?: string | null;
} {
  const today = asOf.toISOString().slice(0, 10);
  const stamp = asOf.toLocaleDateString();
  const baseNote = permit.notes?.trim() || '';
  if (next === 'pending') {
    return {
      status: 'pending',
      city_confirmed_on: permit.city_confirmed_on ?? null,
      notes: baseNote
        ? `${baseNote} · Sent to City ${stamp}`
        : `Sent to City ${stamp}`,
      next_action: 'Await City / Public Works confirmation',
    };
  }
  if (next === 'closed') {
    return {
      status: 'closed',
      closed_on: today,
      city_confirmed_on: permit.city_confirmed_on || today,
      notes: baseNote
        ? `${baseNote} · Closed in Proj OS ${stamp}`
        : `Closed in Proj OS ${stamp}`,
      next_action: null,
    };
  }
  if (next === 'open_active') {
    return {
      status: 'open_active',
      closed_on: null,
      notes: baseNote
        ? `${baseNote} · Reopened ${stamp}`
        : `Reopened ${stamp}`,
      next_action: 'Resume inspections / contractor closeout',
    };
  }
  return { status: next };
}
