import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireTenantId } from '@/lib/tenant';
import { toast } from 'sonner';
import { coerceFinancialPosition, type ConsultingFinancialPosition } from '@/lib/consulting/financialPosition';
import type { ConsultingInvoice, ConsultingInvoicePayment } from './useConsultingInvoices';

export type ConsultingCostType = 'subcontractor' | 'consultant' | 'reimbursable' | 'internal_labor' | 'other';
export type ConsultingCostStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'partially_paid' | 'paid' | 'void';
export type ConsultingCostSource = 'vendor_upload' | 'vendor_portal' | 'admin_on_behalf' | 'historical_exception';

export interface ConsultingCost {
  id: string;
  tenant_id: string;
  project_id: string;
  proposal_id: string | null;
  vendor_org_id: string | null;
  vendor_name: string;
  cost_type: ConsultingCostType;
  reference_no: string | null;
  description: string | null;
  bill_date: string;
  due_date: string | null;
  amount: number;
  status: ConsultingCostStatus;
  attachment_path: string | null;
  invoice_artifact_id: string | null;
  source_kind: ConsultingCostSource;
  source_status: 'draft' | 'vendor_attested' | 'received' | 'verified' | 'rejected';
  source_note: string | null;
  is_legacy_exception: boolean;
  submitted_at: string | null;
  vendor_attested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultingCostPayment {
  id: string;
  tenant_id: string;
  cost_id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  reference: string | null;
  note: string | null;
  proof_artifact_id: string | null;
  payment_status: 'historical_unverified' | 'recorded' | 'reconciled' | 'void';
  idempotency_key: string | null;
  recorded_by: string | null;
  reconciled_at: string | null;
  reconciled_by: string | null;
  reconciliation_note: string | null;
  created_at: string;
}

export interface ConsultingInvoiceRequest {
  id: string;
  project_id: string;
  organization_id: string;
  recipient_email: string;
  message: string | null;
  due_date: string | null;
  status: 'open' | 'submitted' | 'expired' | 'revoked';
  expires_at: string;
  submitted_at: string | null;
  consulting_cost_id: string | null;
  created_at: string;
}

export interface ConsultingCostWithPayments extends ConsultingCost {
  payments: ConsultingCostPayment[];
  paid_to_date: number;
  balance_due: number;
}

export interface ConsultingReceipt extends ConsultingInvoicePayment {
  invoice_no: number;
  invoice_status: ConsultingInvoice['status'];
  invoice_subject: string | null;
}

export interface ConsultingFinancialCloseout {
  id: string;
  project_id: string;
  approved_revenue: number;
  invoiced_revenue: number;
  cash_received: number;
  total_costs: number;
  cash_paid: number;
  net_profit: number;
  margin_pct: number;
  notes: string | null;
  reconciled_at: string;
  closed_at: string;
}

// Generated database types intentionally lag the forward migration in this branch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const costTable = () => supabase.from('consulting_costs' as never) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const costPaymentTable = () => supabase.from('consulting_cost_payments' as never) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoiceTable = () => supabase.from('consulting_invoices' as never) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const invoicePaymentTable = () => supabase.from('consulting_invoice_payments' as never) as any;

const money2 = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100;

export function useConsultingCosts(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['consulting-costs', projectId];
  const list = useQuery<ConsultingCostWithPayments[]>({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async () => {
      const { data: costs, error } = await costTable()
        .select('*').eq('project_id', projectId).order('bill_date', { ascending: false });
      if (error) throw error;
      const ids = (costs ?? []).map((row: ConsultingCost) => row.id);
      const { data: paymentRows, error: paymentError } = ids.length
        ? await costPaymentTable().select('*').in('cost_id', ids).order('paid_date', { ascending: false })
        : { data: [], error: null };
      if (paymentError) throw paymentError;
      const byCost = new Map<string, ConsultingCostPayment[]>();
      for (const raw of paymentRows ?? []) {
        const payment = { ...raw, amount: money2(raw.amount) } as ConsultingCostPayment;
        byCost.set(payment.cost_id, [...(byCost.get(payment.cost_id) ?? []), payment]);
      }
      return (costs ?? []).map((raw: ConsultingCost) => {
        const payments = (byCost.get(raw.id) ?? []).filter((payment) => payment.payment_status !== 'void');
        const amount = money2(raw.amount);
        const paid = money2(payments.reduce((sum, payment) => sum + payment.amount, 0));
        return { ...raw, amount, payments, paid_to_date: paid, balance_due: money2(Math.max(0, amount - paid)) };
      });
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ['consulting-financial-position', projectId] });
    qc.invalidateQueries({ queryKey: ['consulting-cash-transactions', projectId] });
  };

  const create = useMutation({
    mutationFn: async (input: Omit<Partial<ConsultingCost>, 'id' | 'tenant_id' | 'project_id'> & {
      vendor_name: string; cost_type: ConsultingCostType; bill_date: string; amount: number;
    }) => {
      if (!projectId) throw new Error('No project selected.');
      if (!input.vendor_name.trim()) throw new Error('Choose or enter the vendor/subcontractor.');
      if (!(Number(input.amount) > 0)) throw new Error('Enter a cost greater than zero.');
      const tenant_id = await requireTenantId();
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await costTable().insert({
        ...input,
        vendor_name: input.vendor_name.trim(),
        amount: money2(input.amount),
        tenant_id,
        project_id: projectId,
        created_by: auth.user?.id ?? null,
        status: input.status ?? 'draft',
      }).select().single();
      if (error) throw error;
      return data as ConsultingCost;
    },
    onSuccess: () => { invalidate(); toast.success('Vendor invoice draft created'); },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'void' }) => {
      const { error } = await costTable().update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('approve_consulting_cost' as never, { p_cost_id: id } as never);
      if (error) throw error;
      return data as unknown as ConsultingCost;
    },
    onSuccess: () => { invalidate(); toast.success('Invoice approved for payment'); },
    onError: (error: Error) => toast.error(error.message.replace(/^[A-Z_]+:\s*/, '')),
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('reject_consulting_cost' as never, { p_cost_id: id, p_reason: reason } as never);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Invoice returned to vendor'); },
    onError: (error: Error) => toast.error(error.message),
  });

  const addPayment = useMutation({
    mutationFn: async ({ costId, ...input }: {
      costId: string; amount: number; paid_date: string; method: string;
      reference: string; proof_artifact_id: string; idempotency_key: string; note?: string | null;
    }) => {
      if (!(Number(input.amount) > 0)) throw new Error('Enter a payment greater than zero.');
      const { data, error } = await supabase.rpc('record_consulting_cost_payment' as never, {
        p_cost_id: costId,
        p_amount: money2(input.amount),
        p_paid_date: input.paid_date,
        p_method: input.method,
        p_reference: input.reference,
        p_proof_artifact_id: input.proof_artifact_id,
        p_idempotency_key: input.idempotency_key,
        p_note: input.note ?? null,
      } as never);
      if (error) throw error;
      return data as unknown as ConsultingCostPayment;
    },
    onSuccess: () => { invalidate(); toast.success('Subcontractor payment recorded'); },
    onError: (error: Error) => toast.error(error.message),
  });

  const reconcilePayment = useMutation({
    mutationFn: async ({ paymentId, note }: { paymentId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('reconcile_consulting_cost_payment' as never, {
        p_payment_id: paymentId,
        p_note: note?.trim() || null,
      } as never);
      if (error) throw error;
      return data as unknown as ConsultingCostPayment;
    },
    onSuccess: () => { invalidate(); toast.success('Payment reconciled to bank evidence'); },
    onError: (error: Error) => toast.error(error.message),
  });

  return { ...list, create, setStatus, approve, reject, addPayment, reconcilePayment };
}

