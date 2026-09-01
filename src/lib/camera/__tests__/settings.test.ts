import { beforeEach, describe, expect, it } from 'vitest';
import { loadStampSettings, normalizeStampSettings, saveStampSettings } from '../settings';
import { DEFAULT_STAMP_SETTINGS } from '../types';

describe('stamp settings storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when empty', () => {
    expect(loadStampSettings()).toEqual(DEFAULT_STAMP_SETTINGS);
  });

  it('persists and reloads settings', () => {
    const next = saveStampSettings({
      ...DEFAULT_STAMP_SETTINGS,
      position: 'top-right',
      fontSize: 24,
      customText: 'Hello',
    });
    expect(next.position).toBe('top-right');
    expect(loadStampSettings().customText).toBe('Hello');
    expect(loadStampSettings().fontSize).toBe(24);
  });

  it('clamps font size and opacity', () => {
    const n = normalizeStampSettings({ fontSize: 99, opacity: 2 } as any);
    expect(n.fontSize).toBe(36);
    expect(n.opacity).toBe(1);
  });
});
