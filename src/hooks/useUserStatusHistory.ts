import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface UserStatusHistoryEntry {
  id: string;
  user_id: string;
  property_id: string | null;
  previous_status: string | null;
  new_status: string;
  previous_role: AppRole | null;
  new_role: AppRole | null;
  reason: string | null;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  // Joined data
  changed_by_profile?: {
    full_name: string | null;
    email: string | null;
  };
  property?: {
    name: string;
  };
}

// Fetch status history for a specific user
export function useUserStatusHistory(userId: string | null) {
  return useQuery({
    queryKey: ['user-status-history', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_status_history')
        .select(`
          *,
          property:properties(name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch changed_by profile names
      const changedByIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
      
      let profiles: any[] = [];
      if (changedByIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', changedByIds);
        profiles = profileData || [];
      }

      return (data || []).map(entry => ({
        ...entry,
        changed_by_profile: profiles.find(p => p.user_id === entry.changed_by),
      })) as UserStatusHistoryEntry[];
    },
    enabled: !!userId,
  });
}

// Fetch all recent status changes (for audit log view)
export function useRecentStatusChanges(limit = 50) {
  return useQuery({
    queryKey: ['recent-status-changes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_status_history')
        .select(`
          *,
          property:properties(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user profiles for all entries
      const userIds = [...new Set((data || []).map(h => h.user_id))];
      const changedByIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
      const allUserIds = [...new Set([...userIds, ...changedByIds])];

      let profiles: any[] = [];
      if (allUserIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', allUserIds);
        profiles = profileData || [];
      }

      return (data || []).map(entry => ({
        ...entry,
        user_profile: profiles.find(p => p.user_id === entry.user_id),
        changed_by_profile: profiles.find(p => p.user_id === entry.changed_by),
      }));
    },
  });
}

// Format status change for display
export function formatStatusChange(entry: UserStatusHistoryEntry): string {
  const parts: string[] = [];

  if (entry.previous_status && entry.new_status && entry.previous_status !== entry.new_status) {
    parts.push(`Status changed from "${entry.previous_status}" to "${entry.new_status}"`);
  }

  if (entry.previous_role && entry.new_role && entry.previous_role !== entry.new_role) {
    parts.push(`Role changed from "${entry.previous_role}" to "${entry.new_role}"`);
  }

  if (entry.reason) {
    parts.push(`Reason: ${entry.reason}`);
  }

  if (entry.property?.name) {
    parts.push(`at ${entry.property.name}`);
  }

  return parts.join('. ') || 'Status updated';
}
