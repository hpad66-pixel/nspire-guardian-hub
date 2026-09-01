import { describe, expect, it } from 'vitest';
import { DASHBOARD_NAV_CATEGORIES, filterDashboardNavCategories } from '../navMap';

describe('filterDashboardNavCategories', () => {
  it('keeps ungated items and drops disabled modules', () => {
    const filtered = filterDashboardNavCategories(DASHBOARD_NAV_CATEGORIES, (m) => {
      if (m === 'propertyMgmtEnabled') return false;
      if (m === 'aiEnabled') return false;
      return true;
    });

    const ids = filtered.flatMap((c) => c.items.map((i) => i.id));
    expect(ids).toContain('my-day');
    expect(ids).toContain('projects');
    expect(ids).not.toContain('work-orders');
    expect(ids).not.toContain('permits');
    expect(ids).not.toContain('voice');
  });

  it('drops empty categories', () => {
    const filtered = filterDashboardNavCategories(DASHBOARD_NAV_CATEGORIES, () => false);
    // Only items without a module flag remain
    expect(filtered.every((c) => c.items.length > 0)).toBe(true);
    expect(filtered.flatMap((c) => c.items).every((i) => !i.module)).toBe(true);
  });

  it('exposes Work + Field + Money/People + Ops categories by default', () => {
    expect(DASHBOARD_NAV_CATEGORIES.map((c) => c.id)).toEqual([
      'work',
      'field',
      'money-people',
      'ops-insights',
    ]);
  });
});
