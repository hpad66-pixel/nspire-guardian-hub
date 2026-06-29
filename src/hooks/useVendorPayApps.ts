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
