import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ScopeStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

export interface ProjectScope {
  id: string;
  tenant_id: string;
  project_id: string;
  scope_no: number | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: ScopeStatus;
  start_date: string | null;
  due_date: string | null;
  fee_amount: number;
  pct_complete: number;
  pct_billed: number;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ScopeInput = Partial<
  Pick<ProjectScope, 'title' | 'description' | 'owner_id' | 'status' | 'start_date' | 'due_date' | 'fee_amount' | 'pct_complete' | 'sort_order' | 'scope_no'>
>;

const table = () => supabase.from('project_scopes' as never);

export function useProjectScopes(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['project-scopes', projectId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as ProjectScope[];
      const { data, error } = await (table() as any)
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectScope[];
    },
    enabled: !!projectId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['project-scopes', projectId] });

  const create = useMutation({
    mutationFn: async (input: ScopeInput) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const count = list.data?.length ?? 0;
      const { data, error } = await (table() as any)
        .insert({
          project_id: projectId,
          title: input.title ?? 'Untitled scope',
          description: input.description ?? null,
          owner_id: input.owner_id ?? null,
          status: input.status ?? 'not_started',
          start_date: input.start_date ?? null,
          due_date: input.due_date ?? null,
          fee_amount: input.fee_amount ?? 0,
          pct_complete: input.pct_complete ?? 0,
          scope_no: input.scope_no ?? count + 1,
          sort_order: input.sort_order ?? count,
          created_by: auth?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectScope;
    },
    onSuccess: () => { invalidate(); toast.success('Scope added'); },
    onError: (e: Error) => toast.error(`Couldn't add scope: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: ScopeInput & { id: string }) => {
      const { data, error } = await (table() as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectScope;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Couldn't save scope: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (table() as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Scope removed'); },
    onError: (e: Error) => toast.error(`Couldn't remove scope: ${e.message}`),
  });

  return { ...list, create, update, remove };
}

/** AI-extract scopes (+ fees) from a won proposal and add them to the project. */
export function useBuildScopesFromProposal(projectId: string, projectName?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposal: { content_text?: string | null; content_html?: string | null }) => {
      const text = (proposal.content_text || (proposal.content_html || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      if (text.length < 20) throw new Error('This proposal has no content to build scopes from.');

      const { data, error } = await supabase.functions.invoke('extract-proposal-scopes', {
        body: { text, projectName },
      });
      if (error) throw new Error(error.message || 'AI request failed');
      if ((data as any)?.error) throw new Error((data as any).error);
      const scopes: Array<{ title: string; description: string; fee_amount: number }> = (data as any)?.scopes ?? [];
      if (!scopes.length) throw new Error('No scopes were found in this proposal.');

      const { data: auth } = await supabase.auth.getUser();
      const rows = scopes.map((s, i) => ({
        project_id: projectId,
        title: s.title,
        description: s.description || null,
        fee_amount: s.fee_amount || 0,
        scope_no: i + 1,
        sort_order: i,
        created_by: auth?.user?.id ?? null,
      }));
      const { error: insErr } = await (table() as any).insert(rows);
      if (insErr) throw insErr;
      return scopes.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['project-scopes', projectId] });
      toast.success(`Added ${n} scope${n === 1 ? '' : 's'} to the Scope tab`);
    },
    onError: (e: Error) => toast.error(`Couldn't build scopes: ${e.message}`),
  });
}

/** Fee-weighted completion + billing rollup for a set of scopes. */
export function summarizeScopes(scopes: ProjectScope[] | undefined) {
  const list = scopes ?? [];
  const totalFee = list.reduce((s, x) => s + (Number(x.fee_amount) || 0), 0);
  const earned = list.reduce((s, x) => s + (Number(x.fee_amount) || 0) * (Number(x.pct_complete) || 0) / 100, 0);
  const billed = list.reduce((s, x) => s + (Number(x.fee_amount) || 0) * (Number(x.pct_billed) || 0) / 100, 0);
  const pctComplete = totalFee > 0 ? Math.round((earned / totalFee) * 100) : 0;
  return { count: list.length, totalFee, earned, billed, unbilled: earned - billed, pctComplete };
}
