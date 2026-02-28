import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedReport {
  id: string;
  workspace_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  report_type: string;
  config: {
    dateRangePreset?: string;
    propertyIds?: string[];
    projectIds?: string[];
    contractorIds?: string[];
    columns?: string[];
    groupBy?: string;
    sortBy?: string;
  };
  is_template: boolean;
  created_at: string;
}

export interface ReportSchedule {
  id: string;
  saved_report_id: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  recipient_emails: string[];
  subject_template: string | null;
  last_sent_at: string | null;
  next_send_at: string | null;
  is_active: boolean;
}

export function useSavedReports() {
  return useQuery({
    queryKey: ['saved-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedReport[];
    },
  });
}

export function useReportSchedules(savedReportId?: string) {
  return useQuery({
    queryKey: ['report-schedules', savedReportId],
    queryFn: async () => {
      let q = supabase.from('report_schedules').select('*');
      if (savedReportId) q = q.eq('saved_report_id', savedReportId);
      const { data, error } = await q.order('created_at');
      if (error) throw error;
      return (data ?? []) as ReportSchedule[];
    },
  });
}

export function useDeliveryLog() {
  return useQuery({
    queryKey: ['report-delivery-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_delivery_log')
        .select('*, saved_report:saved_reports(name)')
        .order('sent_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: Omit<SavedReport, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('saved_reports').insert(report as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-reports'] });
      toast.success('Report saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_reports').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-reports'] });
      toast.success('Report deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateReportSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: Omit<ReportSchedule, 'id' | 'last_sent_at' | 'next_send_at'> & { workspace_id: string }) => {
      const { error } = await supabase.from('report_schedules').insert(schedule as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Schedule created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('report_schedules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
