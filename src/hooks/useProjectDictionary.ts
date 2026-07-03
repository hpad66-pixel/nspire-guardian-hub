import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DictionaryTerm {
  id: string;
  project_id: string;
  term: string;
  variants: string[];
  notes: string | null;
  created_at: string;
}

export type DictionaryInput = { term: string; variants?: string[]; notes?: string | null };

const table = () => supabase.from('project_dictionary' as never) as any;

export function useProjectDictionary(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['project-dictionary', projectId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as DictionaryTerm[];
      const { data, error } = await table().select('*').eq('project_id', projectId).order('term', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DictionaryTerm[];
    },
    enabled: !!projectId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-dictionary', projectId] });

  const create = useMutation({
    mutationFn: async (input: DictionaryInput) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await table().insert({
        project_id: projectId,
        term: input.term.trim(),
        variants: (input.variants ?? []).map((v) => v.trim()).filter(Boolean),
        notes: input.notes ?? null,
        created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Term added'); },
    onError: (e: Error) => toast.error(`Couldn't add term: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: DictionaryInput & { id: string }) => {
      const { error } = await table().update({
        term: input.term.trim(),
        variants: (input.variants ?? []).map((v) => v.trim()).filter(Boolean),
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Couldn't save term: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Couldn't remove term: ${e.message}`),
  });

  return { ...list, create, update, remove };
}

/** Shape passed to the AI functions so they normalise names/terms. */
export function glossaryForAI(terms: DictionaryTerm[] | undefined) {
  return (terms ?? []).map((t) => ({ term: t.term, variants: t.variants ?? [] }));
}
