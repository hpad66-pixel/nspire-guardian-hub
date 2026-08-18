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
  scope_bullets: string[] | null;
  deliverables: string[] | null;
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
  revision_no: number;
  amendment_history: Array<{ reason: string; at: string; by?: string | null; from_status?: string; revision_no?: number }>;
  proposal_no_history: Array<{ from: string; to: string; reason: string; at: string; by?: string | null }>;
  delivery_history: Array<{ to: string; at: string; by?: string | null; kind?: 'sent' | 'resent' }>;
  acceptance_method: 'electronic' | 'offline' | null;
  signed_hardcopy_path: string | null;
  signed_hardcopy_note: string | null;
  signed_hardcopy_at: string | null;
  signed_hardcopy_by: string | null;
  proposal_lines?: FinancialProposalLine[];
  created_at: string;
  updated_at: string;
}

type FinancialProposalPatch = Partial<Omit<FinancialProposal, 'proposal_lines'>>;

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
        .from('proposals')
        .select('*, proposal_lines(*)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FinancialProposal[];
    },
  });

  const create = useMutation({
    mutationFn: async (row: FinancialProposalPatch & { project_id: string; title: string; proposal_no: string }) => {
      const tenant_id = await getTenantId();
      const { data, error } = await supabase
        .from('proposals')
        .insert({ ...row, tenant_id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FinancialProposal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...row }: FinancialProposalPatch & { id: string }) => {
      const { error } = await supabase
        .from('proposals')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('proposals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reopen = useMutation({
    mutationFn: async ({ proposal, reason }: { proposal: FinancialProposal; reason: string }) => {
      if (!reason.trim()) throw new Error('Add a reason for the amendment.');
      const history = Array.isArray(proposal.amendment_history) ? proposal.amendment_history : [];
      const revisionNo = Number(proposal.revision_no ?? 0) + 1;
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('proposals')
        .update({
          locked: false,
          status: 'draft',
          submitted_signature_path: null,
          submitted_signed_at: null,
          submitted_signed_by: null,
          accepted_signature_path: null,
          accepted_signed_at: null,
          accepted_signed_name: null,
          acceptance_method: null,
          sent_to_client_at: null,
          client_comments: null,
          revision_no: revisionNo,
          amendment_history: [
            ...history,
            { reason: reason.trim(), at: new Date().toISOString(), by: auth.user?.id ?? null, from_status: proposal.status, revision_no: revisionNo },
          ],
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const renumber = useMutation({
    mutationFn: async ({ proposal, newNo, reason }: { proposal: FinancialProposal; newNo: string; reason: string }) => {
      const nextNo = newNo.trim();
      if (!nextNo) throw new Error('Enter a proposal number.');
      if (!reason.trim()) throw new Error('Add a reason for the renumbering.');
      if (nextNo === proposal.proposal_no) throw new Error('Choose a different proposal number.');
      const history = Array.isArray(proposal.proposal_no_history) ? proposal.proposal_no_history : [];
      const { data: auth } = await supabase.auth.getUser();
      const patch = {
        proposal_no: nextNo,
        proposal_no_history: [...history, {
          from: proposal.proposal_no,
          to: nextNo,
          reason: reason.trim(),
          at: new Date().toISOString(),
          by: auth.user?.id ?? null,
        }],
        pdf_path: null,
        updated_at: new Date().toISOString(),
      };
      if (proposal.locked) {
        const { error: unlockError } = await supabase.from('proposals').update({ ...patch, locked: false }).eq('id', proposal.id);
        if (unlockError) {
          if (/duplicate key|unique/i.test(unlockError.message)) throw new Error(`${nextNo} already exists on this project.`);
          throw unlockError;
        }
        const { error: relockError } = await supabase.from('proposals').update({ locked: true }).eq('id', proposal.id);
        if (relockError) throw relockError;
      } else {
        const { error } = await supabase.from('proposals').update(patch).eq('id', proposal.id);
        if (error) {
          if (/duplicate key|unique/i.test(error.message)) throw new Error(`${nextNo} already exists on this project.`);
          throw error;
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const approveOffline = useMutation({
    mutationFn: async ({ proposal, path, acceptedDate, signerName }: {
      proposal: FinancialProposal; path: string; acceptedDate: string; signerName?: string;
    }) => {
      if (!path) throw new Error("Upload the client's signed proposal first.");
      if (!acceptedDate) throw new Error('Choose the acceptance date.');
      const { data: auth } = await supabase.auth.getUser();
      const acceptedAt = new Date(`${acceptedDate}T12:00:00`).toISOString();
      const patch = {
        status: 'approved',
        locked: true,
        pdf_path: path,
        accepted_signed_at: acceptedAt,
        accepted_signed_name: signerName?.trim() || proposal.client_name || null,
        acceptance_method: 'offline',
        signed_hardcopy_path: path,
        signed_hardcopy_note: 'Client signed the proposal offline; uploaded as the accepted record.',
        signed_hardcopy_at: new Date().toISOString(),
        signed_hardcopy_by: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const firstPatch = proposal.locked ? { ...patch, locked: false } : patch;
      const { error } = await supabase.from('proposals').update(firstPatch).eq('id', proposal.id);
      if (error) throw error;
      if (proposal.locked) {
        const { error: relockError } = await supabase.from('proposals').update({ locked: true }).eq('id', proposal.id);
        if (relockError) throw relockError;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const uploadHardcopy = useMutation({
    mutationFn: async ({ proposal, path, acceptedDate, signerName }: {
      proposal: FinancialProposal; path: string; acceptedDate: string; signerName?: string;
    }) => {
      if (!path) throw new Error("Upload the client's signed proposal first.");
      if (!acceptedDate) throw new Error('Choose the execution date.');
      const { data: auth } = await supabase.auth.getUser();
      const acceptedAt = new Date(`${acceptedDate}T12:00:00`).toISOString();
      const patch = {
        status: 'approved',
        locked: true,
        // The returned, fully signed PDF is the proposal of record. Never keep
        // the consultant-only PDF as the primary document after execution.
        pdf_path: path,
        accepted_signed_at: acceptedAt,
        accepted_signed_name: signerName?.trim() || proposal.client_name || null,
        acceptance_method: 'offline',
        signed_hardcopy_path: path,
        signed_hardcopy_note: 'Final client-signed proposal; approved and executed as the primary document of record.',
        signed_hardcopy_at: new Date().toISOString(),
        signed_hardcopy_by: auth.user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      if (proposal.locked) {
        const { error } = await supabase.from('proposals').update({ ...patch, locked: false }).eq('id', proposal.id);
        if (error) throw error;
        const { error: relockError } = await supabase.from('proposals').update({ locked: true }).eq('id', proposal.id);
        if (relockError) throw relockError;
      } else {
        const { error } = await supabase.from('proposals').update(patch).eq('id', proposal.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, remove, reopen, renumber, approveOffline, uploadHardcopy };
}

export function useFinancialProposalLines(proposalId: string | null) {
  const qc = useQueryClient();
  const key = ['financial_proposal_lines', proposalId];

  const list = useQuery<FinancialProposalLine[]>({
    queryKey: key,
    enabled: Boolean(proposalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposal_lines')
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
        .from('proposal_lines')
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
        .from('proposal_lines')
        .update(row)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposal_lines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const replaceAll = useMutation({
    mutationFn: async (rows: Array<Omit<Partial<FinancialProposalLine>, 'id' | 'tenant_id' | 'proposal_id'> & { description: string }>) => {
      if (!proposalId) throw new Error('No proposal selected.');
      const tenant_id = await getTenantId();
      const { error: deleteError } = await supabase.from('proposal_lines').delete().eq('proposal_id', proposalId);
      if (deleteError) throw deleteError;
      if (!rows.length) return;
      const payload = rows.map((row, index) => ({ ...row, tenant_id, proposal_id: proposalId, line_no: row.line_no ?? index + 1 }));
      const { error: insertError } = await supabase.from('proposal_lines').insert(payload);
      if (insertError) throw insertError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, update, remove, replaceAll };
}
