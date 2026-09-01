import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toDateOnly } from '@/lib/date';
import type { InventoryItem, InventoryTransaction } from '@/hooks/useInventory';

export interface MaterialReceipt {
  id: string;
  property_id: string;
  project_id: string | null;
  vendor: string;
  receipt_number: string | null;
  purchased_at: string;
  total_amount: number | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  demo_seed: boolean;
  created_at: string;
}

export interface MaterialReceiptLine {
  id: string;
  receipt_id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number | null;
  line_total: number | null;
}

export interface StoresUnit {
  id: string;
  unit_number: string;
  status: string | null;
}

export interface StoresWorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  requester_name: string | null;
  unit_id: string | null;
  due_date: string;
  notes: string | null;
  unit?: { unit_number: string } | null;
}

export type StoresTxn = InventoryTransaction & {
  unit_id?: string | null;
  unit_label?: string | null;
  deployed_at?: string | null;
  requester_name?: string | null;
  reason?: string | null;
  issued_to_name?: string | null;
  emergency_override?: boolean | null;
  demo_seed?: boolean | null;
  receipt_id?: string | null;
};

export function useProjectPropertyId(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-property-id', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, property_id, name')
        .eq('id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; property_id: string | null; name: string } | null;
    },
    enabled: !!projectId,
  });
}

export function useStoresItems(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-items', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_inventory_items')
        .select('*')
        .eq('property_id', propertyId!)
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!propertyId,
  });
}

export function useStoresTransactions(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-transactions', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('property_id', propertyId!)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as StoresTxn[];
    },
    enabled: !!propertyId,
  });
}

export function useStoresReceipts(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-receipts', propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('property_material_receipts')
        .select('*')
        .eq('property_id', propertyId!)
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaterialReceipt[];
    },
    enabled: !!propertyId,
  });
}

export function useStoresUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-units', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, status')
        .eq('property_id', propertyId!)
        .order('unit_number');
      if (error) throw error;
      return (data ?? []) as StoresUnit[];
    },
    enabled: !!propertyId,
  });
}

export function useStoresWorkOrders(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-work-orders', propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .select('id, title, status, priority, requester_name, unit_id, due_date, notes, unit:units(unit_number)')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as StoresWorkOrder[];
    },
    enabled: !!propertyId,
  });
}

export function useOpenStoresWorkOrders(propertyId: string | undefined) {
  return useQuery({
    queryKey: ['stores-work-orders-open', propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .select('id, title, status, priority, requester_name, unit_id, due_date, notes, unit:units(unit_number)')
        .eq('property_id', propertyId!)
        .not('status', 'in', '(verified,closed,rejected)')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StoresWorkOrder[];
    },
    enabled: !!propertyId,
  });
}

interface ReceiveReceiptParams {
  propertyId: string;
  projectId: string;
  vendor: string;
  receiptNumber?: string;
  purchasedAt?: string;
  notes?: string;
  fileUrl?: string;
  fileName?: string;
  lines: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitCost?: number;
  }>;
}

export function useReceiveMaterialReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: ReceiveReceiptParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const total = params.lines.reduce(
        (s, l) => s + l.quantity * (l.unitCost ?? 0),
        0,
      );

      const { data: receipt, error: rErr } = await (supabase as any)
        .from('property_material_receipts')
        .insert({
          property_id: params.propertyId,
          project_id: params.projectId,
          vendor: params.vendor,
          receipt_number: params.receiptNumber || null,
          purchased_at: params.purchasedAt || toDateOnly(new Date()),
          total_amount: total,
          file_url: params.fileUrl || null,
          file_name: params.fileName || null,
          notes: params.notes || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (rErr) throw rErr;
      const receiptRow = receipt as MaterialReceipt;

      const lineRows = params.lines.map((l) => ({
        receipt_id: receiptRow.id,
        item_id: l.itemId,
        description: l.description,
        quantity: l.quantity,
        unit_cost: l.unitCost ?? null,
        line_total: l.quantity * (l.unitCost ?? 0),
      }));

      const { error: lErr } = await (supabase as any)
        .from('property_material_receipt_lines')
        .insert(lineRows);
      if (lErr) throw lErr;

      for (const line of params.lines) {
        const { error: tErr } = await (supabase as any).from('inventory_transactions').insert({
          item_id: line.itemId,
          property_id: params.propertyId,
          transaction_type: 'received',
          quantity: Math.abs(line.quantity),
          unit_cost: line.unitCost ?? null,
          linked_project_id: params.projectId,
          receipt_id: receiptRow.id,
          reference_number: params.receiptNumber || null,
          vendor: params.vendor,
          notes: params.notes || 'Received via Stores',
          transaction_date: params.purchasedAt || toDateOnly(new Date()),
          created_by: user?.id ?? null,
        });
        if (tErr) throw tErr;
      }

      return receiptRow;
    },
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: ['stores-items', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-transactions', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-receipts', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      toast.success('Receipt posted — stock updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to post receipt');
    },
  });
}

