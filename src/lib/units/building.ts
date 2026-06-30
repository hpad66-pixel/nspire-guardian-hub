// Derive a "building" grouping + a stable color for a unit, so each building gets
// its own colored icon on the unit tiles. No schema needed — derived from the unit
// number (e.g. "A-3" → building A, "1203" → building 12, "201" → building 2).

export function buildingKey(unitNumber: string | null | undefined): string {
  const s = (unitNumber ?? '').trim();
  if (!s) return '?';
  // Prefix before a separator: "A-3", "B 12", "2_201", "C/4"
  const sep = s.match(/^([A-Za-z0-9]+?)[\s\-_/.]/);
  if (sep) return sep[1].toUpperCase();
  // Leading letters: "A12" → A
  const letters = s.match(/^([A-Za-z]+)/);
  if (letters) return letters[1].toUpperCase();
  // All-numeric: last two digits are the unit on the floor; the rest is the building.
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 3) return String(Number(digits.slice(0, digits.length - 2)));
  return digits || s.toUpperCase();
}

const PALETTE = [
  { bg: '#1D6FE8', fg: '#ffffff' }, // sapphire
  { bg: '#10B981', fg: '#ffffff' }, // emerald
  { bg: '#F59E0B', fg: '#1A1714' }, // amber
  { bg: '#8B5CF6', fg: '#ffffff' }, // violet
  { bg: '#EC4899', fg: '#ffffff' }, // pink
  { bg: '#14B8A6', fg: '#ffffff' }, // teal
  { bg: '#EF4444', fg: '#ffffff' }, // red
  { bg: '#6366F1', fg: '#ffffff' }, // indigo
  { bg: '#0EA5E9', fg: '#ffffff' }, // sky
  { bg: '#84CC16', fg: '#1A1714' }, // lime
  { bg: '#F97316', fg: '#ffffff' }, // orange
  { bg: '#06B6D4', fg: '#ffffff' }, // cyan
];

export function buildingColor(key: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
