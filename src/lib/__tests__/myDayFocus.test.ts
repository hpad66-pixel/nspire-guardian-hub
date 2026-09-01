import { describe, it, expect } from 'vitest';
import {
  myDayGreeting,
  focusScore,
  pickFocusItems,
  myDayHeroCopy,
  countByBucket,
  type FocusableItem,
} from '@/lib/myDay/focus';

const noon = new Date('2026-09-01T12:00:00');
const morning = new Date('2026-09-01T09:00:00');

function item(partial: Partial<FocusableItem> & Pick<FocusableItem, 'id' | 'title'>): FocusableItem {
  return {
    status: 'todo',
    priority: 'medium',
    due_date: null,
    project_id: 'p1',
    ...partial,
  };
}

describe('myDayGreeting', () => {
  it('uses first name in the morning', () => {
    expect(myDayGreeting('Hardeep Anand', morning)).toBe('Good morning, Hardeep');
  });

  it('falls back without a name', () => {
    expect(myDayGreeting(null, noon)).toBe('Good afternoon');
  });
});

describe('focusScore / pickFocusItems', () => {
  it('ranks overdue urgent above due-today medium', () => {
    const overdueUrgent = item({
      id: 'a',
      title: 'Overdue urgent',
      priority: 'urgent',
      due_date: '2026-08-20',
    });
    const todayMedium = item({
      id: 'b',
      title: 'Today medium',
      priority: 'medium',
      due_date: '2026-09-01',
    });
    expect(focusScore(overdueUrgent, noon)).toBeGreaterThan(focusScore(todayMedium, noon));
  });

  it('returns top N focus items in urgency order', () => {
    const items = [
      item({ id: 'later', title: 'Later', due_date: '2026-10-01', priority: 'low' }),
      item({ id: 'overdue', title: 'Overdue', due_date: '2026-08-15', priority: 'high' }),
      item({ id: 'today', title: 'Today', due_date: '2026-09-01', priority: 'urgent' }),
      item({ id: 'week', title: 'Week', due_date: '2026-09-05', priority: 'medium' }),
    ];
    const focus = pickFocusItems(items, 3, noon);
    expect(focus.map((i) => i.id)).toEqual(['overdue', 'today', 'week']);
  });
});

describe('myDayHeroCopy', () => {
  it('invites action when items are overdue', () => {
    const copy = myDayHeroCopy({
      mineCount: 5,
      overdueCount: 2,
      todayCount: 1,
      waitingCount: 3,
      doneTodayCount: 0,
      fullName: 'Hardeep Anand',
      now: morning,
    });
    expect(copy.tone).toBe('overdue');
    expect(copy.headline).toContain('2 overdue');
    expect(copy.ctaLabel).toBe('Start with overdue');
    expect(copy.ctaTarget).toBe('focus');
  });

  it('celebrates a clear plate', () => {
    const copy = myDayHeroCopy({
      mineCount: 0,
      overdueCount: 0,
      todayCount: 0,
      waitingCount: 0,
      doneTodayCount: 4,
      fullName: 'Hardeep',
      now: noon,
    });
    expect(copy.tone).toBe('clear');
    expect(copy.headline).toContain("you're clear");
    expect(copy.subline).toContain('4');
    expect(copy.ctaLabel).toBeNull();
  });

  it('points to waiting when plate is clear but asks are out', () => {
    const copy = myDayHeroCopy({
      mineCount: 0,
      overdueCount: 0,
      todayCount: 0,
      waitingCount: 9,
      doneTodayCount: 0,
      now: noon,
    });
    expect(copy.ctaTarget).toBe('waiting');
    expect(copy.ctaLabel).toBe('Review waiting');
  });
});

describe('countByBucket', () => {
  it('counts overdue and today correctly', () => {
    const counts = countByBucket(
      [
        item({ id: '1', title: 'a', due_date: '2026-08-01', status: 'todo' }),
        item({ id: '2', title: 'b', due_date: '2026-09-01', status: 'todo' }),
        item({ id: '3', title: 'c', due_date: null, status: 'todo' }),
      ],
      noon,
    );
    expect(counts.overdue).toBe(1);
    expect(counts.today).toBe(1);
    expect(counts.nodate).toBe(1);
  });
});
