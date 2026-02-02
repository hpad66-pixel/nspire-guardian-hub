import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useMaintenanceRequests(filters?: {
  status?: string;
  urgency?: string;
  property_id?: string;
  is_emergency?: boolean;
}) {
  return useQuery({
    queryKey: ['maintenance-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties:property_id (name, address),
          units:unit_id (unit_number)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.urgency) {
        query = query.eq('urgency_level', filters.urgency);
      }
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id);
      }
      if (filters?.is_emergency !== undefined) {
        query = query.eq('is_emergency', filters.is_emergency);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
  });
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
        .update(updates)
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

export function useMaintenanceRequestStats() {
  return useQuery({
    queryKey: ['maintenance-request-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('status, urgency_level, is_emergency, created_at, issue_category');
      
      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisWeek = new Date(now);
      thisWeek.setDate(thisWeek.getDate() - 7);

      const requests = data || [];
      
      return {
        total: requests.length,
        totalThisMonth: requests.filter(r => new Date(r.created_at) >= thisMonth).length,
        emergency: requests.filter(r => r.is_emergency && r.status !== 'closed').length,
        pending: requests.filter(r => ['new', 'reviewed', 'assigned'].includes(r.status)).length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        completedThisWeek: requests.filter(r => 
          r.status === 'completed' && new Date(r.created_at) >= thisWeek
        ).length,
        byStatus: {
          new: requests.filter(r => r.status === 'new').length,
          reviewed: requests.filter(r => r.status === 'reviewed').length,
          assigned: requests.filter(r => r.status === 'assigned').length,
          in_progress: requests.filter(r => r.status === 'in_progress').length,
          completed: requests.filter(r => r.status === 'completed').length,
          closed: requests.filter(r => r.status === 'closed').length,
        },
        byCategory: requests.reduce((acc, r) => {
          acc[r.issue_category] = (acc[r.issue_category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
  });
}
