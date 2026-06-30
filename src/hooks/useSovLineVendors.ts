import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// Read/write the vendor (commitment) tag on individual SOV / G703 line items.
export function useSovLineVendors(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<Record<string, string | null>>({
    queryKey: ['sov-line-vendors', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from('sov_line_items').select('id, commitment_id').eq('project_id', projectId);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const r of (data ?? [])) map[r.id] = r.commitment_id ?? null;
      return map;
    },
  });

  const setVendor = useMutation({
    mutationFn: async ({ sovLineItemId, commitmentId }: { sovLineItemId: string; commitmentId: string | null }) => {
      const { error } = await db.from('sov_line_items').update({ commitment_id: commitmentId }).eq('id', sovLineItemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sov-line-vendors', projectId] });
      qc.invalidateQueries({ queryKey: ['vendor-reconciliation'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not tag the line'),
  });

  return { map: list.data ?? {}, setVendor };
}
