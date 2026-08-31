/**
 * Glorieta Gardens — Site Asset Map layout.
 *
 * Source of truth: 3TCI sanitary sewer as-builts (Buildings 3, 5 & 6).
 * Manholes keep sheet IDs S-1…S-8. Cleanouts are labeled “3" CLEANOUT” on the
 * drawings without numbers — we assign CO-01… clockwise per building so they
 * are inspectable. Retention pond is included because the owner confirmed it
 * exists on site (not drawn on the sewer sheets). Catch basins / pump station
 * are intentionally omitted until stormwater drawings arrive.
 *
 * Coordinates are in SVG space (viewBox 0 0 1200 820) — a curated site plan,
 * not WGS84. Approximate lat/lng on seeded assets are for future GIS only.
 */

export type SiteAssetKind =
  | 'manhole'
  | 'cleanout'
  | 'retention_pond'
  | 'building';

export interface SiteBuilding {
  id: string;
  label: string;
  address?: string;
  /** Polygon points as "x,y x,y …" */
  points: string;
  labelAt: { x: number; y: number };
}

export interface SiteSewerLine {
  id: string;
  label: string;
  /** SVG path `d` */
  d: string;
}

export interface SiteMapAsset {
  /** Drawing / assigned number — matches assets.name when seeded */
  code: string;
  kind: Exclude<SiteAssetKind, 'building'>;
  label: string;
  building?: string;
  x: number;
  y: number;
  /** Extra detail from as-built (rim/invert, pipe size) */
  detail?: string;
  /** Approximate WGS84 for DB seed (Opa-Locka vicinity) */
  lat?: number;
  lng?: number;
}

export interface SiteMapLayout {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  viewBox: string;
  width: number;
  height: number;
  northAngleDeg: number;
  scaleNote: string;
  sourceNote: string;
  alexandriaY: number;
  buildings: SiteBuilding[];
  sewerLines: SiteSewerLine[];
  /** Organic pond path */
  pond: { d: string; labelAt: { x: number; y: number } };
  assets: SiteMapAsset[];
}

function ring(
  cx: number,
  cy: number,
  n: number,
  rx: number,
  ry: number,
  start = -Math.PI / 2,
): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => {
    const a = start + (2 * Math.PI * i) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

/** Approx. site center for seed lat/lng offsets (Opa-Locka / Glorieta). */
const SITE_LAT = 25.9058;
const SITE_LNG = -80.2504;

function approxLatLng(x: number, y: number): { lat: number; lng: number } {
  // ~80 m across the SVG → tiny offsets so pins cluster on the property
  const lat = SITE_LAT - (y - 410) * 0.000018;
  const lng = SITE_LNG + (x - 600) * 0.00002;
  return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) };
}

const b5Ring = ring(380, 340, 12, 95, 85, -0.55);
const b6Ring = ring(620, 380, 12, 110, 100, 0.15);

const cleanoutsB5: SiteMapAsset[] = b5Ring.map((p, i) => {
  const code = `CO-${String(i + 1).padStart(2, '0')}`;
  const { lat, lng } = approxLatLng(p.x, p.y);
  return {
    code,
    kind: 'cleanout' as const,
    label: `3" Cleanout ${code}`,
    building: 'Building 5',
    x: p.x,
    y: p.y,
    detail: '3" cleanout — sanitary lateral (as-built)',
    lat,
    lng,
  };
});

const cleanoutsB6: SiteMapAsset[] = b6Ring.map((p, i) => {
  const code = `CO-${String(i + 13).padStart(2, '0')}`;
  const { lat, lng } = approxLatLng(p.x, p.y);
  return {
    code,
    kind: 'cleanout' as const,
    label: `3" Cleanout ${code}`,
    building: 'Building 6',
    x: p.x,
    y: p.y,
    detail: '3" cleanout — sanitary lateral (as-built)',
    lat,
    lng,
  };
});

const manholes: SiteMapAsset[] = (
  [
    { code: 'S-1', x: 980, y: 195, building: 'Building 3', detail: 'New san. manhole S-1 · Line 1 · Rim ~5.08\'' },
    { code: 'S-2', x: 1040, y: 310, building: 'Building 3', detail: 'New san. manhole S-2 · Line 1 · Rim ~6.05\'' },
    { code: 'S-3', x: 880, y: 330, building: 'Building 3', detail: 'New san. manhole S-3 · Line 2 · Rim ~5.38\'' },
    { code: 'S-4', x: 820, y: 400, building: 'Building 3 / 7', detail: 'New san. manhole S-4 · Line 2 · Rim ~5.80\'' },
    { code: 'S-5', x: 220, y: 185, building: 'Alexandria / Line 3', detail: 'New san. manhole S-5 · Line 3' },
    { code: 'S-6', x: 520, y: 200, building: 'Building 5 north', detail: 'New san. manhole S-6 · Rim 6.21\' · Inv. 0.86\'' },
    { code: 'S-7', x: 300, y: 250, building: 'Building 5 / 6 west', detail: 'New san. manhole S-7 · Rim 5.80\'' },
    { code: 'S-8', x: 700, y: 270, building: 'Building 5 east', detail: 'New san. manhole S-8 · Rim 5.83\' · Inv. 2.26\'' },
  ] as const
).map((m) => {
  const { lat, lng } = approxLatLng(m.x, m.y);
  return {
    code: m.code,
    kind: 'manhole' as const,
    label: `Sanitary Manhole ${m.code}`,
    building: m.building,
    x: m.x,
    y: m.y,
    detail: m.detail,
    lat,
    lng,
  };
});

