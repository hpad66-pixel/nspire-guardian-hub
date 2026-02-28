import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface ComplianceEvent {
  id: string;
  workspace_id: string | null;
  property_id: string | null;
  title: string;
  description: string | null;
  source_type: string;
  source_id: string | null;
  category: string;
  agency: string | null;
  due_date: string;
  reminder_days: number[] | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_by: string | null;
  notes: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  // joined
  property?: { id: string; name: string } | null;
  assigned_profile?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

const QUERY_KEY = 'compliance-events';

export function useComplianceEvents(filters?: {
  propertyId?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('compliance_events')
        .select('*, property:properties!compliance_events_property_id_fkey(id, name), assigned_profile:profiles!compliance_events_assigned_to_fkey(user_id, full_name, avatar_url)')
        .order('due_date', { ascending: true });

      if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.priority) query = query.eq('priority', filters.priority);
      if (filters?.dateFrom) query = query.gte('due_date', filters.dateFrom);
      if (filters?.dateTo) query = query.lte('due_date', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ComplianceEvent[];
    },
  });
}

export function useComplianceEventStats() {
  const { data: events = [] } = useComplianceEvents();
  const now = new Date();

  const overdue = events.filter(e => e.status !== 'completed' && e.status !== 'waived' && new Date(e.due_date) < now).length;
  const due7Days = events.filter(e => {
    if (e.status === 'completed' || e.status === 'waived') return false;
    const d = new Date(e.due_date);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const due30Days = events.filter(e => {
    if (e.status === 'completed' || e.status === 'waived') return false;
    const d = new Date(e.due_date);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7 && diff <= 30;
  }).length;
  const due90Days = events.filter(e => {
    if (e.status === 'completed' || e.status === 'waived') return false;
    const d = new Date(e.due_date);
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 30 && diff <= 90;
  }).length;

  return { overdue, due7Days, due30Days, due90Days, total: events.length };
}

export function useCreateComplianceEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (event: Partial<ComplianceEvent>) => {
      const { data, error } = await supabase
        .from('compliance_events')
        .insert({
          ...event,
          workspace_id: workspaceId,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Compliance event created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateComplianceEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ComplianceEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('compliance_events')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Event updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteComplianceEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('compliance_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Event deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Sync compliance events from existing platform data (permits, credentials, equipment docs).
 * Runs on page mount.
 */
export function useSyncComplianceEvents() {
  const { workspaceId } = useWorkspaceContext();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['compliance-sync', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Sync permits with expiry dates
      const { data: permits } = await supabase
        .from('permits')
        .select('id, name, expiry_date, property_id')
        .not('expiry_date', 'is', null);

      if (permits?.length) {
        for (const p of permits) {
          await supabase
            .from('compliance_events')
            .upsert(
              {
                workspace_id: workspaceId,
                property_id: p.property_id,
                title: `${p.name} — Permit Renewal`,
                source_type: 'permit',
                source_id: p.id,
                category: 'permit_renewal',
                due_date: p.expiry_date!,
                status: new Date(p.expiry_date!) < new Date() ? 'overdue' : 'upcoming',
                priority: 'high',
              } as any,
              { onConflict: 'source_type,source_id', ignoreDuplicates: false }
            );
        }
      }

      // Sync credentials with expiry dates
      const { data: creds } = await supabase
        .from('credentials')
        .select('id, credential_type, custom_type_label, expiry_date, holder_id, workspace_id')
        .not('expiry_date', 'is', null)
        .eq('workspace_id', workspaceId);

      if (creds?.length) {
        for (const c of creds) {
          await supabase
            .from('compliance_events')
            .upsert(
              {
                workspace_id: workspaceId,
                title: `${c.custom_type_label || c.credential_type} — Credential Expiry`,
                source_type: 'credential',
                source_id: c.id,
                category: 'certification_expiry',
                due_date: c.expiry_date!,
                status: new Date(c.expiry_date!) < new Date() ? 'overdue' : 'upcoming',
                priority: 'medium',
                assigned_to: c.holder_id,
              } as any,
              { onConflict: 'source_type,source_id', ignoreDuplicates: false }
            );
        }
      }

      // Sync equipment documents with expiry dates
      const { data: eqDocs } = await supabase
        .from('equipment_documents')
        .select('id, document_type, custom_type_label, expiry_date, workspace_id')
        .not('expiry_date', 'is', null)
        .eq('workspace_id', workspaceId);

      if (eqDocs?.length) {
        for (const d of eqDocs) {
          await supabase
            .from('compliance_events')
            .upsert(
              {
                workspace_id: workspaceId,
                title: `${d.custom_type_label || d.document_type} — Equipment Doc Renewal`,
                source_type: 'equipment_doc',
                source_id: d.id,
                category: 'certification_expiry',
                due_date: d.expiry_date!,
                status: new Date(d.expiry_date!) < new Date() ? 'overdue' : 'upcoming',
                priority: 'medium',
              } as any,
              { onConflict: 'source_type,source_id', ignoreDuplicates: false }
            );
        }
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      return true;
    },
    staleTime: 1000 * 60 * 30, // only sync every 30 min
    refetchOnWindowFocus: false,
  });
}
