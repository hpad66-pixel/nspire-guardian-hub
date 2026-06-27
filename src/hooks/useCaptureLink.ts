import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaptureLink {
  id: string;
  token: string;
  property_id: string | null;
  project_id: string | null;
  is_active: boolean;
  created_at: string;
}

type Ctx = { propertyId?: string; projectId?: string };

/** One active public capture link per context (property/project). */
export function useCaptureLink(ctx: Ctx) {
  const qc = useQueryClient();
  const enabled = !!(ctx.propertyId || ctx.projectId);
  const key = ['gallery-capture-link', ctx.propertyId ?? ctx.projectId ?? 'none'];

  const query = useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<CaptureLink | null> => {
      const db = supabase as any;
      let q = db.from('gallery_upload_links').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
      q = ctx.propertyId ? q.eq('property_id', ctx.propertyId) : q.eq('project_id', ctx.projectId);
      const { data } = await q;
      return data?.[0] ?? null;
    },
  });

  const create = useMutation({
    mutationFn: async (): Promise<CaptureLink> => {
      const { data: { user } } = await supabase.auth.getUser();
      const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
      const { data, error } = await (supabase as any).from('gallery_upload_links').insert({
        token,
        property_id: ctx.propertyId ?? null,
        project_id: ctx.projectId ?? null,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data as CaptureLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('gallery_upload_links').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { link: query.data ?? null, isLoading: query.isLoading, create, revoke };
}
