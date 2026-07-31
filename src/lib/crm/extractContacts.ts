/**
 * CRM Contacts auto-wiring — pure matching/dedup logic.
 * `useSuggestedContacts` collects raw mentions from correspondence, meetings,
 * proposals, contracts, purchase orders, clients, and properties; this module
 * turns them into deduplicated, reviewable candidates.
 */
import type { ContactType } from '@/hooks/useCRMContacts';

export interface RawPartyMention {
  name: string | null;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  contactType?: ContactType;
  /** Human-readable provenance shown in the review UI, e.g. "Correspondence". */
  source: string;
}

export interface ContactCandidate {
  key: string;
  first_name: string;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  contact_type: ContactType;
  sources: string[];
  mentionCount: number;
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

// Automated/system senders that show up as a correspondence "from name" but
// are never a real business contact worth importing. Substring match (not
// \b-bounded) so plurals like "Notifications" still match "notification".
const AUTOMATED_SENDER = /no.?reply|notification|mailer.?daemon|do.?not.?reply|automated|system/i;

export function splitName(fullName: string): { first: string; last: string | null } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');
  if (parts.length <= 1) return { first: trimmed, last: null };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function candidateKey(first: string, last: string | null, email: string | null, company: string | null): string {
  const e = norm(email);
  if (e) return `email:${e}`;
  return `name:${norm(first)}|${norm(last)}|${norm(company)}`;
}

/** Merge raw mentions into deduplicated candidates, keyed primarily by email. */
export function buildCandidates(mentions: RawPartyMention[]): ContactCandidate[] {
  const byKey = new Map<string, ContactCandidate>();

  for (const m of mentions) {
    const name = m.name?.trim();
    if (!name) continue;
    if (AUTOMATED_SENDER.test(name)) continue;

    const { first, last } = splitName(name);
    if (!first || first.length < 2) continue;

    const email = m.email?.trim().toLowerCase() || null;
    const company = m.company?.trim() || null;
    const key = candidateKey(first, last, email, company);

    const existing = byKey.get(key);
    if (existing) {
      existing.mentionCount += 1;
      if (!existing.email && email) existing.email = email;
      if (!existing.company_name && company) existing.company_name = company;
      if (!existing.phone && m.phone) existing.phone = m.phone.trim();
      if (!existing.sources.includes(m.source)) existing.sources.push(m.source);
    } else {
      byKey.set(key, {
        key,
        first_name: first,
        last_name: last,
        company_name: company,
        email,
        phone: m.phone?.trim() || null,
        contact_type: m.contactType ?? 'other',
        sources: [m.source],
        mentionCount: 1,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.mentionCount - a.mentionCount);
}

/** Drop candidates that already match an existing CRM contact by email or by name. */
export function excludeExisting(
  candidates: ContactCandidate[],
  existing: { email: string | null; first_name: string; last_name: string | null }[],
): ContactCandidate[] {
  const existingEmails = new Set(existing.map((c) => norm(c.email)).filter(Boolean));
  const existingNames = new Set(existing.map((c) => `${norm(c.first_name)}|${norm(c.last_name)}`));
  return candidates.filter((c) => {
    if (c.email && existingEmails.has(norm(c.email))) return false;
    if (existingNames.has(`${norm(c.first_name)}|${norm(c.last_name)}`)) return false;
    return true;
  });
}
