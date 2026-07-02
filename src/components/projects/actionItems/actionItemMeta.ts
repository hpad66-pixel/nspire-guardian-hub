import type { ActionItem } from '@/hooks/useActionItems';
import type { DateBucket } from '@/lib/actionItems/grouping';

export const PRIORITY_META: Record<ActionItem['priority'], { label: string; dot: string }> = {
  urgent: { label: 'Urgent', dot: 'bg-[var(--apas-rose)]' },
  high:   { label: 'High',   dot: 'bg-[var(--apas-amber)]' },
  medium: { label: 'Medium', dot: 'bg-[var(--apas-sapphire)]' },
  low:    { label: 'Low',    dot: 'bg-muted-foreground' },
};

export const STATUS_META: Record<ActionItem['status'], { label: string }> = {
  todo:        { label: 'To do' },
  in_progress: { label: 'In progress' },
  in_review:   { label: 'In review' },
  done:        { label: 'Done' },
  cancelled:   { label: 'Cancelled' },
};

export const STATUS_ORDER: ActionItem['status'][] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
export const PRIORITY_ORDER: ActionItem['priority'][] = ['urgent', 'high', 'medium', 'low'];

export const BUCKET_TONE: Record<DateBucket, string> = {
  overdue: 'text-[var(--apas-rose)]',
  today:   'text-[var(--apas-amber)]',
  week:    'text-[var(--apas-sapphire)]',
  later:   'text-muted-foreground',
  nodate:  'text-muted-foreground',
  done:    'text-[var(--apas-emerald)]',
};

export const BUCKET_DOT: Record<DateBucket, string> = {
  overdue: 'bg-[var(--apas-rose)]',
  today:   'bg-[var(--apas-amber)]',
  week:    'bg-[var(--apas-sapphire)]',
  later:   'bg-muted-foreground',
  nodate:  'bg-muted-foreground',
  done:    'bg-[var(--apas-emerald)]',
};
