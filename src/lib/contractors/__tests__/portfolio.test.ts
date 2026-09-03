import { describe, expect, it } from 'vitest';
import { buildContractorPortfolio } from '../portfolio';
import type { ContractorCase, ContractorPortalLink } from '@/hooks/useContractorReadiness';

function qualification(overrides: Partial<ContractorCase>): ContractorCase {
  return {
    id: 'case-1', tenant_id: 'tenant-1', organization_id: 'org-1', client_id: null,
    project_id: null, scope_type: 'workspace', status: 'invited', risk_tier: 'standard',
    score: 25, work_ready: false, contract_ready: false, payment_ready: false,
    invited_at: null, submitted_at: null, reviewed_at: null, internal_notes: null,
    created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z',
    organization: { id: 'org-1', name: 'Acme', legal_name: null, email: 'a@acme.test', phone: null, website: null, kind: 'sub' },
    profile: { trade_categories: ['Roofing'] },
    ...overrides,
  };
}

describe('buildContractorPortfolio', () => {
  it('collapses project qualifications into one reusable company record', () => {
    const rows = [
      qualification({ id: 'case-1', project_id: 'project-1', scope_type: 'project', score: 100, work_ready: true, contract_ready: true, payment_ready: true }),
      qualification({ id: 'case-2', project_id: 'project-2', scope_type: 'project', score: 50, updated_at: '2026-09-02T12:00:00Z', profile: { trade_categories: ['Concrete'] } }),
    ];
    const result = buildContractorPortfolio(rows);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'Acme', averageScore: 75, readyScopes: 1 });
    expect(result[0].trades).toEqual(['Concrete', 'Roofing']);
    expect(result[0].primaryCase.id).toBe('case-2');
  });

  it('attaches the latest portal activity to the company', () => {
    const link = { id: 'link-1', case_id: 'case-1', created_at: '2026-09-03T12:00:00Z' } as ContractorPortalLink;
    expect(buildContractorPortfolio([qualification({})], [link])[0].latestPortal?.id).toBe('link-1');
  });
});
