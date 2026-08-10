import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialProposalLine {
  id: string;
  tenant_id: string;
  proposal_id: string;
  line_no: number;
  category: 'labor' | 'material' | 'equipment' | 'subcontract' | 'other';
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  markup_pct: number;
  created_at: string;
}

export interface FinancialProposal {
  id: string;
  tenant_id: string;
  project_id: string;
  proposal_no: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  valid_until: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  notes: string | null;
  terms: string | null;
  markup_pct: number;
  source_issue_id: string | null;
  sign_token: string;
  locked: boolean;
  submitted_signature_path: string | null;
  submitted_signed_at: string | null;
  submitted_signed_by: string | null;
  accepted_signature_path: string | null;
  accepted_signed_at: string | null;
  accepted_signed_name: string | null;
  sent_to_client_at: string | null;
  client_comments: string | null;
  pdf_path: string | null;
  amendment_history: Array<{ reason: string; at: string; from_status?: string }>;
  proposal_lines?: FinancialProposalLine[];
  created_at: string;
  updated_at: string;
}

async function getTenantId(): Promise<string> {
  const { data, error } = await supabase.from('workspaces').select('id').limit(1).single();
  if (error || !data) throw new Error('Could not resolve workspace');
  return data.id;
}

export function useFinancialProposals(projectId: string | null) {
  const qc = useQueryClient();
  const key = ['financial_proposals', projectId];

  const list = useQuery<FinancialProposal[]>({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals' as any)
        .select('*, proposal_lines(*)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FinancialProposal[];
    },
  });

  const create = useMutation({
    mutationFn: async (row: Partial<FinancialProposal> & { project_id: string; title: string; proposal_no: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('proposals' as any)
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FinancialProposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: Partial<FinancialProposal> & { id: string }) => {
      const { error } = await supabase
        .from('proposals' as any)
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reopen = useMutation({
    mutationFn: async ({ proposal, reason }: { proposal: FinancialProposal; reason: string }) => {
      if (!reason.trim()) throw new Error('Add a reason for the amendment.');
      const history = Array.isArray(proposal.amendment_history) ? proposal.amendment_history : [];
      const { error } = await supabase
        .from('proposals' as any)
        .update({
          locked: false,
          status: 'draft',
          submitted_signature_path: null,
          submitted_signed_at: null,
          submitted_signed_by: null,
          accepted_signature_path: null,
          accepted_signed_at: null,
          accepted_signed_name: null,
          sent_to_client_at: null,
          client_comments: null,
          amendment_history: [
            ...history,
            { reason: reason.trim(), at: new Date().toISOString(), from_status: proposal.status },
          ],
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, remove, reopen };
}

export function useFinancialProposalLines(proposalId: string | null) {
  const qc = useQueryClient();
  const key = ['financial_proposal_lines', proposalId];

  const list = useQuery<FinancialProposalLine[]>({
    queryKey: key,
    enabled: Boolean(proposalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_lines' as any)
        .select('*')
        .eq('proposal_id', proposalId!)
        .order('line_no', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FinancialProposalLine[];
    },
  });

  const create = useMutation({
    mutationFn: async (row: Partial<FinancialProposalLine> & { proposal_id: string; description: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('proposal_lines' as any)
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FinancialProposalLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: Partial<FinancialProposalLine> & { id: string }) => {
      const { error } = await supabase
        .from('proposal_lines' as any)
        .update(row)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_lines' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, remove };
}
