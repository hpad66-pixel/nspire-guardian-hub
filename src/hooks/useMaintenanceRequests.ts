import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { computeVoiceLiveKpis } from '@/lib/voice/liveStats';
import { emitVoiceLive } from '@/lib/voice/liveBus';

// Unique channel names so concurrent subscribers never share a subscribed channel.
let rtSeq = 0;
const rtNonce = () => `${(++rtSeq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const REQUESTS_KEY = 'maintenance-requests';
const STATS_KEY = 'maintenance-request-stats';

function invalidateVoiceQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [REQUESTS_KEY] });
  qc.invalidateQueries({ queryKey: [STATS_KEY] });
  qc.invalidateQueries({ queryKey: ['work-orders'] });
}

export interface MaintenanceRequest {
  id: string;
  ticket_number: number;
  caller_name: string;
  caller_phone: string;
  caller_email: string | null;
  caller_unit_number: string | null;
  property_id: string | null;
  unit_id: string | null;
  issue_category: string;
  issue_subcategory: string | null;
  issue_description: string;
  issue_location: string | null;
  urgency_level: string;
  is_emergency: boolean;
  preferred_contact_time: string | null;
  preferred_access_time: string | null;
  has_pets: boolean;
  special_access_instructions: string | null;
  call_id: string | null;
  call_duration_seconds: number | null;
  call_transcript: string | null;
  call_recording_url: string | null;
  call_started_at: string | null;
  call_ended_at: string | null;
  status: string;
  assigned_to: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  resolution_notes: string | null;
  resolution_photos: string[] | null;
  resolved_at: string | null;
  resolved_by: string | null;
  work_order_id: string | null;
  created_at: string;
  updated_at: string;
  demo_seed?: boolean | null;
  properties?: {
    name: string;
    address: string;
  } | null;
  units?: {
    unit_number: string;
  } | null;
}

export interface MaintenanceRequestActivity {
  id: string;
  request_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

/**
 * Live maintenance-request list with Supabase realtime + short polling after
 * a call hangs up so tickets/WOs appear without a manual Refresh.
 */
export function useMaintenanceRequests(filters?: {
  status?: string;
  urgency?: string;
  property_id?: string;
  is_emergency?: boolean;
  /** When true, refetch every few seconds (used while a call is processing). */
  live?: boolean;
}) {
  const qc = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const bootstrapped = useRef(false);

  const query = useQuery({
    queryKey: [REQUESTS_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties:property_id (name, address),
          units:unit_id (unit_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        q = q.eq('status', filters.status);
      }
      if (filters?.urgency) {
        q = q.eq('urgency_level', filters.urgency);
      }
      if (filters?.property_id) {
        q = q.eq('property_id', filters.property_id);
      }
      if (filters?.is_emergency !== undefined) {
        q = q.eq('is_emergency', filters.is_emergency);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
    refetchInterval: filters?.live ? 2500 : 12_000,
    refetchOnWindowFocus: true,
  });

  // Bootstrap "seen" set so we only toast on *new* realtime inserts.
  useEffect(() => {
    if (!query.data || bootstrapped.current) return;
    query.data.forEach((r) => seenIds.current.add(r.id));
    bootstrapped.current = true;
  }, [query.data]);

  useEffect(() => {
    const filter = filters?.property_id
      ? `property_id=eq.${filters.property_id}`
      : undefined;

    const channel = supabase
      .channel(`maintenance-requests-${rtNonce()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          invalidateVoiceQueries(qc);

          const row = (payload.new || payload.old) as Partial<MaintenanceRequest> | undefined;
          if (!row?.id) return;

          if (payload.eventType === 'INSERT') {
            if (!seenIds.current.has(row.id)) {
              seenIds.current.add(row.id);
              const ticket =
                typeof row.ticket_number === 'number'
                  ? `MR-${String(row.ticket_number).padStart(4, '0')}`
                  : undefined;
              emitVoiceLive({
                kind: 'ticket_created',
                title: ticket ? `Ticket ${ticket} created` : 'New maintenance ticket',
                detail: row.issue_category
                  ? `${row.issue_category}${row.caller_unit_number ? ` · Unit ${row.caller_unit_number}` : ''}`
                  : row.caller_name || undefined,
                ticketNumber: ticket,
                requestId: row.id,
              });
              if (row.work_order_id) {
                emitVoiceLive({
                  kind: 'wo_linked',
                  title: 'Work order wired',
                  detail: ticket ? `${ticket} → work order ready` : 'Work order linked to ticket',
                  ticketNumber: ticket,
                  requestId: row.id,
                  workOrderId: row.work_order_id,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const prev = payload.old as Partial<MaintenanceRequest> | undefined;
            if (row.work_order_id && !prev?.work_order_id) {
              const ticket =
                typeof row.ticket_number === 'number'
                  ? `MR-${String(row.ticket_number).padStart(4, '0')}`
                  : undefined;
              emitVoiceLive({
                kind: 'wo_linked',
                title: 'Work order wired',
                detail: ticket ? `${ticket} linked to a work order` : 'Work order linked',
                ticketNumber: ticket,
                requestId: row.id,
                workOrderId: row.work_order_id,
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters?.property_id, qc]);

  return query;
}

export function useMaintenanceRequest(id: string) {
  return useQuery({
    queryKey: ['maintenance-requests', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties:property_id (name, address),
          units:unit_id (unit_number)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as MaintenanceRequest;
    },
    enabled: !!id,
  });
}

export function useMaintenanceRequestActivity(requestId: string) {
  return useQuery({
    queryKey: ['maintenance-request-activity', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_request_activity')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MaintenanceRequestActivity[];
    },
    enabled: !!requestId,
  });
}

export function useUpdateMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', data.id] });
      toast.success('Request updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update request: ${error.message}`);
    },
  });
}

export function useAssignMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to,
          assigned_at: new Date().toISOString(),
          assigned_by: user?.id,
          status: 'assigned',
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', data.id] });
      toast.success('Request assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign request: ${error.message}`);
    },
  });
}

