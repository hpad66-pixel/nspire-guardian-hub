import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ActivityLogFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useActivityLog(filters: ActivityLogFilters = {}) {
  const { entityType, action, userId, startDate, endDate, limit = 50 } = filters;
  
  return useQuery({
    queryKey: ['activity-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      
      if (action) {
        query = query.eq('action', action);
      }
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLogEntry[];
    },
  });
}

export function useActivityLogStats() {
  return useQuery({
    queryKey: ['activity-log', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('entity_type, action')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      
      const entityTypes: Record<string, number> = {};
      const actions: Record<string, number> = {};
      
      data.forEach((entry: { entity_type: string; action: string }) => {
        entityTypes[entry.entity_type] = (entityTypes[entry.entity_type] || 0) + 1;
        actions[entry.action] = (actions[entry.action] || 0) + 1;
      });
      
      return {
        entityTypes,
        actions,
        total: data.length,
      };
    },
  });
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  project: 'Project',
  issue: 'Issue',
  work_order: 'Work Order',
  defect: 'Defect',
  inspection: 'Inspection',
  property: 'Property',
  unit: 'Unit',
  change_order: 'Change Order',
  daily_report: 'Daily Report',
  milestone: 'Milestone',
  document: 'Document',
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  assign: 'Assigned',
  complete: 'Completed',
  verify: 'Verified',
  approve: 'Approved',
  reject: 'Rejected',
};
