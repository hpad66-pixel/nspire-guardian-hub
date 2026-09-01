import { afterEach, describe, expect, it } from 'vitest';
import {
  OCCUPANCY_PMS_INTRO_DISMISSED_KEY,
  PMS_SOURCE_COMPACT,
  PMS_SOURCE_TITLE,
  dismissOccupancyPmsIntro,
  isOccupancyPmsIntroDismissed,
} from '@/lib/occupancy/pmsSourceOfTruth';

describe('pmsSourceOfTruth', () => {
  afterEach(() => {
    localStorage.removeItem(OCCUPANCY_PMS_INTRO_DISMISSED_KEY);
  });

  it('states that the PMO is the source of truth and feed is one-way', () => {
    expect(PMS_SOURCE_TITLE.toLowerCase()).toContain('source of truth');
    expect(PMS_SOURCE_COMPACT.toLowerCase()).toMatch(/one-way|never overwrites/);
    expect(PMS_SOURCE_COMPACT.toLowerCase()).toContain('csv');
  });

  it('dismisses the intro once when Import is engaged', () => {
    expect(isOccupancyPmsIntroDismissed()).toBe(false);
    dismissOccupancyPmsIntro();
    expect(isOccupancyPmsIntroDismissed()).toBe(true);
    expect(localStorage.getItem(OCCUPANCY_PMS_INTRO_DISMISSED_KEY)).toBe('1');
  });
});
