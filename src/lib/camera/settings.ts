import { DEFAULT_STAMP_SETTINGS, type StampSettings } from './types';

const STORAGE_KEY = 'projOS.fieldCamera.stampSettings.v1';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeStampSettings(raw: Partial<StampSettings> | null | undefined): StampSettings {
  const base = { ...DEFAULT_STAMP_SETTINGS, ...(raw ?? {}) };
  return {
    dateFormat: base.dateFormat || DEFAULT_STAMP_SETTINGS.dateFormat,
    showLocation: Boolean(base.showLocation),
    position: base.position || DEFAULT_STAMP_SETTINGS.position,
    fontSize: clamp(Number(base.fontSize) || DEFAULT_STAMP_SETTINGS.fontSize, 12, 36),
    opacity: clamp(Number(base.opacity) || DEFAULT_STAMP_SETTINGS.opacity, 0.35, 1),
    textColor: base.textColor || DEFAULT_STAMP_SETTINGS.textColor,
    customText: String(base.customText ?? '').slice(0, 80),
    autoLines: {
      workOrder: base.autoLines?.workOrder !== false,
      unit: base.autoLines?.unit !== false,
      project: base.autoLines?.project !== false,
      technician: base.autoLines?.technician !== false,
    },
  };
}

export function loadStampSettings(): StampSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_STAMP_SETTINGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STAMP_SETTINGS };
    return normalizeStampSettings(JSON.parse(raw) as Partial<StampSettings>);
  } catch {
    return { ...DEFAULT_STAMP_SETTINGS };
  }
}

export function saveStampSettings(settings: StampSettings): StampSettings {
  const next = normalizeStampSettings(settings);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}
