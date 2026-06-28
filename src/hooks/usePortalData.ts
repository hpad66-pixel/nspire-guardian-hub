import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalActionItem {
  id: string;
  action_type: string;
  title: string;
  description: string | null;
  options: string[] | null;
  client_selection: string | null;
  client_response: string | null;
  amount: number | null;
  due_date: string | null;
  priority: string;
  status: string;
  linked_change_order_id: string | null;
}

export interface PortalChangeOrder {
  id: string;
  co_no: number | null;
  title: string;
  description: string | null;
  amount: number | null;
  days_impact: number | null;
  status: string;
  sign_token: string | null;
  approved: boolean;
  sent_at: string | null;
}

export interface PortalQuestion {
  id: string;
  subject: string;
  message: string;
  request_type: string;
  status: string;
  response: string | null;
  created_at: string;
  responded_at: string | null;
}

export interface PortalData {
  phases: string[];
  portal: { name: string; accent: string; welcome: string | null };
  project: { name: string; phase: string; start_date: string | null; target_end_date: string | null; actual_end_date: string | null } | null;
  milestones: { title: string; date: string | null; status: string | null }[];
  latest_update: { title: string; period: string | null; health: string; summary: string | null; accomplishments: string[]; next_steps: string[] } | null;
  punch: { open: number; closed: number };
  photos: { url: string; caption: string | null; taken_at: string | null }[];
  action_items: PortalActionItem[];
  change_orders: PortalChangeOrder[];
  questions: PortalQuestion[];
  schedule: { pending_exposure: number; pending_days: number; approved_impact_days: number };
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

type PortalActionInput =
  | { action: 'ask_question'; subject?: string; message: string; name?: string; email?: string }
  | { action: 'respond_action_item'; item_id: string; response?: string; selection?: string }
  | { action: 'mark_viewed'; item_id: string };

// Client write-path (ask a question, respond to an action item). Invalidates the
// cached portal-data on success so the UI reflects the change.
export function usePortalAction(slug?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PortalActionInput) => {
      const { data, error } = await supabase.functions.invoke('portal-action', { body: { slug, ...input } });
      if (error || !data?.ok) throw new Error(data?.error || 'Action failed');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-data', slug] }),
  });
}
