/**
 * Pure KPI helpers for the maintenance Work Orders dashboard.
 */

export type WorkOrderLike = {
  status: string;
  priority?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
  demo_seed?: boolean | null;
};

export type WorkOrderAgingBucket = {
  key: '0_1' | '2_3' | '4_7' | '8_plus';
  label: string;
  count: number;
};

export type WorkOrderDashboardKpis = {
  /** Created today (local day). */
  createdToday: number;
  /** Moved into active/done today (in progress / completed / verified / closed). */
  processedToday: number;
  /** Open backlog still waiting on staff action. */
  backlog: number;
  /** Open emergencies. */
  emergencyOpen: number;
  /** Past due_date and still open. */
  overdue: number;
  /** Open WOs currently being worked. */
  inProgress: number;
  /** Aging of open backlog (not completed / verified / closed). */
  aging: WorkOrderAgingBucket[];
  total: number;
};

const CLOSED = new Set(['completed', 'verified', 'closed']);
const BACKLOG = new Set([
  'draft',
  'pending_approval',
  'rejected',
  'pending',
  'assigned',
]);
const PROCESSED = new Set(['in_progress', 'completed', 'verified', 'closed']);

function startOfLocalDay(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isToday(iso: string | null | undefined, now = new Date()): boolean {
  if (!iso) return false;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return false;
  return t >= startOfLocalDay(now);
}

function ageDays(iso: string, now = new Date()): number {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 0;
  const ms = startOfLocalDay(now).getTime() - startOfLocalDay(t).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function isWorkOrderOpen(status: string): boolean {
  return !CLOSED.has(status);
}

export function computeWorkOrderDashboardKpis(
  orders: WorkOrderLike[],
  opts?: { includeDemo?: boolean; now?: Date },
): WorkOrderDashboardKpis {
  const includeDemo = opts?.includeDemo ?? true;
  const now = opts?.now ?? new Date();
  const rows = includeDemo ? orders : orders.filter((r) => !r.demo_seed);

  const createdToday = rows.filter((r) => isToday(r.created_at, now)).length;
  const processedToday = rows.filter(
    (r) =>
      PROCESSED.has(r.status) &&
      (isToday(r.completed_at, now) || isToday(r.updated_at, now) || isToday(r.created_at, now)),
  ).length;
  const backlog = rows.filter((r) => BACKLOG.has(r.status)).length;
  const emergencyOpen = rows.filter(
    (r) => r.priority === 'emergency' && isWorkOrderOpen(r.status),
  ).length;
  const overdue = rows.filter((r) => {
    if (!r.due_date || !isWorkOrderOpen(r.status)) return false;
    const due = new Date(r.due_date);
    due.setHours(0, 0, 0, 0);
    return due < startOfLocalDay(now);
  }).length;
  const inProgress = rows.filter((r) => r.status === 'in_progress').length;

  const openRows = rows.filter((r) => isWorkOrderOpen(r.status));
  const buckets: WorkOrderAgingBucket[] = [
    { key: '0_1', label: '0–1 days', count: 0 },
    { key: '2_3', label: '2–3 days', count: 0 },
    { key: '4_7', label: '4–7 days', count: 0 },
    { key: '8_plus', label: '8+ days', count: 0 },
  ];
  for (const r of openRows) {
    const days = ageDays(r.created_at, now);
    if (days <= 1) buckets[0].count += 1;
    else if (days <= 3) buckets[1].count += 1;
    else if (days <= 7) buckets[2].count += 1;
    else buckets[3].count += 1;
  }

  return {
    createdToday,
    processedToday,
    backlog,
    emergencyOpen,
    overdue,
    inProgress,
    aging: buckets,
    total: rows.length,
  };
}

export type WorkOrderSortKey =
  | 'newest'
  | 'oldest'
  | 'due_soonest'
  | 'due_latest'
  | 'priority';

export function sortWorkOrders<T extends WorkOrderLike>(
  orders: T[],
  sort: WorkOrderSortKey,
): T[] {
  const copy = [...orders];
  const priorityRank = (p?: string | null) => (p === 'emergency' ? 0 : 1);

  copy.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'due_soonest':
        return (
          new Date(a.due_date || '9999-12-31').getTime() -
          new Date(b.due_date || '9999-12-31').getTime()
        );
      case 'due_latest':
        return (
          new Date(b.due_date || '0001-01-01').getTime() -
          new Date(a.due_date || '0001-01-01').getTime()
        );
      case 'priority': {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      case 'newest':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  return copy;
}
