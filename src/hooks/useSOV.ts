import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── SOV Line Items ────────────────────────────────────────────────────────────

export function useSOVLineItems(projectId: string | null) {
  return useQuery({
    queryKey: ['sov-line-items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('sov_line_items')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useUpsertSOVLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: {
      id?: string;
      project_id: string;
      workspace_id: string;
      item_number: string;
      description: string;
      scheduled_value: number;
      retainage_pct: number;
      sort_order: number;
    }) => {
      const { error } = await supabase
        .from('sov_line_items')
        .upsert(item, { onConflict: 'id' });
      if (error) throw error;
      return item.project_id;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['sov-line-items', projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSOVLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('sov_line_items').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['sov-line-items', projectId] });
      toast.success('Line item removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Pay Applications ──────────────────────────────────────────────────────────

export function usePayApplications(projectId: string | null) {
  return useQuery({
    queryKey: ['pay-applications', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('pay_applications')
        .select('*')
        .eq('project_id', projectId)
        .order('pay_app_number', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function usePayAppLineItems(payAppId: string | null) {
  return useQuery({
    queryKey: ['pay-app-line-items', payAppId],
    queryFn: async () => {
      if (!payAppId) return [];
      const { data, error } = await supabase
        .from('pay_app_line_items')
        .select('*, sov_line_item:sov_line_items(*)')
        .eq('pay_app_id', payAppId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!payAppId,
  });
}

export function useCreatePayApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      project_id: string;
      workspace_id: string;
      pay_app_number: number;
      period_from: string;
      period_to: string;
      contractor_name?: string;
      contract_number?: string;
    }) => {
      const { data: payApp, error: paError } = await supabase
        .from('pay_applications')
        .insert(params)
        .select()
        .single();
      if (paError) throw paError;

      // Auto-populate line items from SOV
      const { data: sovItems } = await supabase
        .from('sov_line_items')
        .select('*')
        .eq('project_id', params.project_id)
        .order('sort_order');

      if (sovItems && sovItems.length > 0) {
        // Get cumulative work_completed from all previous certified pay apps
        const { data: prevPayApps } = await supabase
          .from('pay_applications')
          .select('id')
          .eq('project_id', params.project_id)
          .in('status', ['certified', 'paid']);

        const prevIds = (prevPayApps ?? []).map(p => p.id);
        let prevTotals: Record<string, number> = {};

        if (prevIds.length > 0) {
          const { data: prevItems } = await supabase
            .from('pay_app_line_items')
            .select('sov_line_item_id, certified_this_period, work_completed_this_period')
            .in('pay_app_id', prevIds);

          for (const pi of prevItems ?? []) {
            const amt = Number(pi.certified_this_period ?? pi.work_completed_this_period ?? 0);
            prevTotals[pi.sov_line_item_id] = (prevTotals[pi.sov_line_item_id] ?? 0) + amt;
          }
        }

        const lineItems = sovItems.map(sov => ({
          pay_app_id: payApp.id,
          sov_line_item_id: sov.id,
          work_completed_previous: prevTotals[sov.id] ?? 0,
          work_completed_this_period: 0,
          materials_stored: 0,
        }));

        const { error: liError } = await supabase.from('pay_app_line_items').insert(lineItems);
        if (liError) throw liError;
      }

      return payApp;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pay-applications', data.project_id] });
      toast.success('Pay Application created');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePayAppLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payAppId, ...updates }: {
      id: string;
      payAppId: string;
      work_completed_this_period?: number;
      materials_stored?: number;
      certified_this_period?: number;
      retainage_pct_override?: number;
    }) => {
      const { error } = await supabase
        .from('pay_app_line_items')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return payAppId;
    },
    onSuccess: (payAppId) => {
      qc.invalidateQueries({ queryKey: ['pay-app-line-items', payAppId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePayApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: {
      id: string;
      projectId: string;
      status?: string;
      certified_date?: string;
      submitted_date?: string;
      notes?: string;
      contractor_name?: string;
      contract_number?: string;
      certified_by?: string;
    }) => {
      const { error } = await supabase
        .from('pay_applications')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ['pay-applications', projectId] });
      toast.success('Pay Application updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Lien Waivers ─────────────────────────────────────────────────────────────

export function useLienWaivers(payAppId: string | null) {
  return useQuery({
    queryKey: ['lien-waivers', payAppId],
    queryFn: async () => {
      if (!payAppId) return [];
      const { data, error } = await supabase
        .from('lien_waivers')
        .select('*')
        .eq('pay_app_id', payAppId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!payAppId,
  });
}

export function useCreateLienWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (waiver: {
      pay_app_id: string;
      workspace_id: string;
      waiver_type: string;
      amount?: number;
      through_date?: string;
      received_date?: string;
      file_url?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from('lien_waivers').insert(waiver);
      if (error) throw error;
      return waiver.pay_app_id;
    },
    onSuccess: (payAppId) => {
      qc.invalidateQueries({ queryKey: ['lien-waivers', payAppId] });
      toast.success('Lien waiver recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Summary computed values ───────────────────────────────────────────────────

export function computePayAppTotals(
  lineItems: Array<{
    sov_line_item: { scheduled_value: number; retainage_pct: number } | null;
    work_completed_previous: number;
    work_completed_this_period: number;
    materials_stored: number;
    certified_this_period: number | null;
    retainage_pct_override: number | null;
  }>
) {
  let scheduledValue = 0;
  let completedPrevious = 0;
  let completedThisPeriod = 0;
  let materialsStored = 0;
  let certifiedThisPeriod = 0;
  let retainageHeld = 0;

  for (const li of lineItems) {
    if (!li.sov_line_item) continue;
    const sv = Number(li.sov_line_item.scheduled_value);
    const certified = Number(li.certified_this_period ?? li.work_completed_this_period);
    const retPct = Number(li.retainage_pct_override ?? li.sov_line_item.retainage_pct) / 100;

    scheduledValue += sv;
    completedPrevious += Number(li.work_completed_previous);
    completedThisPeriod += Number(li.work_completed_this_period);
    materialsStored += Number(li.materials_stored);
    certifiedThisPeriod += certified;
    retainageHeld += certified * retPct;
  }

  const totalEarned = completedPrevious + certifiedThisPeriod + materialsStored;
  const netPayment = certifiedThisPeriod - retainageHeld;
  const pctComplete = scheduledValue > 0 ? (totalEarned / scheduledValue) * 100 : 0;

  return {
    scheduledValue, completedPrevious, completedThisPeriod,
    materialsStored, certifiedThisPeriod, retainageHeld,
    totalEarned, netPayment, pctComplete,
  };
}
