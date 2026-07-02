import { describe, it, expect } from 'vitest';
import { bucketFor, groupByDate, BUCKET_ORDER } from '../grouping';

const NOW = new Date('2026-07-02T12:00:00');
const day = (offset: number) => {
  const d = new Date('2026-07-02T00:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

describe('action item date grouping', () => {
  it('buckets by due date relative to now', () => {
    expect(bucketFor({ status: 'todo', due_date: day(-1) }, NOW)).toBe('overdue');
    expect(bucketFor({ status: 'todo', due_date: day(0) }, NOW)).toBe('today');
    expect(bucketFor({ status: 'todo', due_date: day(3) }, NOW)).toBe('week');
    expect(bucketFor({ status: 'todo', due_date: day(30) }, NOW)).toBe('later');
    expect(bucketFor({ status: 'todo', due_date: null }, NOW)).toBe('nodate');
  });

  it('routes done/cancelled to the done bucket regardless of date', () => {
    expect(bucketFor({ status: 'done', due_date: day(-5) }, NOW)).toBe('done');
    expect(bucketFor({ status: 'cancelled', due_date: null }, NOW)).toBe('done');
  });

  it('returns only non-empty buckets in canonical order', () => {
    const groups = groupByDate([
      { status: 'todo', due_date: day(30) },   // later
      { status: 'todo', due_date: day(-1) },   // overdue
      { status: 'done', due_date: day(-1) },   // done
    ], NOW);
    expect(groups.map((g) => g.bucket)).toEqual(['overdue', 'later', 'done']);
    // canonical order is respected
    const idx = groups.map((g) => BUCKET_ORDER.indexOf(g.bucket));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});
