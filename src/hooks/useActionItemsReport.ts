import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActionItem, ActionItemProfile } from './useActionItems';

export interface ActionItemReportFilters {
  userId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: string | null;
  priority?: string | null;
  projectId?: string | null;
}

export function useActionItemsReport(filters: ActionItemReportFilters, enabled = true) {
  return useQuery({
    queryKey: ['action-items-report', filters],
    queryFn: async () => {
      let query = supabase
        .from('project_action_items')
        .select('*, project:projects(id, name)')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filters.userId) {
        query = query.eq('assigned_to', filters.userId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      const items = data || [];

      // Resolve profiles
      const userIds = [...new Set([
        ...items.map(i => i.assigned_to).filter(Boolean),
        ...items.map(i => i.created_by).filter(Boolean),
      ])] as string[];

      const profileMap: Record<string, ActionItemProfile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);
        (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
      }

      return items.map(item => ({
        ...item,
        tags: item.tags || [],
        status: item.status as ActionItem['status'],
        priority: item.priority as ActionItem['priority'],
        assignee: item.assigned_to ? profileMap[item.assigned_to] ?? null : null,
        creator: item.created_by ? profileMap[item.created_by] ?? null : null,
        project: Array.isArray(item.project) ? item.project[0] ?? null : item.project ?? null,
      })) as ActionItem[];
    },
    enabled,
  });
}
