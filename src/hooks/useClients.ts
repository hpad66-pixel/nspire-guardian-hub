import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ClientType = 'internal_org' | 'business_client' | 'property_management' | 'government' | 'other';

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  industry: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined (optional, computed on query)
  member_count?: number;
  project_count?: number;
}

type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at' | 'member_count' | 'project_count'>;

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useActiveClients() {
  return useQuery({
    queryKey: ['clients', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      if (!id) return null;
      // Get client + counts
      const [clientRes, membersRes, projectsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('client_id', id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('client_id', id),
      ]);
      if (clientRes.error) throw clientRes.error;
      return {
        ...clientRes.data,
        member_count: membersRes.count ?? 0,
        project_count: projectsRes.count ?? 0,
      } as Client;
    },
    enabled: !!id,
  });
}

export function useClientMembers(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-members', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('client_id', clientId);
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useClientsWithCounts() {
  return useQuery({
    queryKey: ['clients', 'with-counts'],
    queryFn: async () => {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;

      // Get member counts and project counts in parallel
      const enriched = await Promise.all(
        (clients as Client[]).map(async (client) => {
          const [membersRes, projectsRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('user_id', { count: 'exact', head: true })
              .eq('client_id', client.id),
            supabase
              .from('projects')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', client.id),
          ]);
          return {
            ...client,
            member_count: membersRes.count ?? 0,
            project_count: projectsRes.count ?? 0,
          } as Client;
        })
      );
      return enriched;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Organization created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create organization: ${error.message}`);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Organization updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data, error } = await supabase
        .from('clients')
        .update({ is_active: !archive })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (_, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(archive ? 'Organization archived' : 'Organization restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Organization deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete organization: ${error.message}`);
    },
  });
}

export function useAssignClientToProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, clientId }: { userId: string; clientId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ client_id: clientId })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['client-members'] });
      toast.success('Organization assignment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
}
