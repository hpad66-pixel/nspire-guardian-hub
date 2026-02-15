import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useProgressEntries(projectId: string | null) {
  return useQuery({
    queryKey: ['progress-entries', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_progress_entries')
        .select('*')
        .eq('project_id', projectId!)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { project_id: string; trade: string; percent_complete?: number; planned_value?: number; earned_value?: number; actual_cost?: number; notes?: string; entry_date?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from('project_progress_entries')
        .insert({ ...data, updated_by: user.user?.id })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['progress-entries', d.project_id] }); toast.success('Progress entry added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { data, error } = await supabase.from('project_progress_entries').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['progress-entries', d.project_id] }); toast.success('Progress updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProgressEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_progress_entries').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => { qc.invalidateQueries({ queryKey: ['progress-entries', projectId] }); toast.success('Entry deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEarnedValueMetrics(projectId: string | null) {
  return useQuery({
    queryKey: ['ev-metrics', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_progress_entries')
        .select('*')
        .eq('project_id', projectId!);
      if (error) throw error;
      const entries = data || [];
      // Aggregate latest entry per trade
      const tradeMap = new Map<string, typeof entries[0]>();
      for (const e of entries) {
        const existing = tradeMap.get(e.trade);
        if (!existing || e.entry_date > existing.entry_date) {
          tradeMap.set(e.trade, e);
        }
      }
      const latest = Array.from(tradeMap.values());
      const totalPV = latest.reduce((s, e) => s + (Number(e.planned_value) || 0), 0);
      const totalEV = latest.reduce((s, e) => s + (Number(e.earned_value) || 0), 0);
      const totalAC = latest.reduce((s, e) => s + (Number(e.actual_cost) || 0), 0);
      const cpi = totalAC > 0 ? totalEV / totalAC : 0;
      const spi = totalPV > 0 ? totalEV / totalPV : 0;
      const overallProgress = latest.length > 0 ? latest.reduce((s, e) => s + (Number(e.percent_complete) || 0), 0) / latest.length : 0;
      return { totalPV, totalEV, totalAC, cpi, spi, overallProgress, trades: latest };
    },
  });
}
