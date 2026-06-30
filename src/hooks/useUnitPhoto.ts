import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'unit-photos';

export function unitPhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Upload a unit door photo and stamp units.photo_path. Returns the new path.
export function useSetUnitPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ unitId, file }: { unitId: string; file: File }) => {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `units/${unitId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
      if (upErr) throw upErr;
      const { error } = await (supabase as any).from('units').update({ photo_path: path }).eq('id', unitId);
      if (error) throw error;
      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      toast.success('Door photo saved');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save photo'),
  });
}
