import { describe, expect, it } from 'vitest';
import {
  GLORIETA_SITE_LAYOUT,
  countAssetsByKind,
  matchLayoutAsset,
} from '@/lib/site-map/glorietaSiteLayout';

describe('glorietaSiteLayout', () => {
  it('seeds only as-built truth + confirmed pond (no catch basins / pumps)', () => {
    const counts = countAssetsByKind(GLORIETA_SITE_LAYOUT);
    expect(counts.manhole).toBe(8);
    expect(counts.cleanout).toBe(24);
    expect(counts.retention_pond).toBe(1);
    expect(counts.total).toBe(33);

    const kinds = new Set(GLORIETA_SITE_LAYOUT.assets.map((a) => a.kind));
    expect(kinds.has('catch_basin')).toBe(false);
    expect(kinds.has('manhole')).toBe(true);
    expect(kinds.has('cleanout')).toBe(true);
    expect(kinds.has('retention_pond')).toBe(true);

    // Drawing numbers preserved for manholes
    for (let i = 1; i <= 8; i++) {
      expect(GLORIETA_SITE_LAYOUT.assets.some((a) => a.code === `S-${i}`)).toBe(true);
    }
  });

  it('matches DB assets by drawing code', () => {
    const pin = GLORIETA_SITE_LAYOUT.assets.find((a) => a.code === 'S-6')!;
    const db = matchLayoutAsset(pin, [
      { id: 'a1', name: 'S-6', asset_type: 'manhole', status: 'active' },
      { id: 'a2', name: 'CO-01', asset_type: 'cleanout', status: 'active' },
    ]);
    expect(db?.id).toBe('a1');
  });

  it('includes buildings and sewer lines for the interactive map', () => {
    expect(GLORIETA_SITE_LAYOUT.buildings.length).toBeGreaterThanOrEqual(3);
    expect(GLORIETA_SITE_LAYOUT.sewerLines.length).toBeGreaterThanOrEqual(3);
    expect(GLORIETA_SITE_LAYOUT.pond.d.length).toBeGreaterThan(10);
  });
});
