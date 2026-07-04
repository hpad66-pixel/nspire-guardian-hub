import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type LetterType = 'regulatory_notice' | 'response' | 'transmittal' | 'request' | 'general';
export type LetterStatus = 'draft' | 'signed' | 'submitted';

export interface ComplianceLetter {
  id: string;
  project_id: string;
  letter_type: LetterType;
  subject: string;
  agency: string | null;
  recipient: string | null;
  recipient_address: string | null;
  reference_no: string | null;
  body: string | null;
  status: LetterStatus;
  signed_by: string | null;
  signed_at: string | null;
  submitted_at: string | null;
  submission_method: string | null;
  created_at: string;
  updated_at: string;
}

export const LETTER_TYPE_LABEL: Record<LetterType, string> = {
  regulatory_notice: 'Regulatory notice', response: 'Response to agency', transmittal: 'Transmittal', request: 'Request', general: 'General',
};

const table = () => supabase.from('compliance_correspondence' as never) as any;

export function useComplianceCorrespondence(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['compliance-correspondence', projectId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as ComplianceLetter[];
      const { data, error } = await table().select('*').eq('project_id', projectId).order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ComplianceLetter[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<ComplianceLetter> & { subject: string }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await table().insert({
        project_id: projectId, subject: input.subject, letter_type: input.letter_type ?? 'general',
        agency: input.agency ?? null, recipient: input.recipient ?? null, recipient_address: input.recipient_address ?? null,
        reference_no: input.reference_no ?? null, body: input.body ?? null, status: 'draft', created_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      return data as ComplianceLetter;
    },
    onSuccess: () => { invalidate(); toast.success('Letter created'); },
    onError: (e: Error) => toast.error(`Couldn't create: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ComplianceLetter>) => {
      const { error } = await table().update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await table().delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { invalidate(); toast.success('Letter deleted'); },
    onError: (e: Error) => toast.error(`Couldn't delete: ${e.message}`),
  });

  // AI draft — returns the body text; the caller decides whether to save.
  const draft = async (input: { projectName?: string; letterType: LetterType; agency?: string; recipient?: string; subject: string; context?: string }) => {
    const { data, error } = await supabase.functions.invoke('generate-compliance-letter', { body: input });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || 'Draft failed');
    return String((data as any)?.body ?? '');
  };

  return { ...list, create, update, remove, draft };
}
