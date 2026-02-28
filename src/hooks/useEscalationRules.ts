import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EscalationRule {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_entity: string;
  trigger_condition: Record<string, any>;
  delay_hours: number;
  notify_roles: string[];
  notify_user_ids: string[];
  notification_channel: string[];
  message_template: string | null;
  resolution_condition: Record<string, any> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationLogEntry {
  id: string;
  workspace_id: string;
  rule_id: string | null;
  rule_name: string | null;
  entity_type: string;
  entity_id: string;
  entity_title: string | null;
  notified_user_ids: string[];
  notification_channels: string[];
  fired_at: string;
  resolved_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export function useEscalationRules() {
  return useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EscalationRule[];
    },
  });
}

export function useEscalationLog(filters?: { entityType?: string; dateFrom?: string }) {
  return useQuery({
    queryKey: ['escalation-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('escalation_log')
        .select('*')
        .order('fired_at', { ascending: false })
        .limit(100);
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.dateFrom) {
        query = query.gte('fired_at', filters.dateFrom);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EscalationLogEntry[];
    },
  });
}

export function useCreateEscalationRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rule: Partial<EscalationRule>) => {
      const wsRes = await supabase.rpc('get_my_workspace_id');
      const { data, error } = await supabase
        .from('escalation_rules')
        .insert({
          ...rule,
          workspace_id: wsRes.data,
          created_by: user?.id,
          trigger_condition: rule.trigger_condition || {},
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast.success('Escalation rule created');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEscalationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EscalationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast.success('Rule updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEscalationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('escalation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast.success('Rule deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
