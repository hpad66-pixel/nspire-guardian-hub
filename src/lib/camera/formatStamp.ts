import type {
  GeoFix,
  StampContext,
  StampDateFormat,
  StampLineBundle,
  StampSettings,
} from './types';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a Date using one of the Field Camera stamp presets (to the second). */
export function formatStampWhen(date: Date, format: StampDateFormat): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const h24 = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? 'PM' : 'AM';

  switch (format) {
    case 'YYYY-MM-DD_HH_mm_ss':
      return `${y}-${pad2(m + 1)}-${pad2(d)} ${pad2(h24)}:${pad2(min)}:${pad2(sec)}`;
    case 'MM/DD/YYYY_h_mm_ss_A':
      return `${pad2(m + 1)}/${pad2(d)}/${y} · ${h12}:${pad2(min)}:${pad2(sec)} ${ampm}`;
    case 'DD/MM/YYYY_HH_mm_ss':
      return `${pad2(d)}/${pad2(m + 1)}/${y} ${pad2(h24)}:${pad2(min)}:${pad2(sec)}`;
    case 'MMM_D_YYYY_h_mm_ss_A':
      return `${MONTHS[m]} ${d}, ${y} · ${h12}:${pad2(min)}:${pad2(sec)} ${ampm}`;
    case 'ddd_MMM_D_YYYY_h_mm_ss_A':
    default:
      return `${WEEKDAYS[date.getDay()]} ${MONTHS[m]} ${d}, ${y} · ${h12}:${pad2(min)}:${pad2(sec)} ${ampm}`;
  }
}

export function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${ns}, ${Math.abs(lng).toFixed(5)}° ${ew}`;
}

export function buildLocationLine(
  geo: GeoFix | null | undefined,
  addressHint?: string | null,
): string | null {
  const hint = addressHint?.trim();
  if (hint) return hint;
  if (geo?.address?.trim()) return geo.address.trim();
  if (geo && Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
    return formatCoords(geo.lat, geo.lng);
  }
  return null;
}

export function buildContextLines(
  settings: StampSettings,
  context?: StampContext | null,
): string[] {
  const lines: string[] = [];
  const auto = settings.autoLines;
  if (auto.workOrder && context?.workOrderLabel?.trim()) {
    lines.push(context.workOrderLabel.trim());
  }
  if (auto.unit && context?.unitLabel?.trim()) {
    lines.push(context.unitLabel.trim());
  }
  if (auto.project) {
    const proj = context?.projectLabel?.trim() || context?.propertyLabel?.trim();
    if (proj) lines.push(proj);
  }
  if (auto.technician && context?.technicianName?.trim()) {
    lines.push(context.technicianName.trim());
  }
  return lines;
}

/** Build the stamp line bundle for overlay + burn-in. */
export function buildStampLines(
  settings: StampSettings,
  opts: {
    now?: Date;
    geo?: GeoFix | null;
    context?: StampContext | null;
  } = {},
): StampLineBundle {
  const now = opts.now ?? new Date();
  const when = formatStampWhen(now, settings.dateFormat);
  const locationLine = settings.showLocation
    ? buildLocationLine(opts.geo, opts.context?.addressHint)
    : null;
  const contextLines = buildContextLines(settings, opts.context);
  const custom = settings.customText.trim() || null;
  return { when, locationLine, contextLines, customText: custom };
}

/** Flatten stamp lines for a single multi-line overlay string list. */
export function flattenStampLines(bundle: StampLineBundle): string[] {
  const out: string[] = [bundle.when];
  if (bundle.locationLine) out.push(bundle.locationLine);
  out.push(...bundle.contextLines);
  if (bundle.customText) out.push(bundle.customText);
  return out;
}
