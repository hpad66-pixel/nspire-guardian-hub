import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    mutationFn: async (input: RecordPaidInvoiceInput): Promise<{ paidToSubs: number }> => {
      const amount = Number(input.amount) || 0;
      if (amount <= 0) throw new Error('Amount must be greater than 0');
      // One atomic transaction (invoice + lien + payment + mark paid), returns
      // the project's new paid-to-subs so the user sees the number move.
      const { data, error } = await db.rpc('record_paid_commitment_invoice', {
        p_commitment_id: input.commitmentId,
        p_invoice_no: input.invoiceNo,
        p_amount: amount,
        p_paid_date: input.paidDate,
        p_reference: input.reference ?? null,
        p_vendor_name: input.vendorName ?? null,
      });
      if (error) throw error;
      return { paidToSubs: Number((data as any)?.paid_to_subs ?? 0) };
    },
    onSuccess: (res, v) => {
      qc.invalidateQueries({ queryKey: ['commitment-invoices', v.commitmentId] });
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
      qc.invalidateQueries({ queryKey: ['commitment-payments'] });
      qc.invalidateQueries({ queryKey: ['project-financials'] });
      qc.invalidateQueries({ queryKey: ['commitment-totals'] });
      qc.invalidateQueries({ queryKey: ['margin', v.projectId] });
      const fmt = `$${res.paidToSubs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      toast.success(`Recorded. Paid-to-subs is now ${fmt}.`);
    },
    onError: (e: Error) => toast.error(e.message || 'Could not record the paid invoice'),
  });
}
