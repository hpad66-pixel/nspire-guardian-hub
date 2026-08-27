import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DirectoryEntry } from '@/hooks/useProjectDirectory';

export interface ProjectContactPerson {
  entryId: string;
  contactId: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  jobTitle: string | null;
  roleLabel: string | null;
  isKeyContact: boolean;
  hasPortalAccess: false;
}

export function useProjectContacts(projectId: string | null) {
  return useQuery<ProjectContactPerson[]>({
    queryKey: ['project-contacts', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data: entries, error: entryError } = await supabase
        .from('project_directory_entries' as any)
        .select('*')
        .eq('project_id', projectId!)
        .not('contact_id', 'is', null)
        .order('is_key_contact', { ascending: false });
      if (entryError) throw entryError;
      const typedEntries = (entries ?? []) as unknown as DirectoryEntry[];
      const contactIds = typedEntries.map((entry) => entry.contact_id).filter(Boolean) as string[];
      if (!contactIds.length) return [];

      const { data: contacts, error: contactError } = await supabase
        .from('crm_contacts')
        .select('id,first_name,last_name,email,phone,mobile,company_name,job_title')
        .in('id', contactIds);
      if (contactError) throw contactError;
      const contactMap = new Map((contacts ?? []).map((contact) => [contact.id, contact]));

      return typedEntries.flatMap((entry) => {
        const contact = contactMap.get(entry.contact_id!);
        if (!contact) return [];
        return [{
          entryId: entry.id,
          contactId: contact.id,
          name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Unnamed contact',
          email: contact.email,
          phone: contact.mobile || contact.phone,
          companyName: contact.company_name,
          jobTitle: contact.job_title,
          roleLabel: entry.role_label,
          isKeyContact: entry.is_key_contact,
          hasPortalAccess: false as const,
        }];
      });
    },
  });
}
