import { describe, expect, it } from 'vitest';
import { dashboardGreeting, dashboardHeroCopy } from '../hero';

describe('dashboardGreeting', () => {
  it('uses first name in the morning', () => {
    expect(dashboardGreeting('Hardeep Anand', new Date('2026-09-01T09:00:00'))).toBe(
      'Good morning, Hardeep',
    );
  });

  it('falls back without a name', () => {
    expect(dashboardGreeting(null, new Date('2026-09-01T15:00:00'))).toBe('Good afternoon');
  });
});

describe('dashboardHeroCopy', () => {
  const base = {
    fullName: 'Hardeep Anand',
    workspaceName: 'APAS',
    criticalCount: 0,
    warningCount: 0,
    activeProjects: 5,
    openWOs: 0,
    openIssues: 0,
    now: new Date('2026-09-01T09:00:00'),
  };

  it('prioritizes critical items', () => {
    const copy = dashboardHeroCopy({ ...base, criticalCount: 3, warningCount: 2 });
    expect(copy.tone).toBe('critical');
    expect(copy.ctaTarget).toBe('critical');
    expect(copy.headline).toContain('3 need attention');
    expect(copy.statusLine).toContain('3 critical');
  });

  it('routes attention to issues when present', () => {
    const copy = dashboardHeroCopy({ ...base, openIssues: 4, openWOs: 2 });
    expect(copy.tone).toBe('attention');
    expect(copy.ctaTarget).toBe('issues');
    expect(copy.ctaLabel).toMatch(/issues/i);
  });

  it('celebrates a clear workspace', () => {
    const copy = dashboardHeroCopy(base);
    expect(copy.tone).toBe('clear');
    expect(copy.ctaTarget).toBe('projects');
    expect(copy.headline).toMatch(/clear/i);
  });
});
