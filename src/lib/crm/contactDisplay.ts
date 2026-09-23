import type { CRMContact } from '@/hooks/useCRMContacts';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
] as const;

export function contactDisplayName(
  contact: Pick<CRMContact, 'first_name' | 'last_name' | 'company_name' | 'email'>,
): string {
  const personName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
  return personName || contact.company_name?.trim() || contact.email?.trim() || 'Unnamed contact';
}

export function contactSortSeed(
  contact: Pick<CRMContact, 'first_name' | 'last_name' | 'company_name' | 'email'>,
): string {
  return contactDisplayName(contact).trim() || 'Unnamed contact';
}

export function contactGroupLetter(
  contact: Pick<CRMContact, 'first_name' | 'last_name' | 'company_name' | 'email'>,
): string {
  const first = contactSortSeed(contact).charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

export function contactInitials(
  contact: Pick<CRMContact, 'first_name' | 'last_name' | 'company_name' | 'email'>,
): string {
  const first = contact.first_name?.trim().charAt(0) ?? '';
  const last = contact.last_name?.trim().charAt(0) ?? '';
  const personInitials = `${first}${last}`.toUpperCase();
  if (personInitials) return personInitials;

  const words = contactDisplayName(contact).split(/\s+/).filter(Boolean);
  return words
    .map((word) => word.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export function contactAvatarColor(
  contact: Pick<CRMContact, 'first_name' | 'last_name' | 'company_name' | 'email'>,
): string {
  const seed = contactSortSeed(contact);
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_COLORS[Math.abs(code) % AVATAR_COLORS.length];
}
