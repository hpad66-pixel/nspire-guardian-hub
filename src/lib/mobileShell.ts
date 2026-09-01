/**
 * Shared mobile / tablet shell metrics for the AppLayout + MobileNav chrome.
 * Keep padding in sync with MobileNav primary (4rem) and iPad secondary (2.5rem) bars.
 */

/** Primary bottom nav bar height (matches MobileNav). */
export const MOBILE_NAV_BAR_REM = 4;

/** iPad secondary context bar height (md–lg only). */
export const MOBILE_SECONDARY_BAR_REM = 2.5;

/**
 * Tailwind-friendly padding-bottom for main content when the bottom nav is visible.
 * Phone (< md): primary bar + safe-area.
 * Tablet (md–lg): primary + secondary + safe-area (extra space when secondary is hidden is fine).
 */
export const MOBILE_MAIN_PADDING_CLASS =
  'pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0';

/**
 * Offset for floating UI (install banner, FABs) so it sits above the primary bottom nav.
 */
export const MOBILE_FLOAT_ABOVE_NAV_CLASS =
  'bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:bottom-4';
