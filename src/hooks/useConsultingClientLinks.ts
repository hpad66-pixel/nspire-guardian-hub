import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientLink {
  id: string;
  project_id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  show_financials: boolean;
  created_at: string;
  last_viewed_at: string | null;
}

const table = () => supabase.from('consulting_client_links' as never) as any;
const genToken = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`).replace(/-/g, '');

export function useConsultingClientLinks(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['consulting-client-links', projectId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as ClientLink[];
      const { data, error } = await table().select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientLink[];
    },
    enabled: !!projectId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: async (input: { label?: string; show_financials?: boolean }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await table().insert({
        project_id: projectId, token: genToken(),
        label: input.label ?? null, show_financials: input.show_financials ?? true,
        created_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      return data as ClientLink;
    },
    onSuccess: () => { invalidate(); toast.success('Client link created'); },
    onError: (e: Error) => toast.error(`Couldn't create link: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<ClientLink, 'is_active' | 'show_financials' | 'label'>>) => {
      const { error } = await table().update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't update link: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await table().delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { invalidate(); toast.success('Link revoked'); },
    onError: (e: Error) => toast.error(`Couldn't revoke: ${e.message}`),
  });

  return { ...list, create, update, remove };
}
