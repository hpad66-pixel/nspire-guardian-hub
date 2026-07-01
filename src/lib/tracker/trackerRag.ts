// Red/amber/green (RAG) status for a Project Log item, derived from its status +
// due date. Shared by the in-app rows, the dashboard roll-up, and the branded
// client report so they never disagree.
//
//   done      → green   (closed)
//   overdue   → red     (past its due date, not done)
//   at-risk   → red     (blocked — critical, needs attention)
//   due-soon  → amber   (due within DUE_SOON_DAYS — going into the risk zone)
//   on-track  → blue    (has a due date comfortably in the future)
//   none      → grey    (no due date set)

export type Rag = 'done' | 'overdue' | 'at-risk' | 'due-soon' | 'on-track' | 'none';

export const DUE_SOON_DAYS = 3;

const RAG_META: Record<Rag, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: '#F43F5E' },
  'at-risk': { label: 'At risk', color: '#F43F5E' },
  'due-soon': { label: 'Due soon', color: '#F59E0B' },
  'on-track': { label: 'On track', color: '#1D6FE8' },
  done: { label: 'Done', color: '#10B981' },
  none: { label: 'No due date', color: '#9AA1AD' },
};

/** Display order: most urgent first. */
export const RAG_ORDER: Rag[] = ['overdue', 'at-risk', 'due-soon', 'on-track', 'done', 'none'];

export function ragMeta(key: Rag) {
  return RAG_META[key];
}

/** Whole days from today to `due` (negative = overdue). null when no/invalid date. */
export function daysUntilDue(due: string | null | undefined, now: Date = new Date()): number | null {
  if (!due) return null;
  const d = new Date(`${String(due).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export function ragFor(
  item: { status: string; due_date: string | null },
  now: Date = new Date(),
): Rag {
  if (item.status === 'done') return 'done';
  if (item.status === 'blocked') return 'at-risk';
  const d = daysUntilDue(item.due_date, now);
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d <= DUE_SOON_DAYS) return 'due-soon';
  return 'on-track';
}

/** A short human label for a due date relative to today, e.g. "3 days overdue". */
export function duePhrase(due: string | null | undefined, now: Date = new Date()): string {
  const d = daysUntilDue(due, now);
  if (d === null) return '';
  if (d < 0) return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

/** Roll up a list of items into per-RAG counts (for the dashboard). */
export function ragCounts(
  items: Array<{ status: string; due_date: string | null }>,
  now: Date = new Date(),
): Record<Rag, number> {
  const out: Record<Rag, number> = { overdue: 0, 'at-risk': 0, 'due-soon': 0, 'on-track': 0, done: 0, none: 0 };
  for (const it of items) out[ragFor(it, now)] += 1;
  return out;
}
