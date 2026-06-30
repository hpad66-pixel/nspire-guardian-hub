import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';
import { toast } from 'sonner';

const db = supabase as any;
const BUCKET = 'project-artifacts';

export interface PayAppAttachment {
  id: string;
  pay_app_id: string;
  label: string;
  bucket: string;
  storage_path: string;
  kind: 'lien_conditional' | 'lien_unconditional' | 'support' | 'other';
  content_type: string | null;
  sort_order: number;
}

export function usePayAppAttachments(payAppId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['pay-app-attachments', payAppId] });

  const list = useQuery<PayAppAttachment[]>({
    queryKey: ['pay-app-attachments', payAppId],
    enabled: !!payAppId,
    queryFn: async () => {
      const { data, error } = await db.from('pay_app_attachments').select('*').eq('pay_app_id', payAppId).order('sort_order');
      if (error) throw error;
      return (data ?? []) as PayAppAttachment[];
    },
  });

  const add = useMutation({
    mutationFn: async ({ file, label, kind }: { file: File; label?: string; kind?: PayAppAttachment['kind'] }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error('No workspace for current user');
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${tenant_id}/${payAppId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const nextOrder = (list.data?.reduce((m, a) => Math.max(m, a.sort_order), 0) ?? 0) + 1;
      const { error } = await db.from('pay_app_attachments').insert({
        pay_app_id: payAppId, label: label || file.name.replace(/\.[^.]+$/, ''),
        bucket: BUCKET, storage_path: path, kind: kind ?? 'support',
        content_type: file.type || null, sort_order: nextOrder, created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || 'Upload failed'),
  });

  const remove = useMutation({
    mutationFn: async (att: PayAppAttachment) => {
      await supabase.storage.from(att.bucket).remove([att.storage_path]).catch(() => {});
      const { error } = await db.from('pay_app_attachments').delete().eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || 'Could not remove'),
  });

  // Persist a new order (array of ids in the desired order).
  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, i) => db.from('pay_app_attachments').update({ sort_order: i + 1 }).eq('id', id)));
    },
    onSuccess: invalidate,
  });

  return { ...list, add, remove, reorder };
}
