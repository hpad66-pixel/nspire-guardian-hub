import { describe, expect, it } from 'vitest';
import {
  assessProjectLifecycle,
  isProjectLocked,
  isProtectedHistoricalProject,
  lifecyclePackageForProject,
} from '../businessLifecycle';

describe('business lifecycle guardrails', () => {
  it('treats finalized Glorieta records as protected historical records', () => {
    const project = {
      id: 'glorieta-sewer',
      name: 'Glorieta Gardens Sewer Extension',
      status: 'closed',
      project_type: 'construction',
      closed_at: '2026-09-22T12:00:00Z',
      client: { name: 'R4' },
    };

    const lifecycle = assessProjectLifecycle(project);

    expect(isProjectLocked(project)).toBe(true);
    expect(isProtectedHistoricalProject(project)).toBe(true);
    expect(lifecycle.lockTone).toBe('protected');
    expect(lifecycle.lockLabel).toContain('no silent recalculation');
    expect(lifecycle.warnings).toContain('Historical R4 / Glorieta record. Future templates must not recalculate it.');
  });

  it('routes construction and consulting projects into different sellable packages', () => {
    expect(lifecyclePackageForProject({ project_type: 'construction' })).toEqual({
      key: 'construction-management',
      label: 'Construction Management',
    });
    expect(lifecyclePackageForProject({ project_type: 'consulting' })).toEqual({
      key: 'consulting-management',
      label: 'Consulting Management',
    });
  });

  it('prompts active consulting projects toward approved value invoicing', () => {
    const lifecycle = assessProjectLifecycle({
      id: 'consulting-project',
      name: 'City Engineering Review',
      status: 'active',
      project_type: 'consulting',
      target_end_date: '2026-12-31',
      budget: 10000,
    });

    expect(lifecycle.kind).toBe('consulting');
    expect(lifecycle.stage).toBe('billing');
    expect(lifecycle.nextActionHref).toBe('/projects/consulting-project/financials/client-invoices');
    expect(lifecycle.moneyLabel).toContain('Approved value');
  });
});
