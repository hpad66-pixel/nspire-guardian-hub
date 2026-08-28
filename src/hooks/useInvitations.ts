import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  property_id: string | null;
  client_id: string | null;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  full_name: string | null;
  last_sent_at: string | null;
  revoked_at: string | null;
  updated_at: string;
  workspace_id: string | null;
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
  });
}

export function useInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { p_token: token });

      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Invitation | null;
    },
    enabled: !!token,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitation: {
      email: string;
      role: AppRole;
      full_name?: string;
      property_id?: string;
      client_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_workspace_invitation', {
        p_email: invitation.email,
        p_role: invitation.role,
        p_full_name: invitation.full_name || undefined,
        p_property_id: invitation.property_id || undefined,
        p_client_id: invitation.client_id || undefined,
      });

      if (error) throw error;
      return data as Invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { invitationId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invitation email sent!');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error) => {
      toast.error('Failed to send invitation: ' + error.message);
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('revoke_workspace_invitation', {
        p_invitation_id: id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation revoked');
    },
  });
}