export function useResolveMaintenanceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resolution_notes, resolution_photos }: { 
      id: string; 
      resolution_notes: string; 
      resolution_photos?: string[] 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          resolution_notes,
          resolution_photos,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          status: 'completed',
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', data.id] });
      toast.success('Request resolved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve request: ${error.message}`);
    },
  });
}

export function useMaintenanceRequestStats(opts?: { property_id?: string; live?: boolean }) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [STATS_KEY, opts?.property_id ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('maintenance_requests')
        .select(
          'status, urgency_level, is_emergency, created_at, updated_at, call_ended_at, issue_category, work_order_id, demo_seed',
        );

      if (opts?.property_id) {
        q = q.eq('property_id', opts.property_id);
      }

      const { data, error } = await q;
      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now);
      thisWeek.setDate(thisWeek.getDate() - 7);

      const requests = data || [];
      const live = computeVoiceLiveKpis(requests, { now });

      return {
        total: requests.length,
        totalThisMonth: requests.filter((r) => new Date(r.created_at) >= thisMonth).length,
        emergency: requests.filter((r) => r.is_emergency && r.status !== 'closed').length,
        pending: requests.filter((r) => ['new', 'reviewed', 'assigned'].includes(r.status)).length,
        inProgress: requests.filter((r) => r.status === 'in_progress').length,
        completedThisWeek: requests.filter(
          (r) => r.status === 'completed' && new Date(r.created_at) >= thisWeek,
        ).length,
        todayCalls: live.todayCalls,
        todayProcessed: live.todayProcessed,
        backlog: live.backlog,
        withWorkOrder: live.withWorkOrder,
        byStatus: {
          new: requests.filter((r) => r.status === 'new').length,
          reviewed: requests.filter((r) => r.status === 'reviewed').length,
          assigned: requests.filter((r) => r.status === 'assigned').length,
          in_progress: requests.filter((r) => r.status === 'in_progress').length,
          completed: requests.filter((r) => r.status === 'completed').length,
          closed: requests.filter((r) => r.status === 'closed').length,
        },
        byCategory: requests.reduce(
          (acc, r) => {
            acc[r.issue_category] = (acc[r.issue_category] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      };
    },
    refetchInterval: opts?.live ? 2500 : 12_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const filter = opts?.property_id ? `property_id=eq.${opts.property_id}` : undefined;
    const channel = supabase
      .channel(`maintenance-request-stats-${rtNonce()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
          ...(filter ? { filter } : {}),
        },
        () => {
          qc.invalidateQueries({ queryKey: [STATS_KEY] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [opts?.property_id, qc]);

  return query;
}
