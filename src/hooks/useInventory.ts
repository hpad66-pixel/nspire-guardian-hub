import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  property_id: string;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unit_of_measure: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost: number | null;
  preferred_vendor: string | null;
  storage_location: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  property_id: string;
  transaction_type: string;
  quantity: number;
  quantity_after: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  linked_work_order_id: string | null;
  linked_project_id: string | null;
  reference_number: string | null;
  vendor: string | null;
  notes: string | null;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
  created_by_name?: string | null;
}

export interface InventoryConsumption {
  month: string;
  category: string;
  total_spent: number;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useInventoryItems(
  propertyId: string,
  filters?: { category?: string; lowStockOnly?: boolean }
) {
  return useQuery({
    queryKey: ['inventory-items', propertyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('property_inventory_items')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      let items = data as InventoryItem[];

      if (filters?.lowStockOnly) {
        items = items.filter(
          (item) => item.current_quantity <= item.minimum_quantity
        );
      }

      return items;
    },
    enabled: !!propertyId,
  });
}

export function useLowStockCount(propertyId: string) {
  return useQuery({
    queryKey: ['low-stock-count', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_inventory_items')
        .select('id, current_quantity, minimum_quantity')
        .eq('property_id', propertyId)
        .eq('is_active', true);

      if (error) throw error;

      return (data ?? []).filter(
        (item) => item.current_quantity <= item.minimum_quantity
      ).length;
    },
    enabled: !!propertyId,
  });
}

export function useInventoryTransactions(itemId: string) {
  return useQuery({
    queryKey: ['inventory-transactions', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          profiles!inventory_transactions_created_by_fkey(full_name)
        `)
        .eq('item_id', itemId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without join if FK alias doesn't resolve
        const { data: fallback, error: fallbackError } = await supabase
          .from('inventory_transactions')
          .select('*')
          .eq('item_id', itemId)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return (fallback ?? []) as InventoryTransaction[];
      }

      return (data ?? []).map((row: any) => ({
        ...row,
        created_by_name: row.profiles?.full_name ?? null,
        profiles: undefined,
      })) as InventoryTransaction[];
    },
    enabled: !!itemId,
  });
}

export function useInventoryConsumptionByMonth(
  propertyId: string,
  months: number = 6
) {
  return useQuery({
    queryKey: ['inventory-consumption', propertyId, months],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - months);
      const sinceStr = since.toISOString().slice(0, 10);

      // Fetch transactions with their parent item's category
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          transaction_type,
          total_cost,
          transaction_date,
          property_inventory_items!inventory_transactions_item_id_fkey(category)
        `)
        .eq('property_id', propertyId)
        .in('transaction_type', ['used', 'disposed'])
        .gte('transaction_date', sinceStr)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // Client-side aggregation by month + category
      const grouped: Record<string, InventoryConsumption> = {};
      for (const row of data ?? []) {
        const month = row.transaction_date.slice(0, 7); // YYYY-MM
        const category = (row.property_inventory_items as any)?.category ?? 'general';
        const key = `${month}__${category}`;
        if (!grouped[key]) {
          grouped[key] = { month, category, total_spent: 0 };
        }
        grouped[key].total_spent += Math.abs(row.total_cost ?? 0);
      }

      return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!propertyId,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

interface AddInventoryItemParams {
  propertyId: string;
  name: string;
  category: string;
  unitOfMeasure?: string;
  description?: string;
  currentQuantity?: number;
  minimumQuantity?: number;
  unitCost?: number;
  preferredVendor?: string;
  storageLocation?: string;
  sku?: string;
  photoUrl?: string;
}

export function useAddInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddInventoryItemParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('property_inventory_items')
        .insert({
          property_id: params.propertyId,
          name: params.name,
          category: params.category,
          unit_of_measure: params.unitOfMeasure ?? 'each',
          description: params.description ?? null,
          current_quantity: params.currentQuantity ?? 0,
          minimum_quantity: params.minimumQuantity ?? 0,
          unit_cost: params.unitCost ?? null,
          preferred_vendor: params.preferredVendor ?? null,
          storage_location: params.storageLocation ?? null,
          sku: params.sku ?? null,
          photo_url: params.photoUrl ?? null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-count', params.propertyId] });
      toast({ title: 'Item added to inventory' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add item', description: error.message, variant: 'destructive' });
    },
  });
}

interface UpdateInventoryItemParams extends Partial<AddInventoryItemParams> {
  id: string;
  propertyId: string;
  isActive?: boolean;
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId, ...params }: UpdateInventoryItemParams) => {
      const updates: Record<string, unknown> = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.category !== undefined) updates.category = params.category;
      if (params.unitOfMeasure !== undefined) updates.unit_of_measure = params.unitOfMeasure;
      if (params.description !== undefined) updates.description = params.description;
      if (params.currentQuantity !== undefined) updates.current_quantity = params.currentQuantity;
      if (params.minimumQuantity !== undefined) updates.minimum_quantity = params.minimumQuantity;
      if (params.unitCost !== undefined) updates.unit_cost = params.unitCost;
      if (params.preferredVendor !== undefined) updates.preferred_vendor = params.preferredVendor;
      if (params.storageLocation !== undefined) updates.storage_location = params.storageLocation;
      if (params.sku !== undefined) updates.sku = params.sku;
      if (params.photoUrl !== undefined) updates.photo_url = params.photoUrl;
      if (params.isActive !== undefined) updates.is_active = params.isActive;

      const { data, error } = await supabase
        .from('property_inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-count', params.propertyId] });
      toast({ title: 'Item updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update item', description: error.message, variant: 'destructive' });
    },
  });
}

interface LogInventoryTransactionParams {
  itemId: string;
  propertyId: string;
  transactionType: 'received' | 'used' | 'adjustment' | 'returned' | 'disposed';
  quantity: number; // caller is responsible for sign
  unitCost?: number;
  linkedProjectId?: string;
  linkedWorkOrderId?: string;
  referenceNumber?: string;
  vendor?: string;
  notes?: string;
  transactionDate?: string;
}

export function useLogInventoryTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogInventoryTransactionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert({
          item_id: params.itemId,
          property_id: params.propertyId,
          transaction_type: params.transactionType,
          quantity: params.quantity,
          unit_cost: params.unitCost ?? null,
          linked_project_id: params.linkedProjectId ?? null,
          linked_work_order_id: params.linkedWorkOrderId ?? null,
          reference_number: params.referenceNumber ?? null,
          vendor: params.vendor ?? null,
          notes: params.notes ?? null,
          transaction_date: params.transactionDate ?? new Date().toISOString().slice(0, 10),
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions', params.itemId] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-count', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-consumption', params.propertyId] });
      toast({ title: 'Stock updated' });

      // Low stock warning
      const { data: item } = await supabase
        .from('property_inventory_items')
        .select('name, current_quantity, minimum_quantity')
        .eq('id', params.itemId)
        .single();

      if (item && item.current_quantity <= item.minimum_quantity) {
        toast({
          title: `Low stock alert: ${item.name}`,
          description: `Only ${item.current_quantity} ${item.current_quantity === 1 ? 'unit' : 'units'} remaining (min: ${item.minimum_quantity})`,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to log transaction', description: error.message, variant: 'destructive' });
    },
  });
}
