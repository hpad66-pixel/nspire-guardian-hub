import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface PermitScan {
  id: string;
  tenant_id: string;
  project_id: string | null;
  property_id: string | null;
  client_id: string | null;
  project_permit_id: string | null;
  property_permit_id: string | null;
  document_id: string | null;
  photo_url: string;
  photo_path: string | null;
  mime_type: string | null;
  notation: string | null;
  ocr_extracted: Record<string, unknown> | null;
  ocr_raw_text: string | null;
  permit_number: string | null;
  description: string | null;
  department: string | null;
  trade: string | null;
  contractor: string | null;
  building: string | null;
  street_address: string | null;
  issued_on: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string | null; client_id: string | null } | null;
  client?: { id: string; name: string | null } | null;
  property?: { id: string; name: string | null } | null;
}

export type PermitScanInsert = {
  project_id?: string | null;
  property_id?: string | null;
  client_id?: string | null;
  project_permit_id?: string | null;
  property_permit_id?: string | null;
  document_id?: string | null;
  photo_url: string;
  photo_path?: string | null;
  mime_type?: string | null;
  notation?: string | null;
  ocr_extracted?: Record<string, unknown> | null;
  ocr_raw_text?: string | null;
  permit_number?: string | null;
  description?: string | null;
  department?: string | null;
  trade?: string | null;
  contractor?: string | null;
  building?: string | null;
  street_address?: string | null;
  issued_on?: string | null;
  status?: string;
};

const table = () => supabase.from('permit_scans' as never) as any;

export function usePermitScans(opts?: {
  projectId?: string | null;
  propertyId?: string | null;
  clientId?: string | null;
}) {
  const qc = useQueryClient();
  const key = ['permit-scans', opts?.projectId ?? 'all', opts?.propertyId ?? 'all', opts?.clientId ?? 'all'];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = table()
        .select(`
          *,
          project:project_id(id, name, client_id),
          client:client_id(id, name),
          property:property_id(id, name)
        `)
        .order('created_at', { ascending: false });
      if (opts?.projectId) q = q.eq('project_id', opts.projectId);
      if (opts?.propertyId) q = q.eq('property_id', opts.propertyId);
      if (opts?.clientId) q = q.eq('client_id', opts.clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PermitScan[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: PermitScanInsert) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await table()
        .insert({
          ...input,
          created_by: auth?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as PermitScan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permit-scans'] });
    },
    onError: (e: Error) => toast.error(`Couldn't save permit scan: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<PermitScanInsert>) => {
      const { data, error } = await table()
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as PermitScan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permit-scans'] });
      toast.success('Notation updated');
    },
    onError: (e: Error) => toast.error(`Couldn't update scan: ${e.message}`),
  });

  return { ...list, create, update };
}

/** Upload a prepared blob to the permit-scans bucket and return public URL + path. */
export async function uploadPermitScanFile(
  blob: Blob,
  fileName: string,
  folder: string,
): Promise<{ photoUrl: string; photoPath: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${auth?.user?.id ?? 'anon'}/${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from('permit-scans').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('permit-scans').getPublicUrl(path);
  return { photoUrl: urlData.publicUrl, photoPath: path };
}
