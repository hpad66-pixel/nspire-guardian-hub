import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Vendor-built AIA pay-app submissions (distinct from the vendor_submissions
// ingestion queue). Table not in generated types yet → (supabase as any).
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
  lines: any[];
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

// GC mints a submission token for a vendor; returns the token for the magic link.
export function useRequestVendorPayApp(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commitmentId, vendorName, vendorEmail }: { commitmentId?: string | null; vendorName?: string; vendorEmail?: string }) => {
      const token = crypto.randomUUID().replace(/-/g, '');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db.from('vendor_payapp_submissions').insert({
        project_id: projectId, commitment_id: commitmentId || null, token,
        vendor_name: vendorName || null, vendor_email: vendorEmail || null,
        status: 'requested', created_by: user?.id ?? null,
      });
      if (error) throw error;
      return token as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-payapps', projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not create link'),
  });
}

// Approve a submission and turn it into a draft commitment invoice; returns the
// invoice id (or null if no commitment is linked). Stores the link back.
export function useConvertVendorPayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sub, projectId }: { sub: VendorPayApp; projectId: string }): Promise<string | null> => {
      if (!sub.commitment_id) { // no commitment → just approve, no invoice
        await db.from('vendor_payapp_submissions').update({ status: 'approved' }).eq('id', sub.id);
        return null;
      }
      const { data: ws } = await db.rpc('get_my_workspace_id');
      const { data: inv, error } = await db.from('commitment_invoices').insert({
        tenant_id: ws,
        commitment_id: sub.commitment_id,
        invoice_no: `SUBAPP-${sub.app_no ?? sub.id.slice(0, 6)}`,
        period_end: sub.period_to ?? new Date().toISOString().slice(0, 10),
        status: 'draft',
        submitted_amount: Number(sub.current_due ?? 0),
        retainage_held: Number(sub.retainage_amount ?? 0),
      }).select('id').single();
      if (error) throw error;
      await db.from('vendor_payapp_submissions').update({ status: 'approved', commitment_invoice_id: inv.id }).eq('id', sub.id);
      return inv.id as string;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] });
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not create invoice'),
  });
}

// Delete a vendor submission AND clean up what it spawned: its draft commitment
// invoice (which cascades to the invoice lines + the unconditional waiver linked
// to it). A paid invoice (with recorded payments) is RESTRICT-protected by the DB,
// so we keep it and report that.
export function useDeleteVendorPayApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }): Promise<{ keptInvoice: boolean }> => {
      const { data: sub } = await db.from('vendor_payapp_submissions').select('commitment_invoice_id').eq('id', id).maybeSingle();
      let keptInvoice = false;
      if (sub?.commitment_invoice_id) {
        const { error: invErr } = await db.from('commitment_invoices').delete().eq('id', sub.commitment_invoice_id);
        if (invErr) {
          if (/foreign key|violates|restrict/i.test(invErr.message)) keptInvoice = true; // has payments → protected
          else throw invErr;
        }
      }
      const { error } = await db.from('vendor_payapp_submissions').delete().eq('id', id);
      if (error) throw error;
      return { keptInvoice };
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] });
      qc.invalidateQueries({ queryKey: ['commitment-invoices'] });
      qc.invalidateQueries({ queryKey: ['lien-releases', v.projectId] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not delete'),
  });
}

export function useUpdateVendorPayAppStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string; projectId: string }) => {
      const { error } = await db.from('vendor_payapp_submissions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['vendor-payapps', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not update'),
  });
}
