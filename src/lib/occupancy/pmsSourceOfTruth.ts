/** localStorage key: dismisses the large empty-state PMS intro on Occupancy. */
export const OCCUPANCY_PMS_INTRO_DISMISSED_KEY = 'occupancy_pms_intro_dismissed';

export const PMS_SOURCE_TITLE = 'Your Property Management system is the source of truth';

export const PMS_SOURCE_SUMMARY =
  'ProjOS does not replace your Property Management Office (PMO) software. For accurate reporting, import occupancy here as a one-way feed — it never overwrites records in your PMO system.';

export const PMS_SOURCE_RECOMMENDATION =
  'Recommended: download a CSV from your PMO every week and import it here. If your system allows, we can set up a direct integration so this stays current in real time.';

/** Compact line kept at the top of Occupancy after the intro is dismissed. */
export const PMS_SOURCE_COMPACT =
  'Source of truth: your Property Management Office system. ProjOS receives a one-way feed only (weekly CSV recommended, or direct integration) — never overwrites your PMO records.';

export function isOccupancyPmsIntroDismissed(): boolean {
  try {
    return localStorage.getItem(OCCUPANCY_PMS_INTRO_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissOccupancyPmsIntro(): void {
  try {
    localStorage.setItem(OCCUPANCY_PMS_INTRO_DISMISSED_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
}
