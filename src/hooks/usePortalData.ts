import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalData {
  phases: string[];
  project: { name: string; phase: string; start_date: string | null; target_end_date: string | null } | null;
  milestones: { title: string; date: string | null; status: string | null }[];
  latest_update: { title: string; period: string | null; health: string; summary: string | null } | null;
  punch: { open: number; closed: number };
  photos: { url: string; caption: string | null; taken_at: string | null }[];
}

export const PHASE_LABEL: Record<string, string> = {
  planning: 'Planning', preconstruction: 'Pre-Con', construction: 'Construction',
  punch_list: 'Punch List', closeout: 'Closeout',
};

// Client-safe project data for the magic-link portal, served by the slug-scoped
// `portal-data` edge function (service role). Shared across the home overview and
// the layout header so they hit one cached query.
export function usePortalData(slug?: string) {
  return useQuery({
    queryKey: ['portal-data', slug],
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<PortalData> => {
      const { data, error } = await supabase.functions.invoke('portal-data', { body: { slug } });
      if (error || !data?.ok) throw new Error(data?.error || 'Could not load project');
      return data as PortalData;
    },
  });
}
