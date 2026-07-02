import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export { buildBillableLines } from '@/lib/consulting/billing';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export interface ConsultingInvoice {
  id: string;
  tenant_id: string;
  project_id: string;
  invoice_no: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingInvoiceLine {
  id: string;
  invoice_id: string;
  scope_id: string | null;
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
  sort_order: number;
}

export interface ConsultingInvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  received_date: string;
  method: string | null;
  note: string | null;
}

export interface NewInvoiceLine {
  scope_id: string | null;
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

const invoices = () => supabase.from('consulting_invoices' as never) as any;
const lines = () => supabase.from('consulting_invoice_lines' as never) as any;
const payments = () => supabase.from('consulting_invoice_payments' as never) as any;
const scopes = () => supabase.from('project_scopes' as never) as any;

export function useConsultingInvoices(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['consulting-invoices', projectId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as ConsultingInvoice[];
      const { data, error } = await invoices().select('*').eq('project_id', projectId).order('invoice_no', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsultingInvoice[];
    },
    enabled: !!projectId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['consulting-invoices', projectId] });
    qc.invalidateQueries({ queryKey: ['project-scopes', projectId] });
  };

  const create = useMutation({
    mutationFn: async (input: { issue_date: string; due_date: string | null; notes: string | null; lines: NewInvoiceLine[] }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const nextNo = (list.data?.reduce((m, i) => Math.max(m, i.invoice_no), 0) ?? 0) + 1;
      const subtotal = input.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

      const { data: inv, error } = await invoices().insert({
        project_id: projectId,
        invoice_no: nextNo,
        status: 'draft',
        issue_date: input.issue_date,
        due_date: input.due_date,
        notes: input.notes,
        subtotal,
        total: subtotal,
        created_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;

      if (input.lines.length) {
        const rows = input.lines.map((l, i) => ({
          invoice_id: inv.id,
          scope_id: l.scope_id,
          description: l.description,
          fee_amount: l.fee_amount,
          pct_prev: l.pct_prev,
          pct_this: l.pct_this,
          amount: l.amount,
          sort_order: i,
        }));
        const { error: le } = await lines().insert(rows);
        if (le) throw le;
      }
      return inv as ConsultingInvoice;
    },
    onSuccess: () => { invalidate(); toast.success('Invoice created'); },
    onError: (e: Error) => toast.error(`Couldn't create invoice: ${e.message}`),
  });

  // Finalizing (draft -> sent) locks in billed progress on each linked scope so
  // the next invoice bills only the new delta.
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      if (status === 'sent') {
        const { data: ls } = await lines().select('scope_id, pct_this').eq('invoice_id', id);
        for (const l of (ls ?? [])) {
          if (l.scope_id) await scopes().update({ pct_billed: l.pct_this }).eq('id', l.scope_id);
        }
      }
      const { error } = await invoices().update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Couldn't update invoice: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await invoices().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Invoice deleted'); },
    onError: (e: Error) => toast.error(`Couldn't delete invoice: ${e.message}`),
  });

  return { ...list, create, setStatus, remove };
}

export function useInvoiceDetail(invoiceId: string | null | undefined) {
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['consulting-invoice-detail', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const [{ data: inv }, { data: ls }, { data: ps }] = await Promise.all([
        invoices().select('*').eq('id', invoiceId).single(),
        lines().select('*').eq('invoice_id', invoiceId).order('sort_order', { ascending: true }),
        payments().select('*').eq('invoice_id', invoiceId).order('received_date', { ascending: true }),
      ]);
      return {
        invoice: inv as ConsultingInvoice,
        lines: (ls ?? []) as ConsultingInvoiceLine[],
        payments: (ps ?? []) as ConsultingInvoicePayment[],
      };
    },
    enabled: !!invoiceId,
  });

  const addPayment = useMutation({
    mutationFn: async (input: { amount: number; received_date: string; method: string | null; note: string | null }) => {
      if (!invoiceId) throw new Error('No invoice');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await payments().insert({ invoice_id: invoiceId, ...input, created_by: auth?.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consulting-invoice-detail', invoiceId] }); toast.success('Payment recorded'); },
    onError: (e: Error) => toast.error(`Couldn't record payment: ${e.message}`),
  });

  return { ...detail, addPayment };
}
