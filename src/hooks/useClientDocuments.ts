import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Files the contractor shares to the client portal. Table isn't in generated
// types yet → (supabase as any). Public download URLs via daily-report-files.
const db = supabase as any;

export interface ClientDocument {
  id: string;
  project_id: string;
  name: string;
  url: string;
  category: string | null;
  size_bytes: number | null;
  created_at: string;
}

export function useClientDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['client-documents', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ClientDocument[]> => {
      const { data, error } = await db.from('client_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientDocument[];
    },
  });
}

export function useUploadClientDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, projectId, category }: { file: File; projectId: string; category?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop() || 'bin';
      const path = `client-docs/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('daily-report-files').upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const url = supabase.storage.from('daily-report-files').getPublicUrl(path).data.publicUrl;
      const { error } = await db.from('client_documents').insert({
        project_id: projectId, name: file.name, url, category: category || null, size_bytes: file.size, created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['client-documents', v.projectId] }); toast.success('Document shared'); },
    onError: (e: Error) => toast.error(e.message || 'Upload failed'),
  });
}

export function useDeleteClientDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await db.from('client_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['client-documents', v.projectId] }); toast.success('Document removed'); },
    onError: (e: Error) => toast.error(e.message || 'Could not remove'),
  });
}
