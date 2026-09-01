import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkOrderPartRow {
  id: string;
  work_order_id: string;
  property_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_id: string | null;
  unit_label: string | null;
  status: 'assigned' | 'installed' | 'cancelled';
  before_photo_url: string | null;
  after_photo_url: string | null;
  catalog_photo_url: string | null;
  issued_to_name: string | null;
  assigned_by: string | null;
  assigned_at: string;
  installed_at: string | null;
  installed_by: string | null;
  inventory_transaction_id: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  inventory_item?: {
    id: string;
    name: string;
    sku: string | null;
    photo_url: string | null;
    current_quantity: number;
    unit_cost: number | null;
    category: string | null;
  } | null;
}

export function useWorkOrderParts(workOrderId: string | null | undefined) {
  return useQuery({
    queryKey: ['work-order-parts', workOrderId],
    queryFn: async () => {
      if (!workOrderId) return [] as WorkOrderPartRow[];
      const { data, error } = await (supabase as any)
        .from('work_order_parts')
        .select(`
          *,
          inventory_item:property_inventory_items(
            id, name, sku, photo_url, current_quantity, unit_cost, category
          )
        `)
        .eq('work_order_id', workOrderId)
        .neq('status', 'cancelled')
        .order('assigned_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkOrderPartRow[];
    },
    enabled: !!workOrderId,
  });
}

interface AssignPartParams {
  workOrderId: string;
  propertyId: string;
  inventoryItemId: string;
  quantity: number;
  unitId?: string | null;
  unitLabel?: string | null;
  issuedToName?: string | null;
  reason?: string | null;
  catalogPhotoUrl?: string | null;
}

export function useAssignWorkOrderPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: AssignPartParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('work_order_parts')
        .insert({
          work_order_id: params.workOrderId,
          property_id: params.propertyId,
          inventory_item_id: params.inventoryItemId,
          quantity: Math.max(0.01, Number(params.quantity) || 1),
          unit_id: params.unitId || null,
          unit_label: params.unitLabel || null,
          status: 'assigned',
          issued_to_name: params.issuedToName || null,
          reason: params.reason || null,
          catalog_photo_url: params.catalogPhotoUrl || null,
          assigned_by: user?.id ?? null,
        })
        .select(`
          *,
          inventory_item:property_inventory_items(
            id, name, sku, photo_url, current_quantity, unit_cost, category
          )
        `)
        .single();
      if (error) throw error;
      return data as WorkOrderPartRow;
    },
    onSuccess: (_row, params) => {
      qc.invalidateQueries({ queryKey: ['work-order-parts', params.workOrderId] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Part assigned — capture before & after photos, then mark Installed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to assign part');
    },
  });
}

export function useUpdateWorkOrderPartPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      partId: string;
      workOrderId: string;
      kind: 'before' | 'after';
      url: string;
    }) => {
      const patch =
        params.kind === 'before'
          ? { before_photo_url: params.url }
          : { after_photo_url: params.url };
      const { data, error } = await (supabase as any)
        .from('work_order_parts')
        .update(patch)
        .eq('id', params.partId)
        .select(`
          *,
          inventory_item:property_inventory_items(
            id, name, sku, photo_url, current_quantity, unit_cost, category
          )
        `)
        .single();
      if (error) throw error;
      return data as WorkOrderPartRow;
    },
    onSuccess: (_row, params) => {
      qc.invalidateQueries({ queryKey: ['work-order-parts', params.workOrderId] });
      toast.success(
        params.kind === 'before'
          ? 'BEFORE photo saved (removed / failed part)'
          : 'AFTER photo saved (installed part)',
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save photo');
    },
  });
}

export function useInstallWorkOrderPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { partId: string; workOrderId: string; propertyId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('work_order_parts')
        .update({
          status: 'installed',
          installed_by: user?.id ?? null,
          installed_at: new Date().toISOString(),
        })
        .eq('id', params.partId)
        .select(`
          *,
          inventory_item:property_inventory_items(
            id, name, sku, photo_url, current_quantity, unit_cost, category
          )
        `)
        .single();
      if (error) throw error;
      return data as WorkOrderPartRow;
    },
    onSuccess: (_row, params) => {
      qc.invalidateQueries({ queryKey: ['work-order-parts', params.workOrderId] });
      qc.invalidateQueries({ queryKey: ['stores-items', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-transactions', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Part marked Installed — stores inventory adjusted');
    },
    onError: (err: Error) => {
      const msg = err.message || 'Install failed';
      toast.error(
        msg
          .replace(/^WO_PART_[A-Z_]+:\s*/, '')
          .replace(/^STORES_[A-Z_]+:\s*/, ''),
      );
    },
  });
}

export function useCancelWorkOrderPart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { partId: string; workOrderId: string }) => {
      const { data, error } = await (supabase as any)
        .from('work_order_parts')
        .update({ status: 'cancelled' })
        .eq('id', params.partId)
        .eq('status', 'assigned')
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_row, params) => {
      qc.invalidateQueries({ queryKey: ['work-order-parts', params.workOrderId] });
      toast.success('Part assignment cancelled');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Could not cancel part');
    },
  });
}
