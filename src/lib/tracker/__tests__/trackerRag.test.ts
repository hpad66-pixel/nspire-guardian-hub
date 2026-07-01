import { describe, it, expect } from 'vitest';
import { ragFor, daysUntilDue, duePhrase, ragCounts, DUE_SOON_DAYS, ageDays, ageLabel, isAging, STALE_DAYS } from '../trackerRag';

// Fixed "now" so the relative-date math is deterministic.
const NOW = new Date('2026-06-30T12:00:00');
const iso = (d: string) => d; // dates are stored as YYYY-MM-DD

describe('trackerRag', () => {
  it('done items are green regardless of due date', () => {
    expect(ragFor({ status: 'done', due_date: '2020-01-01' }, NOW)).toBe('done');
  });

  it('blocked items are at-risk (red) regardless of due date', () => {
    expect(ragFor({ status: 'blocked', due_date: '2030-01-01' }, NOW)).toBe('at-risk');
  });

  it('a past due date (not done) is overdue', () => {
    expect(ragFor({ status: 'open', due_date: iso('2026-06-28') }, NOW)).toBe('overdue');
  });

  it('a due date within the threshold is due-soon', () => {
    const soon = new Date('2026-07-02T00:00:00').toISOString().slice(0, 10); // +2 days
    expect(ragFor({ status: 'progress', due_date: soon }, NOW)).toBe('due-soon');
  });

  it('a due date comfortably in the future is on-track', () => {
    expect(ragFor({ status: 'open', due_date: iso('2026-08-01') }, NOW)).toBe('on-track');
  });

  it('no due date is none', () => {
    expect(ragFor({ status: 'open', due_date: null }, NOW)).toBe('none');
  });

  it('daysUntilDue is negative for overdue, 0 for today', () => {
    expect(daysUntilDue('2026-06-28', NOW)).toBe(-2);
    expect(daysUntilDue('2026-06-30', NOW)).toBe(0);
    expect(daysUntilDue(null, NOW)).toBeNull();
  });

  it('duePhrase reads naturally', () => {
    expect(duePhrase('2026-06-29', NOW)).toBe('1 day overdue');
    expect(duePhrase('2026-06-30', NOW)).toBe('Due today');
    expect(duePhrase('2026-07-01', NOW)).toBe('Due tomorrow');
    expect(duePhrase('2026-07-03', NOW)).toBe(`Due in ${DUE_SOON_DAYS} days`); // +3 days
  });

  it('ageDays counts whole days since created; ageLabel compacts', () => {
    expect(ageDays('2026-06-20T12:00:00', NOW)).toBe(10);
    expect(ageDays(null, NOW)).toBe(0);
    expect(ageLabel(3)).toBe('3d');
    expect(ageLabel(10)).toBe('1w');
    expect(ageLabel(45)).toBe('1mo');
  });

  it('isAging flags open items older than STALE_DAYS, never done ones', () => {
    const old = new Date(NOW.getTime() - (STALE_DAYS + 1) * 86_400_000).toISOString();
    const fresh = new Date(NOW.getTime() - 2 * 86_400_000).toISOString();
    expect(isAging({ status: 'open', created_at: old }, NOW)).toBe(true);
    expect(isAging({ status: 'open', created_at: fresh }, NOW)).toBe(false);
    expect(isAging({ status: 'done', created_at: old }, NOW)).toBe(false);
  });

  it('ragCounts rolls up a mixed list', () => {
    const c = ragCounts([
      { status: 'done', due_date: null },
      { status: 'open', due_date: '2026-06-01' },   // overdue
      { status: 'blocked', due_date: null },          // at-risk
      { status: 'open', due_date: null },             // none
    ], NOW);
    expect(c.done).toBe(1);
    expect(c.overdue).toBe(1);
    expect(c['at-risk']).toBe(1);
    expect(c.none).toBe(1);
  });
});