interface IssuePartParams {
  propertyId: string;
  projectId: string;
  itemId: string;
  quantity: number;
  workOrderId: string;
  unitId?: string | null;
  unitLabel: string;
  deployedAt?: string;
  requesterName?: string;
  reason?: string;
  issuedToName?: string;
  unitCost?: number | null;
  emergencyOverride?: boolean;
  notes?: string;
}

export function useIssueStorePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: IssuePartParams) => {
      if (!params.workOrderId && !params.emergencyOverride) {
        throw new Error('A work order is required to issue parts.');
      }
      if (!params.unitLabel?.trim() && !params.emergencyOverride) {
        throw new Error('Unit is required — where was this part deployed?');
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('inventory_transactions')
        .insert({
          item_id: params.itemId,
          property_id: params.propertyId,
          transaction_type: 'used',
          quantity: -Math.abs(params.quantity),
          unit_cost: params.unitCost ?? null,
          linked_work_order_id: params.workOrderId || null,
          linked_project_id: params.projectId,
          unit_id: params.unitId || null,
          unit_label: params.unitLabel || null,
          deployed_at: params.deployedAt || toDateOnly(new Date()),
          requester_name: params.requesterName || null,
          reason: params.reason || null,
          issued_to_name: params.issuedToName || null,
          emergency_override: !!params.emergencyOverride,
          notes: params.notes || null,
          transaction_date: params.deployedAt || toDateOnly(new Date()),
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, params) => {
      qc.invalidateQueries({ queryKey: ['stores-items', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-transactions', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      toast.success('Part issued to work order');
    },
    onError: (err: Error) => {
      const msg = err.message || 'Issue failed';
      toast.error(msg.replace(/^STORES_[A-Z_]+:\s*/, ''));
    },
  });
}

interface CreateStoresWoParams {
  propertyId: string;
  projectId: string;
  title: string;
  requesterName: string;
  unitId?: string | null;
  description?: string;
  priority?: 'routine' | 'emergency';
  dueDate?: string;
  assignedTechNote?: string;
}

export function useCreateStoresWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateStoresWoParams) => {
      if (!params.requesterName?.trim()) {
        throw new Error('Requester is required on every work order.');
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('work_orders')
        .insert({
          property_id: params.propertyId,
          unit_id: params.unitId || null,
          title: params.title,
          description: params.description || null,
          priority: params.priority || 'routine',
          status: 'assigned',
          due_date: params.dueDate || toDateOnly(new Date()),
          requester_name: params.requesterName,
          notes: params.assignedTechNote || null,
          linked_project_id: params.projectId,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as StoresWorkOrder;
    },
    onSuccess: (_d, params) => {
      qc.invalidateQueries({ queryKey: ['stores-work-orders', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-work-orders-open', params.propertyId] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useResetStoresDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId: string) => {
      const { data, error } = await (supabase as any).rpc('reset_stores_demo_data', {
        p_property_id: propertyId,
      });
      if (error) throw error;
      return data as Record<string, number>;
    },
    onSuccess: (_d, propertyId) => {
      qc.invalidateQueries({ queryKey: ['stores-items', propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-transactions', propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-receipts', propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-work-orders', propertyId] });
      qc.invalidateQueries({ queryKey: ['stores-units', propertyId] });
      toast.success('Demo stores data reset');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export async function uploadStoresReceiptFile(
  propertyId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `stores-receipts/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('project-artifacts')
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from('project-artifacts').getPublicUrl(path);
  return { url: data.publicUrl, path };
}
