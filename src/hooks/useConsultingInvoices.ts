import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { requireTenantId } from '@/lib/tenant';
import {
  allocatePaymentsByProposal,
  buildConsultingLedger,
  type ConsultingLedgerEntry,
} from '@/lib/consulting/billing';

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
  subject: string | null;
  payment_terms: string | null;
  po_number: string | null;
  bill_to_name: string | null;
  bill_to_company: string | null;
  bill_to_email: string | null;
  bill_to_phone: string | null;
  bill_to_address: string | null;
  bill_to_city: string | null;
  bill_to_state: string | null;
  bill_to_postal: string | null;
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
  proposal_id?: string | null;
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
  proposal_id?: string | null;
  description: string;
  fee_amount: number;
  pct_prev: number;
  pct_this: number;
  amount: number;
}

export interface InvoiceBillTo {
  bill_to_name?: string | null;
  bill_to_company?: string | null;
  bill_to_email?: string | null;
  bill_to_phone?: string | null;
  bill_to_address?: string | null;
  bill_to_city?: string | null;
  bill_to_state?: string | null;
  bill_to_postal?: string | null;
}

export interface InvoiceHeaderInput extends InvoiceBillTo {
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  subject?: string | null;
  payment_terms?: string | null;
  po_number?: string | null;
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
    qc.invalidateQueries({ queryKey: ['consulting-ar-ledger', projectId] });
    qc.invalidateQueries({ queryKey: ['consulting-proposal-billing', projectId] });
  };

  const create = useMutation({
    mutationFn: async (input: InvoiceHeaderInput & { lines: NewInvoiceLine[] }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const tenant_id = await requireTenantId(auth.user?.id);
      const nextNo = (list.data?.reduce((m, i) => Math.max(m, i.invoice_no), 0) ?? 0) + 1;
      const subtotal = input.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

      const { data: inv, error } = await invoices().insert({
        tenant_id,
        project_id: projectId,
        invoice_no: nextNo,
        status: 'draft',
        issue_date: input.issue_date,
        due_date: input.due_date,
        notes: input.notes,
        subject: input.subject ?? null,
        payment_terms: input.payment_terms ?? null,
        po_number: input.po_number ?? null,
        bill_to_name: input.bill_to_name ?? null,
        bill_to_company: input.bill_to_company ?? null,
        bill_to_email: input.bill_to_email ?? null,
        bill_to_phone: input.bill_to_phone ?? null,
        bill_to_address: input.bill_to_address ?? null,
        bill_to_city: input.bill_to_city ?? null,
        bill_to_state: input.bill_to_state ?? null,
        bill_to_postal: input.bill_to_postal ?? null,
        subtotal,
        total: subtotal,
        created_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;

      if (input.lines.length) {
        const rows = input.lines.map((l, i) => ({
          tenant_id,
          invoice_id: inv.id,
          scope_id: l.scope_id,
          proposal_id: l.proposal_id ?? null,
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

  const update = useMutation({
    mutationFn: async (input: InvoiceHeaderInput & { id: string; lines: NewInvoiceLine[]; status?: InvoiceStatus }) => {
      const inv = (list.data ?? []).find((i) => i.id === input.id);
      if (inv && inv.status !== 'draft') {
        throw new Error('Only draft invoices can be fully edited. Void and recreate, or record a payment.');
      }
      const subtotal = input.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const tenant_id = await requireTenantId();
      const { error } = await invoices().update({
        issue_date: input.issue_date,
        due_date: input.due_date,
        notes: input.notes,
        subject: input.subject ?? null,
        payment_terms: input.payment_terms ?? null,
        po_number: input.po_number ?? null,
        bill_to_name: input.bill_to_name ?? null,
        bill_to_company: input.bill_to_company ?? null,
        bill_to_email: input.bill_to_email ?? null,
        bill_to_phone: input.bill_to_phone ?? null,
        bill_to_address: input.bill_to_address ?? null,
        bill_to_city: input.bill_to_city ?? null,
        bill_to_state: input.bill_to_state ?? null,
        bill_to_postal: input.bill_to_postal ?? null,
        subtotal,
        total: subtotal,
        updated_at: new Date().toISOString(),
      }).eq('id', input.id);
      if (error) throw error;

      // Replace lines atomically for draft edits.
      const { error: delErr } = await lines().delete().eq('invoice_id', input.id);
      if (delErr) throw delErr;
      if (input.lines.length) {
        const rows = input.lines.map((l, i) => ({
          tenant_id,
          invoice_id: input.id,
          scope_id: l.scope_id,
          proposal_id: l.proposal_id ?? null,
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
      return input.id;
    },
    onSuccess: (id) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['consulting-invoice-detail', id] });
      toast.success('Invoice updated');
    },
    onError: (e: Error) => toast.error(`Couldn't update invoice: ${e.message}`),
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
    onSuccess: (_d, vars) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['consulting-invoice-detail', vars.id] });
    },
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

  return { ...list, create, update, setStatus, remove };
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
      const tenant_id = await requireTenantId();
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await payments().insert({ invoice_id: invoiceId, tenant_id, ...input, created_by: auth?.user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consulting-invoice-detail', invoiceId] });
      qc.invalidateQueries({ queryKey: ['consulting-ar-ledger'] });
      qc.invalidateQueries({ queryKey: ['consulting-proposal-billing'] });
      qc.invalidateQueries({ queryKey: ['consulting-invoices'] });
      qc.invalidateQueries({ queryKey: ['consulting-financial-position'] });
      qc.invalidateQueries({ queryKey: ['consulting-cash-transactions'] });
      toast.success('Payment recorded');
    },
    onError: (e: Error) => toast.error(`Couldn't record payment: ${e.message}`),
  });

  return { ...detail, addPayment };
}

/**
 * Previously billed + previously paid amounts keyed by proposal_id for the
 * project (non-void invoices). Powers continuous proposal → invoice billing.
 */
export function useProposalBillingMaps(projectId: string | null | undefined, enabled = true) {
  const { data: invoices = [] } = useConsultingInvoices(projectId);
  const [billed, setBilled] = useState<Record<string, number>>({});
  const [paid, setPaid] = useState<Record<string, number>>({});
  const invoiceKey = (invoices ?? []).map((i) => `${i.id}:${i.status}:${i.total}`).join('|');

  useEffect(() => {
    if (!enabled || !projectId) return;
    let cancelled = false;

    (async () => {
      const active = (invoices ?? []).filter((i) => i.status !== 'void');
      if (active.length === 0) {
        if (!cancelled) {
          setBilled({});
          setPaid({});
        }
        return;
      }
      const ids = active.map((i) => i.id);
      const [{ data: lineRows }, { data: payRows }] = await Promise.all([
        lines().select('proposal_id, amount, invoice_id').in('invoice_id', ids),
        payments().select('invoice_id, amount').in('invoice_id', ids),
      ]);
      if (cancelled) return;

      const nextBilled: Record<string, number> = {};
      for (const row of lineRows ?? []) {
        if (!row.proposal_id) continue;
        nextBilled[row.proposal_id] =
          Math.round(((nextBilled[row.proposal_id] ?? 0) + (Number(row.amount) || 0)) * 100) / 100;
      }
      const nextPaid = allocatePaymentsByProposal(lineRows ?? [], payRows ?? []);
      setBilled(nextBilled);
      setPaid(nextPaid);
    })();

    return () => { cancelled = true; };
  }, [enabled, projectId, invoiceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { billedByProposal: billed, paidByProposal: paid };
}

/** Running A/R ledger for consulting dashboards. */
export function useConsultingArLedger(projectId: string | null | undefined) {
  const { data: invoices = [], isLoading: invLoading } = useConsultingInvoices(projectId);

  const ledgerQuery = useQuery({
    queryKey: ['consulting-ar-ledger', projectId, (invoices ?? []).map((i) => i.id).join(',')],
    queryFn: async () => {
      if (!projectId) {
        return {
          entries: [] as ConsultingLedgerEntry[],
          totalInvoiced: 0,
          totalPaid: 0,
          openAr: 0,
        };
      }
      const active = (invoices ?? []).filter((i) => i.status !== 'void');
      if (active.length === 0) {
        return { entries: [], totalInvoiced: 0, totalPaid: 0, openAr: 0 };
      }
      const ids = active.map((i) => i.id);
      const [{ data: payRows }, { data: lineRows }] = await Promise.all([
        payments().select('invoice_id, amount').in('invoice_id', ids),
        lines().select('invoice_id, proposal_id, description').in('invoice_id', ids),
      ]);
      const entries = buildConsultingLedger(active, payRows ?? [], lineRows ?? []);
      // Drafts remain visible in the ledger but are not A/R until issued.
      const issuedEntries = entries.filter((entry) => entry.status === 'sent' || entry.status === 'paid');
      const totalInvoiced = issuedEntries.reduce((s, e) => s + e.total, 0);
      const totalPaid = entries.reduce((s, e) => s + e.paid, 0);
      return {
        entries,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        openAr: Math.round(Math.max(0, totalInvoiced - totalPaid) * 100) / 100,
      };
    },
    enabled: !!projectId,
  });

  return {
    ...ledgerQuery,
    isLoading: invLoading || ledgerQuery.isLoading,
  };
}
