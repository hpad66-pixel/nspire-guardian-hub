import type { DateBucket } from '@/lib/actionItems/grouping';
import { bucketFor, type BucketableItem } from '@/lib/actionItems/grouping';

export type MyDayPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface FocusableItem extends BucketableItem {
  id: string;
  title: string;
  priority: MyDayPriority;
  due_date: string | null;
  project_id: string;
  project?: { id: string; name: string } | null;
}

const PRIORITY_WEIGHT: Record<MyDayPriority, number> = {
  urgent: 400,
  high: 300,
  medium: 150,
  low: 50,
};

const BUCKET_WEIGHT: Record<DateBucket, number> = {
  overdue: 1000,
  today: 600,
  week: 250,
  later: 80,
  nodate: 40,
  done: 0,
};

/** Time-aware greeting; uses first name when available. */
export function myDayGreeting(fullName: string | null | undefined, now: Date = new Date()): string {
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `${greet}, ${first}` : greet;
}

/** Rank score — higher = address sooner. Overdue and urgent dominate. */
export function focusScore(item: FocusableItem, now: Date = new Date()): number {
  const bucket = bucketFor(item, now);
  let score = BUCKET_WEIGHT[bucket] + PRIORITY_WEIGHT[item.priority];

  if (bucket === 'overdue' && item.due_date) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(item.due_date + (item.due_date.length <= 10 ? 'T00:00:00' : ''));
    const days = Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000));
    score += Math.min(days, 30) * 10;
  }

  return score;
}

/** Top N items the user should tackle first. */
export function pickFocusItems<T extends FocusableItem>(
  items: T[],
  limit = 3,
  now: Date = new Date(),
): T[] {
  return [...items]
    .sort((a, b) => {
      const diff = focusScore(b, now) - focusScore(a, now);
      if (diff !== 0) return diff;
      // Stable tie-break: earlier due date first, then title.
      const aDue = a.due_date ?? '9999-12-31';
      const bDue = b.due_date ?? '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

export interface MyDayHeroCopy {
  headline: string;
  subline: string;
  ctaLabel: string | null;
  ctaTarget: 'focus' | 'needs-you' | 'waiting' | null;
  tone: 'clear' | 'focus' | 'overdue';
}

/** Invite-to-act copy for the My Day hero. */
export function myDayHeroCopy(input: {
  mineCount: number;
  overdueCount: number;
  todayCount: number;
  waitingCount: number;
  doneTodayCount: number;
  fullName?: string | null;
  now?: Date;
}): MyDayHeroCopy {
  const {
    mineCount,
    overdueCount,
    todayCount,
    waitingCount,
    doneTodayCount,
    fullName,
    now = new Date(),
  } = input;
  const greet = myDayGreeting(fullName, now);

  if (mineCount === 0) {
    return {
      headline: `${greet} — you're clear.`,
      subline:
        waitingCount > 0
          ? `${waitingCount} still waiting on others. Enjoy the breathing room, or nudge a follow-up.`
          : doneTodayCount > 0
            ? `You cleared ${doneTodayCount} today. Nice work.`
            : 'Nothing on your plate right now. When something lands, it shows up here first.',
      ctaLabel: waitingCount > 0 ? 'Review waiting' : null,
      ctaTarget: waitingCount > 0 ? 'waiting' : null,
      tone: 'clear',
    };
  }

  if (overdueCount > 0) {
    return {
      headline: `${greet} — ${overdueCount} overdue need you.`,
      subline:
        todayCount > 0
          ? `${todayCount} more due today · ${mineCount} on your plate total`
          : `${mineCount} on your plate · start with the overdue ones`,
      ctaLabel: 'Start with overdue',
      ctaTarget: 'focus',
      tone: 'overdue',
    };
  }

  if (todayCount > 0) {
    return {
      headline: `${greet} — ${todayCount} need you today.`,
      subline: `${mineCount} on your plate${waitingCount > 0 ? ` · ${waitingCount} waiting on others` : ''}`,
      ctaLabel: "Clear today's plate",
      ctaTarget: 'focus',
      tone: 'focus',
    };
  }

  return {
    headline: `${greet} — ${mineCount} on your plate.`,
    subline:
      waitingCount > 0
        ? `${waitingCount} waiting on others · nothing overdue`
        : 'Nothing overdue. Knock out the next ones when you are ready.',
    ctaLabel: 'See what needs you',
    ctaTarget: 'needs-you',
    tone: 'focus',
  };
}

export function countByBucket<T extends BucketableItem>(
  items: T[],
  now: Date = new Date(),
): Record<DateBucket, number> {
  const counts: Record<DateBucket, number> = {
    overdue: 0,
    today: 0,
    week: 0,
    later: 0,
    nodate: 0,
    done: 0,
  };
  for (const item of items) counts[bucketFor(item, now)]++;
  return counts;
}
