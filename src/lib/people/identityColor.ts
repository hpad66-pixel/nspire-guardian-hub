export interface IdentityColor {
  accent: string;
  soft: string;
  border: string;
  glow: string;
}

const IDENTITY_COLORS: IdentityColor[] = [
  { accent: '#6D28D9', soft: '#F3E8FF', border: '#C4B5FD', glow: 'rgba(109, 40, 217, 0.24)' },
  { accent: '#0369A1', soft: '#E0F2FE', border: '#7DD3FC', glow: 'rgba(3, 105, 161, 0.24)' },
  { accent: '#047857', soft: '#D1FAE5', border: '#6EE7B7', glow: 'rgba(4, 120, 87, 0.24)' },
  { accent: '#BE185D', soft: '#FCE7F3', border: '#F9A8D4', glow: 'rgba(190, 24, 93, 0.24)' },
  { accent: '#B45309', soft: '#FEF3C7', border: '#FCD34D', glow: 'rgba(180, 83, 9, 0.24)' },
  { accent: '#1D4ED8', soft: '#DBEAFE', border: '#93C5FD', glow: 'rgba(29, 78, 216, 0.24)' },
];

const UNASSIGNED_COLOR: IdentityColor = {
  accent: '#64748B',
  soft: '#F1F5F9',
  border: '#CBD5E1',
  glow: 'rgba(100, 116, 139, 0.16)',
};

export function identityColor(value?: string | null): IdentityColor {
  const normalized = value?.trim().toLocaleLowerCase();
  if (!normalized || normalized === 'unassigned') return UNASSIGNED_COLOR;

  let hash = 2166136261;
  for (const character of normalized) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return IDENTITY_COLORS[(hash >>> 0) % IDENTITY_COLORS.length];
}
