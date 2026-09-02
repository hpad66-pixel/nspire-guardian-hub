import { describe, expect, it } from 'vitest';
import { modulesForOpsRole, opsHasModule, OPS_ROLE_LABELS } from '@/lib/portal/opsPortal';

/**
 * Light contract tests for Property Ops role → module matrix.
 * Full hook tests need supabase mocks; role matrix is the security UX contract.
 */
describe('Property Ops role matrix', () => {
  it('labels the three licensed roles', () => {
    expect(OPS_ROLE_LABELS.ops_tech).toMatch(/Maintenance/i);
    expect(OPS_ROLE_LABELS.ops_pm).toMatch(/Property Manager/i);
    expect(OPS_ROLE_LABELS.ops_owner).toMatch(/Owner/i);
  });

  it('keeps maintenance crew off NSPIRE / Stores / Voice / Executive', () => {
    const tech = modulesForOpsRole('ops_tech');
    expect(tech.has('maintenance')).toBe(true);
    expect(tech.has('nspire')).toBe(false);
    expect(tech.has('stores')).toBe(false);
    expect(tech.has('voice')).toBe(false);
    expect(tech.has('costs')).toBe(false);
    expect(tech.has('water')).toBe(false);
    expect(tech.has('executive')).toBe(false);
  });

  it('gives PM costs + ops modules without executive', () => {
    expect(opsHasModule('ops_pm', 'costs')).toBe(true);
    expect(opsHasModule('ops_pm', 'voice')).toBe(true);
    expect(opsHasModule('ops_pm', 'water')).toBe(true);
    expect(opsHasModule('ops_pm', 'executive')).toBe(false);
  });

  it('gives owner the exclusive executive dashboard', () => {
    expect(opsHasModule('ops_owner', 'executive')).toBe(true);
    expect(opsHasModule('ops_owner', 'costs')).toBe(true);
    expect(opsHasModule('ops_owner', 'water')).toBe(true);
  });
});
