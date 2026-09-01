import { describe, expect, it } from 'vitest';
import {
  MODULE_CATALOG,
  MODULE_PLATFORM_COLUMN,
  MODULE_WS_COLUMN,
  PACKAGES,
  buildPackageModulePatch,
  buildPackagePropertyFlags,
} from '@/lib/packages';

describe('buildPackageModulePatch', () => {
  it('enterprise unlocks every workspace toggle and platform gate', () => {
    const patch = buildPackageModulePatch('enterprise');
    expect(patch.package).toBe('Enterprise');

    for (const col of Object.values(MODULE_WS_COLUMN)) {
      expect(patch[col as string], col).toBe(true);
    }
    for (const col of Object.values(MODULE_PLATFORM_COLUMN)) {
      expect(patch[col as string], col).toBe(true);
    }
  });

  it('enterprise includes every catalog module key', () => {
    const enterprise = PACKAGES.find((p) => p.key === 'enterprise')!;
    const allKeys = MODULE_CATALOG.flatMap((c) => c.modules.map((m) => m.key));
    expect(new Set(enterprise.modules)).toEqual(new Set(allKeys));
  });

  it('construction package leaves field-ops platform gates off', () => {
    const patch = buildPackageModulePatch('construction');
    expect(patch.construction_enabled).toBe(true);
    expect(patch.platform_construction).toBe(true);
    expect(patch.safety_module_enabled).toBe(false);
    expect(patch.platform_safety_module).toBe(false);
    expect(patch.property_mgmt_enabled).toBe(false);
    expect(patch.platform_property_mgmt).toBe(false);
  });

  it('maps every workspace column to a platform_* column', () => {
    for (const [mk, wsCol] of Object.entries(MODULE_WS_COLUMN)) {
      const platformCol = MODULE_PLATFORM_COLUMN[mk as keyof typeof MODULE_PLATFORM_COLUMN];
      expect(platformCol).toBe(`platform_${(wsCol as string).replace(/_enabled$/, '')}`);
    }
  });

  it('throws on unknown package', () => {
    expect(() => buildPackageModulePatch('nope')).toThrow(/Unknown package/);
  });
});

describe('buildPackagePropertyFlags', () => {
  it('enterprise turns on property-backed modules and projects', () => {
    expect(buildPackagePropertyFlags('enterprise')).toEqual({
      nspire_enabled: true,
      daily_grounds_enabled: true,
      projects_enabled: true,
    });
  });

  it('consulting enables projects_enabled without nspire', () => {
    expect(buildPackagePropertyFlags('consulting')).toEqual({
      nspire_enabled: false,
      daily_grounds_enabled: false,
      projects_enabled: true,
    });
  });
});
