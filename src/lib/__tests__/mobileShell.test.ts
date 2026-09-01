import { describe, expect, it } from 'vitest';
import {
  MOBILE_FLOAT_ABOVE_NAV_CLASS,
  MOBILE_MAIN_PADDING_CLASS,
  MOBILE_NAV_BAR_REM,
  MOBILE_SECONDARY_BAR_REM,
} from '@/lib/mobileShell';

describe('mobileShell', () => {
  it('keeps primary + secondary bar heights in sync with MobileNav chrome', () => {
    expect(MOBILE_NAV_BAR_REM).toBe(4);
    expect(MOBILE_SECONDARY_BAR_REM).toBe(2.5);
    expect(MOBILE_NAV_BAR_REM + MOBILE_SECONDARY_BAR_REM).toBe(6.5);
  });

  it('pads main content for phone and tablet bottom chrome including safe-area', () => {
    expect(MOBILE_MAIN_PADDING_CLASS).toContain('4rem');
    expect(MOBILE_MAIN_PADDING_CLASS).toContain('6.5rem');
    expect(MOBILE_MAIN_PADDING_CLASS).toContain('safe-area-inset-bottom');
    expect(MOBILE_MAIN_PADDING_CLASS).toContain('lg:pb-0');
  });

  it('floats install banner / FABs above the primary bottom nav on compact viewports', () => {
    expect(MOBILE_FLOAT_ABOVE_NAV_CLASS).toContain('4rem');
    expect(MOBILE_FLOAT_ABOVE_NAV_CLASS).toContain('safe-area-inset-bottom');
    expect(MOBILE_FLOAT_ABOVE_NAV_CLASS).toContain('lg:bottom-4');
  });
});
