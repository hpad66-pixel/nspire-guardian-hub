import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UtilityBill {
  id: string;
  property_id: string;
  utility_type: string;
  bill_period_start: string;
  bill_period_end: string;
  bill_date: string | null;
  due_date: string | null;
  amount: number;
  amount_paid: number | null;
  paid_at: string | null;
  consumption_value: number | null;
  consumption_unit: string | null;
  provider_name: string | null;
  account_number: string | null;
  document_url: string | null;
  document_name: string | null;
  notes: string | null;
  is_estimated: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtilityBillSummary {
  utility_type: string;
  month: string;
  total_amount: number;
  total_consumption: number | null;
  bill_count: number;
}

export interface UtilityYearOverYear {
  utility_type: string;
  year: number;
  annual_total: number;
}

export interface AllPropertiesUtilitySummary {
  property_id: string;
  property_name: string;
  total_units: number | null;
  ytd_total: number;
  cost_per_unit: number | null;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useUtilityBills(
  propertyId: string,
  filters?: { utilityType?: string; year?: number }
) {
  return useQuery({
    queryKey: ['utility-bills', propertyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('property_utility_bills')
        .select('*')
        .eq('property_id', propertyId)
        .order('bill_period_start', { ascending: false });

      if (filters?.utilityType) {
        query = query.eq('utility_type', filters.utilityType);
      }
      if (filters?.year) {
        query = query
          .gte('bill_period_start', `${filters.year}-01-01`)
          .lte('bill_period_start', `${filters.year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UtilityBill[];
    },
    enabled: !!propertyId,
  });
}

export function useUtilityBillSummary(propertyId: string, year: number) {
  return useQuery({
    queryKey: ['utility-bill-summary', propertyId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_utility_bill_summary' as any, {
        p_property_id: propertyId,
        p_year: year,
      }).throwOnError();

      // Fallback: client-side aggregation from raw bills
      if (error || !data) {
        const { data: bills, error: billsError } = await supabase
          .from('property_utility_bills')
          .select('utility_type, bill_period_start, amount, consumption_value')
          .eq('property_id', propertyId)
          .gte('bill_period_start', `${year}-01-01`)
          .lte('bill_period_start', `${year}-12-31`);

        if (billsError) throw billsError;

        const grouped: Record<string, UtilityBillSummary> = {};
        for (const bill of bills ?? []) {
          const month = bill.bill_period_start.slice(0, 7); // YYYY-MM
          const key = `${bill.utility_type}__${month}`;
          if (!grouped[key]) {
            grouped[key] = {
              utility_type: bill.utility_type,
              month,
              total_amount: 0,
              total_consumption: null,
              bill_count: 0,
            };
          }
          grouped[key].total_amount += bill.amount;
          grouped[key].bill_count += 1;
          if (bill.consumption_value != null) {
            grouped[key].total_consumption =
              (grouped[key].total_consumption ?? 0) + bill.consumption_value;
          }
        }
        return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
      }

      return data as UtilityBillSummary[];
    },
    enabled: !!propertyId && !!year,
  });
}

export function useUtilityYearOverYear(propertyId: string) {
  return useQuery({
    queryKey: ['utility-yoy', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_utility_bills')
        .select('utility_type, bill_period_start, amount')
        .eq('property_id', propertyId)
        .order('bill_period_start', { ascending: true });

      if (error) throw error;

      // Client-side year aggregation
      const grouped: Record<string, UtilityYearOverYear> = {};
      for (const bill of data ?? []) {
        const year = new Date(bill.bill_period_start).getFullYear();
        const key = `${bill.utility_type}__${year}`;
        if (!grouped[key]) {
          grouped[key] = { utility_type: bill.utility_type, year, annual_total: 0 };
        }
        grouped[key].annual_total += bill.amount;
      }
      return Object.values(grouped).sort((a, b) => a.year - b.year);
    },
    enabled: !!propertyId,
  });
}

export function useAllPropertiesUtilitySummary() {
  return useQuery({
    queryKey: ['all-properties-utility-summary'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const { data, error } = await supabase
        .from('property_utility_bills')
        .select('property_id, amount, bill_period_start, properties(id, name, total_units)')
        .gte('bill_period_start', `${currentYear}-01-01`)
        .lte('bill_period_start', `${currentYear}-12-31`);

      if (error) throw error;

      const grouped: Record<string, AllPropertiesUtilitySummary> = {};
      for (const row of data ?? []) {
        const prop = row.properties as any;
        if (!prop) continue;
        if (!grouped[prop.id]) {
          grouped[prop.id] = {
            property_id: prop.id,
            property_name: prop.name,
            total_units: prop.total_units,
            ytd_total: 0,
            cost_per_unit: null,
          };
        }
        grouped[prop.id].ytd_total += row.amount;
      }

      for (const summary of Object.values(grouped)) {
        if (summary.total_units && summary.total_units > 0) {
          summary.cost_per_unit = summary.ytd_total / summary.total_units;
        }
      }

      return Object.values(grouped).sort((a, b) => b.ytd_total - a.ytd_total);
    },
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

interface AddUtilityBillParams {
  propertyId: string;
  utilityType: string;
  billPeriodStart: string;
  billPeriodEnd: string;
  amount: number;
  consumptionValue?: number;
  consumptionUnit?: string;
  providerName?: string;
  accountNumber?: string;
  documentUrl?: string;
  documentName?: string;
  status?: string;
  notes?: string;
  billDate?: string;
  dueDate?: string;
  isEstimated?: boolean;
}

export function useAddUtilityBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddUtilityBillParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('property_utility_bills')
        .insert({
          property_id: params.propertyId,
          utility_type: params.utilityType,
          bill_period_start: params.billPeriodStart,
          bill_period_end: params.billPeriodEnd,
          amount: params.amount,
          consumption_value: params.consumptionValue ?? null,
          consumption_unit: params.consumptionUnit ?? null,
          provider_name: params.providerName ?? null,
          account_number: params.accountNumber ?? null,
          document_url: params.documentUrl ?? null,
          document_name: params.documentName ?? null,
          status: params.status ?? 'pending',
          notes: params.notes ?? null,
          bill_date: params.billDate ?? null,
          due_date: params.dueDate ?? null,
          is_estimated: params.isEstimated ?? false,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['utility-bills', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-bill-summary', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-yoy', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['all-properties-utility-summary'] });
      toast({ title: 'Bill added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add bill', description: error.message, variant: 'destructive' });
    },
  });
}

interface UpdateUtilityBillParams extends Partial<AddUtilityBillParams> {
  id: string;
  propertyId: string;
}

export function useUpdateUtilityBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId, ...params }: UpdateUtilityBillParams) => {
      const updates: Record<string, unknown> = {};
      if (params.utilityType !== undefined) updates.utility_type = params.utilityType;
      if (params.billPeriodStart !== undefined) updates.bill_period_start = params.billPeriodStart;
      if (params.billPeriodEnd !== undefined) updates.bill_period_end = params.billPeriodEnd;
      if (params.amount !== undefined) updates.amount = params.amount;
      if (params.consumptionValue !== undefined) updates.consumption_value = params.consumptionValue;
      if (params.consumptionUnit !== undefined) updates.consumption_unit = params.consumptionUnit;
      if (params.providerName !== undefined) updates.provider_name = params.providerName;
      if (params.accountNumber !== undefined) updates.account_number = params.accountNumber;
      if (params.documentUrl !== undefined) updates.document_url = params.documentUrl;
      if (params.documentName !== undefined) updates.document_name = params.documentName;
      if (params.status !== undefined) updates.status = params.status;
      if (params.notes !== undefined) updates.notes = params.notes;
      if (params.billDate !== undefined) updates.bill_date = params.billDate;
      if (params.dueDate !== undefined) updates.due_date = params.dueDate;
      if (params.isEstimated !== undefined) updates.is_estimated = params.isEstimated;

      const { data, error } = await supabase
        .from('property_utility_bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['utility-bills', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-bill-summary', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-yoy', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['all-properties-utility-summary'] });
      toast({ title: 'Bill updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update bill', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUtilityBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from('property_utility_bills')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['utility-bills', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-bill-summary', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['utility-yoy', params.propertyId] });
      queryClient.invalidateQueries({ queryKey: ['all-properties-utility-summary'] });
      toast({ title: 'Bill removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove bill', description: error.message, variant: 'destructive' });
    },
  });
}
