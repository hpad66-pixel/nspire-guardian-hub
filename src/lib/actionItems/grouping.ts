// Pure date-bucketing for action items — no imports, directly unit-testable.

export type DateBucket = 'overdue' | 'today' | 'week' | 'later' | 'nodate' | 'done';

export interface BucketableItem {
  status: string;
  due_date: string | null;
}

export const BUCKET_ORDER: DateBucket[] = ['overdue', 'today', 'week', 'later', 'nodate', 'done'];

export const BUCKET_META: Record<DateBucket, { label: string; tone: 'danger' | 'warning' | 'accent' | 'muted' | 'success' }> = {
  overdue: { label: 'Overdue', tone: 'danger' },
  today:   { label: 'Today', tone: 'warning' },
  week:    { label: 'This week', tone: 'accent' },
  later:   { label: 'Upcoming', tone: 'muted' },
  nodate:  { label: 'No due date', tone: 'muted' },
  done:    { label: 'Done', tone: 'success' },
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Which bucket an item falls into, relative to `now`. */
export function bucketFor(item: BucketableItem, now: Date = new Date()): DateBucket {
  if (item.status === 'done' || item.status === 'cancelled') return 'done';
  if (!item.due_date) return 'nodate';

  const today = startOfDay(now);
  const due = startOfDay(new Date(item.due_date + (item.due_date.length <= 10 ? 'T00:00:00' : '')));
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'week';
  return 'later';
}

/** Group items into ordered, non-empty buckets. */
export function groupByDate<T extends BucketableItem>(
  items: T[],
  now: Date = new Date(),
): Array<{ bucket: DateBucket; items: T[] }> {
  const map = new Map<DateBucket, T[]>();
  for (const item of items) {
    const b = bucketFor(item, now);
    if (!map.has(b)) map.set(b, []);
    map.get(b)!.push(item);
  }
  return BUCKET_ORDER
    .filter((b) => map.has(b))
    .map((b) => ({ bucket: b, items: map.get(b)! }));
}
