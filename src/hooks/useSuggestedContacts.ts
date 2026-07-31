/**
 * CRM Contacts auto-wiring — scans correspondence, meetings, proposals,
 * contracts, purchase orders, clients, and properties for free-text party
 * names/emails and proposes deduplicated `crm_contacts` candidates for review.
 * See src/lib/crm/extractContacts.ts for the matching/dedup logic.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildCandidates, excludeExisting, type RawPartyMention, type ContactCandidate } from '@/lib/crm/extractContacts';
import type { MeetingAttendee } from '@/hooks/useProjectMeetings';

const LIMIT = 300;

// Each source is independent — a failure/missing-table in one must not blank
// out the others, so every query is caught individually.
async function safeMentions(fn: () => Promise<RawPartyMention[]>): Promise<RawPartyMention[]> {
  try {
    return await fn();
  } catch (err) {
    console.error('useSuggestedContacts: source failed', err);
    return [];
  }
}

async function fromCorrespondence(): Promise<RawPartyMention[]> {
  const { data, error } = await (supabase.from('project_emails' as any) as any)
    .select('from_name, from_email')
    .not('from_name', 'is', null)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ name: r.from_name, email: r.from_email, source: 'Correspondence' }));
}

async function fromMeetings(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase.from('project_meetings').select('attendees').limit(200);
  if (error) throw error;
  const mentions: RawPartyMention[] = [];
  for (const row of data ?? []) {
    const attendees = (row.attendees as unknown as MeetingAttendee[] | null) ?? [];
    for (const a of attendees) {
      if (a?.name) mentions.push({ name: a.name, company: a.company ?? null, source: 'Meeting attendee' });
    }
  }
  return mentions;
}

async function fromProposals(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase
    .from('project_proposals')
    .select('recipient_name, recipient_email, recipient_company')
    .not('recipient_name', 'is', null)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    name: r.recipient_name, email: r.recipient_email, company: r.recipient_company, source: 'Proposal',
  }));
}

async function fromPunchTransmittals(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase
    .from('punch_transmittals')
    .select('recipient_name, recipient_email')
    .not('recipient_name', 'is', null)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.recipient_name, email: r.recipient_email, source: 'Punch transmittal' }));
}

async function fromPrimeContracts(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase
    .from('prime_contracts')
    .select('architect_name, contractor_name, contractor_email, owner_name, owner_email')
    .limit(200);
  if (error) throw error;
  const mentions: RawPartyMention[] = [];
  for (const r of data ?? []) {
    if (r.architect_name) mentions.push({ name: r.architect_name, source: 'Prime contract (architect)' });
    if (r.contractor_name) mentions.push({ name: r.contractor_name, email: r.contractor_email, contactType: 'contractor', source: 'Prime contract (contractor)' });
    if (r.owner_name) mentions.push({ name: r.owner_name, email: r.owner_email, contactType: 'owner', source: 'Prime contract (owner)' });
  }
  return mentions;
}

async function fromPurchaseOrders(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase.from('project_purchase_orders').select('vendor_name').limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.vendor_name, contactType: 'vendor' as const, source: 'Purchase order' }));
}

async function fromClients(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('contact_name, contact_email, contact_phone')
    .not('contact_name', 'is', null)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.contact_name, email: r.contact_email, phone: r.contact_phone, source: 'Client' }));
}

async function fromProperties(): Promise<RawPartyMention[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('contact_name, contact_email, contact_phone')
    .not('contact_name', 'is', null)
    .limit(LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => ({ name: r.contact_name, email: r.contact_email, phone: r.contact_phone, source: 'Property' }));
}

async function fetchExistingContacts() {
  const { data, error } = await supabase.from('crm_contacts').select('email, first_name, last_name').eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

export function useSuggestedContacts(enabled: boolean) {
  return useQuery<ContactCandidate[]>({
    queryKey: ['suggested-contacts'],
    enabled,
    queryFn: async () => {
      const [mentionGroups, existing] = await Promise.all([
        Promise.all([
          safeMentions(fromCorrespondence),
          safeMentions(fromMeetings),
          safeMentions(fromProposals),
          safeMentions(fromPunchTransmittals),
          safeMentions(fromPrimeContracts),
          safeMentions(fromPurchaseOrders),
          safeMentions(fromClients),
          safeMentions(fromProperties),
        ]),
        fetchExistingContacts(),
      ]);

      const candidates = buildCandidates(mentionGroups.flat());
      return excludeExisting(candidates, existing);
    },
    staleTime: 60_000,
  });
}
