import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectIssue {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: 'scope_gap' | 'owner_directed' | 'unforeseen' | 'design_change' | 'deficiency' | 'other';
  location: string | null;
  status: 'open' | 'pending_review' | 'converted_pco' | 'converted_co' | 'closed';
  estimated_cost: number | null;
  photo_urls: string[];
  linked_pco_id: string | null;
  linked_co_id: string | null;
  created_at: string;
  updated_at: string;
}

async function getTenantId(): Promise<string> {
  const { data, error } = await supabase.from('workspaces').select('id').limit(1).single();
  if (error || !data) throw new Error('Could not resolve workspace');
  return data.id;
}

export function useProjectIssues(projectId: string | null) {
  const qc = useQueryClient();
  const key = ['project_issues', projectId];

  const list = useQuery<ProjectIssue[]>({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_issues' as any)
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectIssue[];
    },
  });

  const create = useMutation({
    mutationFn: async (row: Partial<ProjectIssue> & { project_id: string; title: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('project_issues' as any)
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data as ProjectIssue;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: Partial<ProjectIssue> & { id: string }) => {
      const { error } = await supabase
        .from('project_issues' as any)
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const convertToPco = useMutation({
    mutationFn: async (issue: ProjectIssue) => {
      const tenant_id = await getTenantId();
      // Create a PCO in the change_orders table
      const { data: pco, error: pcoErr } = await supabase
        .from('change_orders' as any)
        .insert({
          tenant_id,
          project_id: issue.project_id,
          co_type: 'PCO',
          title: issue.title,
          description: issue.description ?? '',
          amount: issue.estimated_cost ?? 0,
          status: 'pending',
          reason_code: issue.category,
          days_impact: 0,
        })
        .select()
        .single();
      if (pcoErr) throw pcoErr;
      // Link the issue to the PCO
      const { error: updateErr } = await supabase
        .from('project_issues' as any)
        .update({ linked_pco_id: (pco as any).id, status: 'converted_pco', updated_at: new Date().toISOString() })
        .eq('id', issue.id);
      if (updateErr) throw updateErr;
      return pco;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, convertToPco };
}
