import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Vendor-built AIA pay-app submissions (distinct from the vendor_submissions
// ingestion queue). Table not in generated types yet → (supabase as any).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types intentionally lag this migration-backed table
const db = supabase as any;

export interface VendorPayApp {
  id: string;
  commitment_id: string | null;
  token: string;
  vendor_name: string | null;
  vendor_email: string | null;
  status: string;
  app_no: number | null;
  period_to: string | null;
  lines: Array<Record<string, unknown>>;
  retainage_pct: number | null;
  prior_payments: number | null;
  current_due: number | null;
  total_completed: number | null;
  retainage_amount: number | null;
  conditional_signed_name: string | null;
  conditional_signed_at: string | null;
  apas_waiver_ack: boolean | null;
  waiver_type: string | null;
  commitment_invoice_id: string | null;
  invoice_artifact_id: string | null;
  submitted_at: string | null;
  created_at: string;
}

export function useVendorPayApps(projectId: string | undefined) {
  return useQuery({
    queryKey: ['vendor-payapps', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<VendorPayApp[]> => {
      const { data, error } = await db.from('vendor_payapp_submissions').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as VendorPayApp[];
    },
  });
}

// Approve a submission and turn it into a draft commitment invoice; returns the
// invoice id (or null if no commitment is linked). Stores the link back.
export function useConvertVendorPayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sub }: { sub: VendorPayApp; projectId: string }): Promise<string | null> => {
      // Conversion is atomic in the database: it validates the signed pay app,
      // derives current-period (not cumulative) billing, creates the linked
      // draft invoice + approved lien evidence, and writes both backlinks.
      const { data: invoiceId, error } = await db.rpc('convert_vendor_payapp_to_commitment_invoice', {
        p_submission_id: sub.id,
      });
      if (error) throw error;
      if (!invoiceId) throw new Error('Vendor pay app conversion did not return an invoice');
      return invoiceId as string;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] });
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not create invoice'),
  });
}

// Remove only an unsubmitted request through a finance-authorized RPC. Submitted
// evidence remains immutable and must move through the review workflow.
export function useDeleteVendorPayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }): Promise<void> => {
      const { error } = await db.rpc('delete_vendor_payapp_request', { p_submission_id: id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete'),
  });
}

export function useUpdateVendorPayAppStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; projectId: string }) => {
      if (status !== 'void') throw new Error('Vendor invoice status is controlled by its workflow.');
      const { error } = await db.rpc('void_vendor_payapp_request', { p_submission_id: id });
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not update'),
  });
}
