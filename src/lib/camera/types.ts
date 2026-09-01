/** Field Camera — timestamp / GPS stamp types (v1 photos). */

export type StampPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type StampDateFormat =
  | 'MMM_D_YYYY_h_mm_ss_A'
  | 'YYYY-MM-DD_HH_mm_ss'
  | 'MM/DD/YYYY_h_mm_ss_A'
  | 'DD/MM/YYYY_HH_mm_ss'
  | 'ddd_MMM_D_YYYY_h_mm_ss_A';

export type StampTextColor = 'white' | 'yellow' | 'black' | 'blue';

export interface StampAutoLines {
  workOrder: boolean;
  unit: boolean;
  project: boolean;
  technician: boolean;
}

export interface StampSettings {
  dateFormat: StampDateFormat;
  showLocation: boolean;
  position: StampPosition;
  fontSize: number; // 12–36
  opacity: number; // 0–1 (text + card)
  textColor: StampTextColor;
  customText: string;
  autoLines: StampAutoLines;
}

export interface StampContext {
  workOrderLabel?: string | null;
  unitLabel?: string | null;
  projectLabel?: string | null;
  propertyLabel?: string | null;
  technicianName?: string | null;
  /** Preferred human address (property / unit). GPS fills in when missing. */
  addressHint?: string | null;
}

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string | null;
  capturedAt: string;
}

export interface StampLineBundle {
  when: string;
  locationLine: string | null;
  contextLines: string[];
  customText: string | null;
}

export const DEFAULT_STAMP_SETTINGS: StampSettings = {
  dateFormat: 'ddd_MMM_D_YYYY_h_mm_ss_A',
  showLocation: true,
  position: 'bottom-left',
  fontSize: 18,
  opacity: 0.92,
  textColor: 'white',
  customText: '',
  autoLines: {
    workOrder: true,
    unit: true,
    project: true,
    technician: true,
  },
};

export const STAMP_DATE_FORMAT_OPTIONS: { value: StampDateFormat; label: string }[] = [
  { value: 'ddd_MMM_D_YYYY_h_mm_ss_A', label: 'Tue Sep 1, 2026 · 10:22:41 PM' },
  { value: 'MMM_D_YYYY_h_mm_ss_A', label: 'Sep 1, 2026 · 10:22:41 PM' },
  { value: 'YYYY-MM-DD_HH_mm_ss', label: '2026-09-01 22:22:41' },
  { value: 'MM/DD/YYYY_h_mm_ss_A', label: '09/01/2026 · 10:22:41 PM' },
  { value: 'DD/MM/YYYY_HH_mm_ss', label: '01/09/2026 22:22:41' },
];

export const STAMP_COLOR_HEX: Record<StampTextColor, string> = {
  white: '#FFFFFF',
  yellow: '#FACC15',
  black: '#111827',
  blue: '#1D6FE8',
};
