import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];
type DailyReportInsert = Database['public']['Tables']['daily_reports']['Insert'];

export interface DailyReport extends DailyReportRow {
  project?: {
    name: string;
    property?: {
      name: string;
    };
  };
}

export function useDailyReports() {
  return useQuery({
    queryKey: ['daily-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .order('report_date', { ascending: false });
      
      if (error) throw error;
      return data as DailyReport[];
    },
  });
}

export function useDailyReportsByProject(projectId: string | null) {
  return useQuery({
    queryKey: ['daily-reports', 'project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false });
      
      if (error) throw error;
      return data as DailyReportRow[];
    },
    enabled: !!projectId,
  });
}

export function useRecentDailyReports(limit: number = 10) {
  return useQuery({
    queryKey: ['daily-reports', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(name, property:properties(name))
        `)
        .order('report_date', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as DailyReport[];
    },
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (report: Omit<DailyReportInsert, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const submittedByName = (user?.user_metadata as any)?.full_name || user?.email || null;

      const { data, error } = await supabase
        .from('daily_reports')
        .insert({ ...report, submitted_by: user?.id, submitted_by_name: submittedByName } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success('Daily report submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit daily report: ${error.message}`);
    },
  });
}

/** Apply / clear the "Reviewed" seal on a submitted daily report (admin sign-off). */
export function useReviewDailyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reviewed }: { id: string; reviewed: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const name = (user?.user_metadata as any)?.full_name || user?.email || 'Reviewer';
      const patch = reviewed
        ? { reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null, reviewed_by_name: name }
        : { reviewed_at: null, reviewed_by: null, reviewed_by_name: null };
      const { error } = await supabase.from('daily_reports').update(patch as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success(v.reviewed ? 'Report marked as reviewed ✓' : 'Review cleared');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDailyReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyReportRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success('Daily report updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update daily report: ${error.message}`);
    },
  });
}