const pondPt = approxLatLng(980, 580);

export const GLORIETA_SITE_LAYOUT: SiteMapLayout = {
  id: 'glorieta-gardens',
  title: 'Glorieta Gardens',
  subtitle: 'Sanitary sewer as-built · Site asset map',
  address: '13004 Alexandria Dr, Opa-Locka, FL 33054',
  viewBox: '0 0 1200 820',
  width: 1200,
  height: 820,
  northAngleDeg: 0,
  scaleNote: 'Schematic site plan · not to civil scale',
  sourceNote:
    'Manholes & cleanouts from 3TCI sanitary as-builts (Bldg 3 / 5 & 6). Pond placed from site knowledge — refine when stormwater survey arrives.',
  alexandriaY: 110,
  buildings: [
    {
      id: 'b5',
      label: 'BUILDING 5',
      address: 'No. 13140 / 13144',
      points: '290,270 470,255 490,420 300,440',
      labelAt: { x: 380, y: 345 },
    },
    {
      id: 'b6',
      label: 'BUILDING 6',
      address: 'No. 13142',
      points: '510,290 740,275 760,490 520,510',
      labelAt: { x: 620, y: 390 },
    },
    {
      id: 'b3',
      label: 'BUILDING 3',
      address: 'No. 13132',
      points: '860,280 1060,265 1080,430 870,450',
      labelAt: { x: 960, y: 360 },
    },
    {
      id: 'b7n',
      label: 'BLDG 7 N',
      address: 'No. 13112',
      points: '400,560 580,545 595,640 415,655',
      labelAt: { x: 495, y: 600 },
    },
  ],
  sewerLines: [
    {
      id: 'line-3',
      label: 'Line 3',
      d: 'M 200 185 C 320 175, 420 190, 520 200 C 600 210, 660 240, 700 270',
    },
    {
      id: 'line-4',
      label: 'Line 4',
      d: 'M 300 250 C 400 230, 460 210, 520 200',
    },
    {
      id: 'line-5',
      label: 'Line 5',
      d: 'M 300 250 C 420 300, 560 290, 700 270',
    },
    {
      id: 'line-1',
      label: 'Line 1',
      d: 'M 980 195 C 1000 240, 1020 280, 1040 310',
    },
    {
      id: 'line-2',
      label: 'Line 2',
      d: 'M 880 330 C 850 360, 830 385, 820 400',
    },
    {
      id: 'trunk',
      label: 'Main',
      d: 'M 700 270 C 780 290, 840 300, 880 330 C 920 280, 950 230, 980 195',
    },
  ],
  pond: {
    d: 'M 860 520 C 900 480, 980 470, 1060 500 C 1140 540, 1160 620, 1100 680 C 1030 740, 920 730, 870 680 C 820 630, 820 560, 860 520 Z',
    labelAt: { x: 980, y: 590 },
  },
  assets: [
    ...manholes,
    ...cleanoutsB5,
    ...cleanoutsB6,
    {
      code: 'POND-1',
      kind: 'retention_pond',
      label: 'Retention Pond',
      building: 'Site',
      x: 980,
      y: 580,
      detail: 'Primary stormwater storage — location confirmed on site; survey pending',
      lat: pondPt.lat,
      lng: pondPt.lng,
    },
  ],
};

export const SITE_MAP_LAYERS = [
  { key: 'manhole', label: 'Manholes', color: '#1D6FE8', countKey: 'manhole' as const },
  { key: 'cleanout', label: 'Cleanouts', color: '#C4A35A', countKey: 'cleanout' as const },
  { key: 'retention_pond', label: 'Retention pond', color: '#0EA5E9', countKey: 'retention_pond' as const },
  { key: 'building', label: 'Buildings', color: '#64748B', countKey: 'building' as const },
  { key: 'sewer', label: 'Sewer mains', color: '#1D6FE8', countKey: 'sewer' as const },
] as const;

export type SiteMapLayerKey = (typeof SITE_MAP_LAYERS)[number]['key'];

export function countAssetsByKind(layout: SiteMapLayout = GLORIETA_SITE_LAYOUT) {
  return {
    manhole: layout.assets.filter((a) => a.kind === 'manhole').length,
    cleanout: layout.assets.filter((a) => a.kind === 'cleanout').length,
    retention_pond: layout.assets.filter((a) => a.kind === 'retention_pond').length,
    building: layout.buildings.length,
    total: layout.assets.length,
  };
}

/** Match a DB asset row to a layout pin by drawing code / name. */
export function matchLayoutAsset(
  layoutAsset: SiteMapAsset,
  dbAssets: Array<{ id: string; name: string; asset_type: string; status?: string }>,
) {
  const needle = layoutAsset.code.toLowerCase();
  return (
    dbAssets.find((a) => a.name.trim().toLowerCase() === needle)
    ?? dbAssets.find((a) => a.name.toLowerCase().includes(needle))
    ?? null
  );
}
