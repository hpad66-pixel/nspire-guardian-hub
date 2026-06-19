import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContractInvoice {
  id: string;
  contract_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  retainage: number;
  net_due: number | null;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  notes: string | null;
  // Added by 20260618120000_financial_ledger_payments
  invoice_kind: 'invoice' | 'pay_app';
  pay_app_no: number | null;
  change_order_id: string | null;
  artifact_id: string | null;
  created_at: string;
}

export interface ContractChangeOrder {
  id: string;
  contract_id: string;
  co_number: string | null;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'voided';
  co_date: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContractPayment {
  id: string;
  contract_id: string;
  payment_date: string;
  amount: number;
  reference: string | null;
  payment_method: string | null;
  notes: string | null;
  // Added by 20260618120000_financial_ledger_payments
  direction: 'received' | 'paid';
  invoice_id: string | null;
  change_order_id: string | null;
  artifact_id: string | null;
  created_at: string;
}

/** One row of the unified AR/AP ledger (financial_ledger view). */
export interface LedgerEntry {
  ledger_id: string;
  project_id: string;
  contract_id: string;
  contract_number: string | null;
  contract_title: string;
  contract_type: string;
  direction: 'receivable' | 'payable';
  entry_type: 'invoice' | 'pay_app' | 'change_order' | 'payment';
  entry_date: string | null;
  party_name: string | null;
  reference: string | null;
  description: string | null;
  amount: number;
  status: string | null;
  invoice_id: string | null;
  change_order_id: string | null;
  artifact_id: string | null;
  created_at: string;
}

/** Per-invoice net-due vs paid-to-date (contract_invoice_balances view). */
export interface InvoiceBalance {
  invoice_id: string;
  contract_id: string;
  project_id: string;
  invoice_number: string | null;
  invoice_kind: 'invoice' | 'pay_app';
  pay_app_no: number | null;
  invoice_date: string | null;
  status: string;
  amount: number;
  retainage: number;
  net_due: number | null;
  paid_to_date: number;
  balance_due: number;
  payment_count: number;
}

async function getTenantId(): Promise<string> {
  const { data, error } = await supabase.from('workspaces').select('id').limit(1).single();
  if (error || !data) throw new Error('Could not resolve workspace/tenant');
  return data.id;
}

export function useContractInvoices(contractId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['contract_invoices', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_invoices')
        .select('*')
        .eq('contract_id', contractId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractInvoice[];
    },
    enabled: !!contractId,
  });

  const create = useMutation({
    mutationFn: async (row: Partial<ContractInvoice> & { contract_id: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('contract_invoices')
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_invoices', contractId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: Partial<ContractInvoice> & { id: string }) => {
      const { error } = await supabase.from('contract_invoices').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_invoices', contractId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_invoices', contractId] }),
  });

  return { ...list, create, update, remove };
}

export function useContractChangeOrders(contractId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['contract_change_orders', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_change_orders')
        .select('*')
        .eq('contract_id', contractId)
        .order('co_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractChangeOrder[];
    },
    enabled: !!contractId,
  });

  const create = useMutation({
    mutationFn: async (row: Partial<ContractChangeOrder> & { contract_id: string; description: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('contract_change_orders')
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_change_orders', contractId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: Partial<ContractChangeOrder> & { id: string }) => {
      const { error } = await supabase.from('contract_change_orders').update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_change_orders', contractId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_change_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract_change_orders', contractId] }),
  });

  return { ...list, create, update, remove };
}

export function useContractPayments(contractId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['contract_payments', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_payments')
        .select('*')
        .eq('contract_id', contractId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractPayment[];
    },
    enabled: !!contractId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['contract_payments', contractId] });
    qc.invalidateQueries({ queryKey: ['financial_ledger'] });
    qc.invalidateQueries({ queryKey: ['contract_invoice_balances'] });
    qc.invalidateQueries({ queryKey: ['contract_invoices'] });
  };

  const create = useMutation({
    mutationFn: async (
      row: Partial<ContractPayment> & { contract_id: string; payment_date: string; amount: number },
    ) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('contract_payments')
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...list, create, remove };
}

/**
 * Unified project ledger (AR + AP) from the financial_ledger view.
 * One row per invoice / pay app / change order / payment across every contract
 * on the project. RLS-scoped to the caller's tenant via the view.
 */
export function useProjectLedger(projectId: string) {
  return useQuery({
    queryKey: ['financial_ledger', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_ledger')
        .select('*')
        .eq('project_id', projectId)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LedgerEntry[];
    },
  });
}

/** Per-invoice balances for a project (net due vs paid-to-date). */
export function useInvoiceBalances(projectId: string) {
  return useQuery({
    queryKey: ['contract_invoice_balances', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_invoice_balances')
        .select('*')
        .eq('project_id', projectId)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvoiceBalance[];
    },
  });
}