export function useConsultingInvoiceRequests(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['consulting-invoice-requests', projectId];
  const list = useQuery<ConsultingInvoiceRequest[]>({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('consulting_invoice_requests' as never)
        .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConsultingInvoiceRequest[];
    },
  });
  const requestInvoice = useMutation({
    mutationFn: async (input: {
      organizationId: string; email: string; recipientName?: string;
      dueDate?: string; message?: string;
    }) => {
      if (!projectId) throw new Error('No project selected.');
      const { data, error } = await supabase.functions.invoke('consulting-vendor-invoice', {
        body: {
          action: 'request', projectId, organizationId: input.organizationId,
          email: input.email, recipientName: input.recipientName,
          dueDate: input.dueDate || null, message: input.message || null,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Could not create invoice request');
      return data as { requestId: string; link: string; emailSent: boolean; deliveryError: string | null };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (error: Error) => toast.error(error.message),
  });
  return { ...list, requestInvoice };
}

export function useConsultingCashTransactions(projectId: string | null | undefined) {
  return useQuery<{ receipts: ConsultingReceipt[] }>({
    queryKey: ['consulting-cash-transactions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: invoices, error } = await invoiceTable()
        .select('id, invoice_no, status, subject').eq('project_id', projectId).neq('status', 'void');
      if (error) throw error;
      const invoiceMap = new Map<string, Pick<ConsultingInvoice, 'id' | 'invoice_no' | 'status' | 'subject'>>(
        ((invoices ?? []) as Array<Pick<ConsultingInvoice, 'id' | 'invoice_no' | 'status' | 'subject'>>)
          .map((invoice) => [invoice.id, invoice] as const),
      );
      const ids = [...invoiceMap.keys()];
      if (!ids.length) return { receipts: [] };
      const { data: paymentRows, error: paymentError } = await invoicePaymentTable()
        .select('*').in('invoice_id', ids).order('received_date', { ascending: false });
      if (paymentError) throw paymentError;
      return {
        receipts: (paymentRows ?? []).map((raw: ConsultingInvoicePayment) => {
          const invoice = invoiceMap.get(raw.invoice_id)!;
          return {
            ...raw,
            amount: money2(raw.amount),
            invoice_no: invoice.invoice_no,
            invoice_status: invoice.status,
            invoice_subject: invoice.subject,
          };
        }),
      };
    },
  });
}

export function useConsultingFinancialPosition(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const position = useQuery<ConsultingFinancialPosition | null>({
    queryKey: ['consulting-financial-position', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_consulting_financial_position' as never)
        .select('*').eq('project_id', projectId).maybeSingle();
      if (error) throw error;
      return data ? coerceFinancialPosition(data as Record<string, unknown>) : null;
    },
  });
  const closeout = useQuery<ConsultingFinancialCloseout | null>({
    queryKey: ['consulting-financial-closeout', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.from('consulting_financial_closeouts' as never)
        .select('*').eq('project_id', projectId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const raw = data as unknown as Record<string, unknown>;
      return { ...raw, net_profit: money2(raw.net_profit), margin_pct: Number(raw.margin_pct) || 0 } as unknown as ConsultingFinancialCloseout;
    },
  });
  const closeProject = useMutation({
    mutationFn: async (notes?: string) => {
      if (!projectId) throw new Error('No project selected.');
      const { data, error } = await supabase.rpc('close_consulting_project' as never, {
        p_project_id: projectId,
        p_notes: notes?.trim() || null,
      } as never);
      if (error) throw error;
      return data as unknown as ConsultingFinancialCloseout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consulting-financial-position', projectId] });
      qc.invalidateQueries({ queryKey: ['consulting-financial-closeout', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project reconciled and financially closed');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return { position, closeout, closeProject };
}
