/**
 * Review comments / action items on a daily field report. An admin adds items and
 * sends them back; field staff acknowledge each one (the tickler loop).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActionItem {
  id: string;
  daily_report_id: string;
  body: string;
  created_by_name: string | null;
  status: 'open' | 'acknowledged';
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  created_at: string;
}

async function currentName(fallback: string) {
  const { data: { user } } = await supabase.auth.getUser();
  return { id: user?.id, name: (user?.user_metadata as any)?.full_name || user?.email || fallback };
}

export function useDailyReportActionItems(reportId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dr-action-items', reportId] });
    qc.invalidateQueries({ queryKey: ['dr-action-item-counts'] });
  };

  const list = useQuery<ActionItem[]>({
    queryKey: ['dr-action-items', reportId],
    enabled: Boolean(reportId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_report_action_items' as any)
        .select('*').eq('daily_report_id', reportId!).order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as ActionItem[];
    },
  });

  const add = useMutation({
    mutationFn: async ({ projectId, body }: { projectId: string; body: string }) => {
      const { id, name } = await currentName('Reviewer');
      const { error } = await supabase.from('daily_report_action_items' as any).insert({
        daily_report_id: reportId, project_id: projectId, body: body.trim(), created_by: id, created_by_name: name,
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { id: uid, name } = await currentName('Staff');
      const { error } = await supabase.from('daily_report_action_items' as any).update({
        status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by: uid, acknowledged_by_name: name,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('daily_report_action_items' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Email the report's submitter a digest of the open action items.
  const notify = useMutation({
    mutationFn: async (note?: string) => {
      const { data, error } = await supabase.functions.invoke('daily-report-action-notify', {
        body: { reportId, note: note ?? null },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any).error ?? 'Could not notify');
      return data as { ok: boolean; sentTo: string; count: number };
    },
  });

  return { ...list, add, acknowledge, remove, notify };
}

/** Open-item counts across many reports, for list-row "tickler" badges. */
export function useOpenActionItemCounts(reportIds: string[]) {
  return useQuery<Record<string, number>>({
    queryKey: ['dr-action-item-counts', [...reportIds].sort()],
    enabled: reportIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_report_action_items' as any)
        .select('daily_report_id, status').in('daily_report_id', reportIds).eq('status', 'open');
      if (error) throw error;
      const m: Record<string, number> = {};
      for (const r of (data ?? []) as any[]) m[r.daily_report_id] = (m[r.daily_report_id] ?? 0) + 1;
      return m;
    },
  });
}
