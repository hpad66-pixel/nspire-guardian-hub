import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { toDateOnly } from '@/lib/date';

export type ObligationFrequency = 'one_time' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface PermitObligation {
  id: string;
  project_id: string;
  title: string;
  permit_ref: string | null;
  agency: string | null;
  description: string | null;
  frequency: ObligationFrequency;
  next_due_date: string | null;
  responsible: string | null;
  status: 'open' | 'complete' | 'waived';
  last_completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export const FREQ_LABEL: Record<ObligationFrequency, string> = {
  one_time: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Semi-annual', annual: 'Annual',
};

// Roll a recurring due date forward by its frequency.
export function advanceDue(iso: string, freq: ObligationFrequency): string | null {
  const d = new Date(iso + 'T00:00:00');
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'semi_annual') d.setMonth(d.getMonth() + 6);
  else if (freq === 'annual') d.setFullYear(d.getFullYear() + 1);
  else return null;
  return toDateOnly(d);
}

const table = () => supabase.from('permit_obligations' as never) as any;

export function usePermitObligations(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['permit-obligations', projectId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as PermitObligation[];
      const { data, error } = await table().select('*').eq('project_id', projectId).order('next_due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PermitObligation[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<PermitObligation> & { title: string }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await table().insert({
        project_id: projectId, title: input.title, permit_ref: input.permit_ref ?? null, agency: input.agency ?? null,
        description: input.description ?? null, frequency: input.frequency ?? 'one_time', next_due_date: input.next_due_date ?? null,
        responsible: input.responsible ?? null, status: 'open', created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Obligation added'); },
    onError: (e: Error) => toast.error(`Couldn't add: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<PermitObligation>) => {
      const { error } = await table().update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't update: ${e.message}`),
  });

  // Mark a due obligation done. Recurring → roll the date forward and stay open;
  // one-time → mark complete.
  const complete = useMutation({
    mutationFn: async (o: PermitObligation) => {
      const today = toDateOnly(new Date());
      const next = o.frequency !== 'one_time' && o.next_due_date ? advanceDue(o.next_due_date, o.frequency) : null;
      const patch = next
        ? { last_completed_at: today, next_due_date: next, status: 'open', updated_at: new Date().toISOString() }
        : { last_completed_at: today, status: 'complete', updated_at: new Date().toISOString() };
      const { error } = await table().update(patch).eq('id', o.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Marked done'); },
    onError: (e: Error) => toast.error(`Couldn't update: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await table().delete().eq('id', id); if (error) throw error; },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't remove: ${e.message}`),
  });

  return { ...list, create, update, complete, remove };
}
