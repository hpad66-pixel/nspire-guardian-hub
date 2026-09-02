import { describe, expect, it } from 'vitest';
import {
  isOpsOwnerRole,
  isOpsPmOrOwner,
  modulesForOpsRole,
  opsHasModule,
  opsPortalPath,
  OPS_ROLE_MODULES,
} from '../opsPortal';

describe('opsPortal', () => {
  it('gives maintenance techs only the maintenance module', () => {
    expect(Array.from(modulesForOpsRole('ops_tech'))).toEqual(['maintenance']);
    expect(opsHasModule('ops_tech', 'stores')).toBe(false);
    expect(opsHasModule('ops_tech', 'executive')).toBe(false);
  });

  it('gives PM nspire, stores, voice, costs — but not executive', () => {
    const mods = modulesForOpsRole('ops_pm');
    expect(mods.has('maintenance')).toBe(true);
    expect(mods.has('nspire')).toBe(true);
    expect(mods.has('stores')).toBe(true);
    expect(mods.has('voice')).toBe(true);
    expect(mods.has('costs')).toBe(true);
    expect(mods.has('water')).toBe(true);
    expect(mods.has('executive')).toBe(false);
    expect(isOpsPmOrOwner('ops_pm')).toBe(true);
    expect(isOpsOwnerRole('ops_pm')).toBe(false);
  });

  it('gives owner the executive module on top of PM modules', () => {
    expect(OPS_ROLE_MODULES.ops_owner).toContain('executive');
    expect(opsHasModule('ops_owner', 'executive')).toBe(true);
    expect(isOpsOwnerRole('ops_owner')).toBe(true);
  });

  it('builds property-scoped paths', () => {
    expect(opsPortalPath(null)).toBe('/ops-portal');
    expect(opsPortalPath('p1')).toBe('/ops-portal/properties/p1');
    expect(opsPortalPath('p1', 'work-orders')).toBe('/ops-portal/properties/p1/work-orders');
    expect(opsPortalPath('p1', '/executive')).toBe('/ops-portal/properties/p1/executive');
  });

  it('honors explicit module list overrides', () => {
    expect(opsHasModule('ops_tech', 'stores', ['maintenance', 'stores'])).toBe(true);
    expect(opsHasModule('ops_owner', 'executive', ['maintenance'])).toBe(false);
  });
});
