import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface Risk {
  id: string;
  workspace_id: string | null;
  property_id: string | null;
  risk_number: number;
  title: string;
  description: string | null;
  category: string;
  probability: number | null;
  impact: number | null;
  status: string;
  risk_owner: string | null;
  review_date: string | null;
  source_type: string | null;
  source_id: string | null;
  mitigation_strategy: string | null;
  closed_at: string | null;
  closure_notes: string | null;
  closed_by: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  property?: { id: string; name: string } | null;
  owner_profile?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface RiskAction {
  id: string;
  risk_id: string;
  workspace_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  completion_notes: string | null;
  created_by: string | null;
  created_at: string | null;
  assigned_profile?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

const QUERY_KEY = 'risks';

export function getRiskScore(p: number | null, i: number | null) {
  return (p ?? 1) * (i ?? 1);
}

export function getRiskScoreLevel(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 20) return 'critical';
  if (score >= 13) return 'high';
  if (score >= 7) return 'medium';
  return 'low';
}

export function useRisks(filters?: { propertyId?: string; category?: string; status?: string }) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('risks')
        .select('*, property:properties!risks_property_id_fkey(id, name), owner_profile:profiles!risks_risk_owner_fkey(user_id, full_name, avatar_url)')
        .order('created_at', { ascending: false });

      if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);
      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Risk[];
    },
  });
}

export function useRisk(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('risks')
        .select('*, property:properties!risks_property_id_fkey(id, name), owner_profile:profiles!risks_risk_owner_fkey(user_id, full_name, avatar_url)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Risk;
    },
    enabled: !!id,
  });
}

export function useRiskActions(riskId: string | null) {
  return useQuery({
    queryKey: ['risk-actions', riskId],
    queryFn: async () => {
      if (!riskId) return [];
      const { data, error } = await supabase
        .from('risk_actions')
        .select('*, assigned_profile:profiles!risk_actions_assigned_to_fkey(user_id, full_name, avatar_url)')
        .eq('risk_id', riskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RiskAction[];
    },
    enabled: !!riskId,
  });
}

export function useRiskStats() {
  const { data: risks = [] } = useRisks();
  
  const open = risks.filter(r => !['closed', 'accepted'].includes(r.status)).length;
  const critical = risks.filter(r => getRiskScore(r.probability, r.impact) >= 20 && !['closed', 'accepted'].includes(r.status)).length;
  const high = risks.filter(r => {
    const s = getRiskScore(r.probability, r.impact);
    return s >= 13 && s < 20 && !['closed', 'accepted'].includes(r.status);
  }).length;
  const medium = risks.filter(r => {
    const s = getRiskScore(r.probability, r.impact);
    return s >= 7 && s < 13 && !['closed', 'accepted'].includes(r.status);
  }).length;
  const low = risks.filter(r => {
    const s = getRiskScore(r.probability, r.impact);
    return s < 7 && !['closed', 'accepted'].includes(r.status);
  }).length;
  const closed = risks.filter(r => ['closed', 'accepted'].includes(r.status)).length;

  return { total: risks.length, open, critical, high, medium, low, closed };
}

export function useCreateRisk() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (risk: Partial<Risk>) => {
      const { data, error } = await supabase
        .from('risks')
        .insert({ ...risk, workspace_id: workspaceId, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Risk logged');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Risk> & { id: string }) => {
      const { data, error } = await supabase.from('risks').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Risk updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCloseRisk() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, closure_notes }: { id: string; closure_notes: string }) => {
      const { error } = await supabase.from('risks').update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closure_notes,
        closed_by: user?.id,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Risk closed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateRiskAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (action: Partial<RiskAction>) => {
      const { data, error } = await supabase
        .from('risk_actions')
        .insert({ ...action, workspace_id: workspaceId, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-actions'] });
      toast.success('Action added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRiskAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RiskAction> & { id: string }) => {
      const { error } = await supabase.from('risk_actions').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-actions'] });
      toast.success('Action updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
