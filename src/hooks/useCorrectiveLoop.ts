import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface CorrectiveIssue {
  id: string;
  title: string;
  description: string | null;
  property_id: string;
  property_name?: string;
  unit_id: string | null;
  severity: string;
  status: string;
  source_module: string | null;
  corrective_status: string;
  corrective_deadline: string | null;
  linked_work_order_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  closure_photo_url: string | null;
  created_at: string;
  assigned_to?: string | null;
}

export function useDefectsNeedingAction(propertyId?: string) {
  return useQuery({
    queryKey: ['corrective-needs-action', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select('*, properties(name)')
        .eq('corrective_action_required', true)
        .is('linked_work_order_id', null)
        .not('status', 'in', '("resolved","verified")');
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        property_name: d.properties?.name,
      })) as CorrectiveIssue[];
    },
  });
}

export function useActiveCorrectiveLoop(propertyId?: string) {
  return useQuery({
    queryKey: ['corrective-active', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select('*, properties(name)')
        .neq('corrective_status', 'none')
        .neq('corrective_status', 'closed');
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        property_name: d.properties?.name,
      })) as CorrectiveIssue[];
    },
  });
}

export function useCorrectiveLoopStats(propertyId?: string) {
  return useQuery({
    queryKey: ['corrective-stats', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('issues')
        .select('corrective_status, corrective_action_required, linked_work_order_id')
        .eq('corrective_action_required', true);
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      const items = data || [];
      return {
        needsWorkOrder: items.filter(i => !i.linked_work_order_id && i.corrective_status === 'none').length,
        workOrderCreated: items.filter(i => i.corrective_status === 'work_order_created').length,
        workCompleted: items.filter(i => i.corrective_status === 'work_completed').length,
        awaitingVerification: items.filter(i => i.corrective_status === 'work_completed').length,
        verified: items.filter(i => i.corrective_status === 'verified').length,
        closed: items.filter(i => i.corrective_status === 'closed').length,
      };
    },
  });
}

export function useCreateCorrectiveWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, workOrderData }: { issueId: string; workOrderData: any }) => {
      // Create work order
      const { data: wo, error: woErr } = await supabase
        .from('work_orders')
        .insert({
          ...workOrderData,
          source_issue_id: issueId,
          requires_verification: true,
        })
        .select()
        .single();
      if (woErr) throw woErr;

      // Update issue
      const { error: issErr } = await supabase
        .from('issues')
        .update({
          linked_work_order_id: wo.id,
          corrective_status: 'work_order_created',
        } as any)
        .eq('id', issueId);
      if (issErr) throw issErr;

      return wo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-needs-action'] });
      qc.invalidateQueries({ queryKey: ['corrective-active'] });
      qc.invalidateQueries({ queryKey: ['corrective-stats'] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created from defect');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useVerifyCorrectiveAction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      workOrderId, issueId, verificationNotes, closurePhotos,
    }: {
      workOrderId: string; issueId: string; verificationNotes: string; closurePhotos?: string[];
    }) => {
      // Update work order
      await supabase
        .from('work_orders')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes,
          closure_photos: closurePhotos || [],
        } as any)
        .eq('id', workOrderId);

      // Update issue
      await supabase
        .from('issues')
        .update({
          corrective_status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes,
        } as any)
        .eq('id', issueId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-active'] });
      qc.invalidateQueries({ queryKey: ['corrective-stats'] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Corrective action verified');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCloseCorrectiveLoop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      issueId, closureNotes, closurePhotoUrl, updateRegulatory,
    }: {
      issueId: string; closureNotes: string; closurePhotoUrl?: string; updateRegulatory?: boolean;
    }) => {
      await supabase
        .from('issues')
        .update({
          status: 'resolved',
          corrective_status: 'closed',
          verification_notes: closureNotes,
          closure_photo_url: closurePhotoUrl || null,
        } as any)
        .eq('id', issueId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corrective-active'] });
      qc.invalidateQueries({ queryKey: ['corrective-stats'] });
      qc.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Corrective loop closed');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
