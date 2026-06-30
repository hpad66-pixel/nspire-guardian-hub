import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';
import { toast } from 'sonner';

const db = supabase as any;

export interface RecordPaidInvoiceInput {
  projectId: string;
  commitmentId: string;
  invoiceNo: string;
  amount: number;
  paidDate: string;       // yyyy-mm-dd
  method?: string;        // check | ach | wire | card | other
  reference?: string;
  vendorName?: string;
}

/**
 * Reconciliation: record a historical paid invoice in one shot — invoice + the
 * lien acknowledgment that the DB gate requires + the payment + mark paid. Use
 * this to reinstate a payment that actually happened (the cash already moved),
 * not to bill new work. The payment flows into paid_to_subs on the dashboard.
 */
export function useRecordPaidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaidInvoiceInput) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error('No workspace for current user');
      const { data: { user } } = await supabase.auth.getUser();
      const amount = Number(input.amount) || 0;
      if (amount <= 0) throw new Error('Amount must be greater than 0');

      // 1) the invoice (approved so a payment is allowed)
      const { data: inv, error: invErr } = await db.from('commitment_invoices').insert({
        tenant_id, commitment_id: input.commitmentId,
        invoice_no: input.invoiceNo, period_end: input.paidDate,
        status: 'approved', submitted_amount: amount, approved_amount: amount, retainage_held: 0,
      }).select('id').single();
      if (invErr) throw invErr;
      const invoiceId = (inv as any).id as string;

      // 2) the lien acknowledgment the DB gate requires (reconciliation record)
      const { error: lienErr } = await db.from('lien_releases').insert({
        tenant_id, project_id: input.projectId, direction: 'inbound',
        release_type: 'unconditional_progress', status: 'approved',
        commitment_invoice_id: invoiceId, amount, through_date: input.paidDate,
        claimant_name: input.vendorName ?? null,
        title: 'Reconciliation acknowledgment (historical payment)',
        created_by: user?.id ?? null,
      });
      if (lienErr) throw lienErr;

      // 3) the payment (passes the lien gate now)
      const { error: payErr } = await db.from('commitment_payments').insert({
        tenant_id, commitment_id: input.commitmentId, commitment_invoice_id: invoiceId,
        amount, paid_date: input.paidDate, method: input.method ?? 'other',
        reference: input.reference ?? null, notes: 'Reconciliation — reinstated payment',
        created_by: user?.id ?? null,
      });
      if (payErr) throw payErr;

      // 4) mark the invoice paid
      await db.from('commitment_invoices').update({ status: 'paid' }).eq('id', invoiceId);
      return invoiceId;
    },
    onSuccess: (_id, v) => {
      qc.invalidateQueries({ queryKey: ['commitment-invoices', v.commitmentId] });
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
      qc.invalidateQueries({ queryKey: ['commitment-payments'] });
      qc.invalidateQueries({ queryKey: ['project-financials'] });
      qc.invalidateQueries({ queryKey: ['commitment-totals'] });
      qc.invalidateQueries({ queryKey: ['margin', v.projectId] });
      toast.success('Recorded — invoice + payment created, dashboard updated.');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not record the paid invoice'),
  });
}
