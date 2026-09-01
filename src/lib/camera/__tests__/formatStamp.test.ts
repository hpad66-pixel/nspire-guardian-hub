import { describe, expect, it } from 'vitest';
import {
  buildLocationLine,
  buildStampLines,
  flattenStampLines,
  formatCoords,
  formatStampWhen,
} from '../formatStamp';
import { DEFAULT_STAMP_SETTINGS } from '../types';

describe('formatStampWhen', () => {
  it('formats to the second with weekday preset', () => {
    const d = new Date(2026, 8, 1, 22, 22, 41); // Sep 1, 2026 10:22:41 PM local
    const s = formatStampWhen(d, 'ddd_MMM_D_YYYY_h_mm_ss_A');
    expect(s).toContain('Sep 1, 2026');
    expect(s).toMatch(/10:22:41 PM$/);
    expect(s.startsWith('Tue')).toBe(true);
  });

  it('supports ISO-like 24h format', () => {
    const d = new Date(2026, 8, 1, 22, 22, 41);
    expect(formatStampWhen(d, 'YYYY-MM-DD_HH_mm_ss')).toBe('2026-09-01 22:22:41');
  });
});

describe('buildStampLines', () => {
  it('includes location, WO, unit, tech, and custom text', () => {
    const bundle = buildStampLines(
      {
        ...DEFAULT_STAMP_SETTINGS,
        customText: 'Filter change',
        showLocation: true,
      },
      {
        now: new Date(2026, 8, 1, 22, 22, 41),
        geo: {
          lat: 25.9,
          lng: -80.25,
          address: '13004 Alexandria Dr, Opa-Locka, FL',
          capturedAt: new Date().toISOString(),
        },
        context: {
          workOrderLabel: 'WO-1842',
          unitLabel: 'Unit 5-204',
          propertyLabel: 'Glorieta Gardens',
          technicianName: 'Hardeep',
        },
      },
    );

    const lines = flattenStampLines(bundle);
    expect(lines[0]).toContain('2026');
    expect(lines).toContain('13004 Alexandria Dr, Opa-Locka, FL');
    expect(lines).toContain('WO-1842');
    expect(lines).toContain('Unit 5-204');
    expect(lines).toContain('Glorieta Gardens');
    expect(lines).toContain('Hardeep');
    expect(lines).toContain('Filter change');
  });

  it('falls back to coordinates when no address', () => {
    const line = buildLocationLine({
      lat: 25.9,
      lng: -80.25,
      capturedAt: new Date().toISOString(),
    });
    expect(line).toBe(formatCoords(25.9, -80.25));
  });

  it('prefers address hint over GPS address', () => {
    const line = buildLocationLine(
      {
        lat: 1,
        lng: 2,
        address: 'From GPS',
        capturedAt: new Date().toISOString(),
      },
      'Property hint address',
    );
    expect(line).toBe('Property hint address');
  });

  it('hides location when setting is off', () => {
    const bundle = buildStampLines(
      { ...DEFAULT_STAMP_SETTINGS, showLocation: false },
      {
        geo: {
          lat: 1,
          lng: 2,
          address: 'Somewhere',
          capturedAt: new Date().toISOString(),
        },
      },
    );
    expect(bundle.locationLine).toBeNull();
  });
});
