import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireTenantId } from '@/lib/tenant';

export type ReadinessStatus =
  | 'draft' | 'invited' | 'in_progress' | 'under_review' | 'correction_needed'
  | 'conditionally_qualified' | 'qualified' | 'blocked' | 'suspended' | 'rejected';

export type RequirementStatus =
  | 'missing' | 'requested' | 'submitted' | 'under_review' | 'needs_correction'
  | 'verified' | 'waived' | 'not_applicable' | 'expired';

export interface ContractorRequirement {
  id: string;
  case_id: string;
  requirement_code: string;
  title: string;
  description: string | null;
  category: string;
  gate_type: 'work' | 'contract' | 'payment' | 'informational';
  required: boolean;
  legally_required: boolean;
  verification_required: boolean;
  expiration_required: boolean;
  instructions: string | null;
  sort_order: number;
  status: RequirementStatus;
  current_document_id: string | null;
  due_date: string | null;
  waiver_reason: string | null;
}

export interface ContractorDocument {
  id: string;
  document_type: string;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  issue_date: string | null;
  expiration_date: string | null;
  identifier: string | null;
  issuing_authority: string | null;
  coverage_amount_cents: number | null;
  verification_status: string;
  rejection_reason: string | null;
  ai_extracted_data: Record<string, unknown>;
  ai_reviewed_at: string | null;
  created_at: string;
}

export interface ContractorCase {
  id: string;
  tenant_id: string;
  organization_id: string;
  client_id: string | null;
  project_id: string | null;
  scope_type: 'workspace' | 'client' | 'project';
  status: ReadinessStatus;
  risk_tier: 'low' | 'standard' | 'high' | 'critical';
  score: number;
  work_ready: boolean;
  contract_ready: boolean;
  payment_ready: boolean;
  invited_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string; legal_name: string | null; email: string | null; phone: string | null; website: string | null; kind: string } | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  requirements?: ContractorRequirement[];
  documents?: ContractorDocument[];
  profile?: Record<string, any> | null;
  comments?: Array<{ id: string; requirement_id: string; author_type: string; author_name: string | null; body: string; created_at: string }>;
  activity?: Array<{ id: string; actor_type: string; actor_name: string | null; action: string; details: Record<string, unknown>; created_at: string }>;
  exceptions?: Array<{ id: string; requirement_id: string; reason: string; expires_at: string; revoked_at: string | null; created_at: string }>;
}

export interface ContractorPortalLink {
  id: string;
  case_id: string;
  email: string;
  recipient_name: string | null;
  role: 'contractor' | 'broker';
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
  delivery_status: 'pending' | 'sent' | 'failed' | 'link_only';
  delivery_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface ContractorReminderEvent {
  id: string;
  case_id: string;
  recipient_email: string;
  reminder_kind: 'missing' | 'correction' | 'expiring' | 'expired' | 'review_due';
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  sent_at: string | null;
  created_at: string;
}

export interface CreateContractorCaseInput {
  organizationId?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  trades?: string[];
  clientId?: string | null;
  projectId?: string | null;
  riskTier?: string;
}

export interface ContractorInvitationResult {
  portalLinkId: string;
  link: string;
  emailSent: boolean;
  deliveryStatus: ContractorPortalLink['delivery_status'];
  expiresAt: string;
}

const CASE_SELECT = `
  *,
  organization:organizations(id,name,legal_name,email,phone,website,kind),
  project:projects(id,name),
  client:clients(id,name)
`;

export function useContractorCases(projectId?: string | null, clientId?: string | null) {
  return useQuery<ContractorCase[]>({
    queryKey: ['contractor-readiness', 'cases', projectId ?? 'all', clientId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('contractor_qualification_cases' as any)
        .select(CASE_SELECT).order('updated_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);
      else if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const organizationIds = [...new Set(rows.map((row) => row.organization_id).filter(Boolean))];
      const caseIds = rows.map((row) => row.id);
      const [profiles, requirements] = await Promise.all([
        organizationIds.length
          ? supabase.from('contractor_profiles' as any).select('*').in('organization_id', organizationIds)
          : Promise.resolve({ data: [], error: null }),
        caseIds.length
          ? supabase.from('contractor_case_requirements' as any)
            .select('id,case_id,status,gate_type,required,legally_required,current_document_id').in('case_id', caseIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (profiles.error) throw profiles.error;
      if (requirements.error) throw requirements.error;
      const profileByOrganization = new Map((profiles.data ?? []).map((profile: any) => [profile.organization_id, profile]));
      return rows.map((row) => ({
        ...row,
        profile: profileByOrganization.get(row.organization_id) ?? null,
        requirements: (requirements.data ?? []).filter((requirement: any) => requirement.case_id === row.id),
      })) as ContractorCase[];
    },
  });
}

export function useContractorCase(caseId?: string | null) {
  return useQuery<ContractorCase | null>({
    queryKey: ['contractor-readiness', 'case', caseId],
    enabled: Boolean(caseId),
    queryFn: async () => {
      const { data: caseRow, error } = await supabase.from('contractor_qualification_cases' as any)
        .select(CASE_SELECT).eq('id', caseId!).maybeSingle();
      if (error) throw error;
      if (!caseRow) return null;
      const row = caseRow as any;
      const [requirements, documents, profile, activity, exceptions] = await Promise.all([
        supabase.from('contractor_case_requirements' as any).select('*').eq('case_id', caseId!).order('sort_order'),
        supabase.from('contractor_documents' as any).select('*').eq('case_id', caseId!).order('created_at', { ascending: false }),
        supabase.from('contractor_profiles' as any).select('*').eq('organization_id', row.organization_id).maybeSingle(),
        supabase.from('contractor_activity_log' as any).select('id,actor_type,actor_name,action,details,created_at').eq('case_id', caseId!).order('created_at', { ascending: false }).limit(100),
        supabase.from('contractor_exceptions' as any).select('id,requirement_id,reason,expires_at,revoked_at,created_at').eq('case_id', caseId!).is('revoked_at', null).order('expires_at'),
      ]);
      for (const result of [requirements, documents, profile, activity, exceptions]) if (result.error) throw result.error;
      const requirementIds = (requirements.data ?? []).map((requirement: any) => requirement.id);
      const comments = requirementIds.length
        ? await supabase.from('contractor_requirement_comments' as any)
          .select('id,requirement_id,author_type,author_name,body,created_at')
          .in('requirement_id', requirementIds).order('created_at')
        : { data: [], error: null };
      if (comments.error) throw comments.error;
      return {
        ...row,
        requirements: requirements.data ?? [], documents: documents.data ?? [],
        profile: profile.data ?? null, comments: comments.data ?? [], activity: activity.data ?? [],
        exceptions: exceptions.data ?? [],
      } as ContractorCase;
    },
  });
}

export function useCreateContractorCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContractorCaseRecord,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor-readiness'] }),
  });
}

async function createContractorCaseRecord(input: CreateContractorCaseInput) {
      const tenantId = await requireTenantId();
      let organizationId = input.organizationId;
      if (!organizationId) {
        if (!input.companyName?.trim()) throw new Error('Company name is required');
        const { data: org, error } = await supabase.from('organizations' as any).insert({
          tenant_id: tenantId,
          name: input.companyName.trim(),
          legal_name: input.companyName.trim(),
          kind: 'sub',
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          website: input.website?.trim() || null,
        }).select('id').single();
        if (error) throw error;
        organizationId = (org as any).id;
      }
      const { data: caseId, error } = await (supabase.rpc as any)('create_contractor_qualification_case', {
        p_organization_id: organizationId,
        p_client_id: input.clientId ?? null,
        p_project_id: input.projectId ?? null,
        p_risk_tier: input.riskTier ?? 'standard',
      });
      if (error) throw error;
      if (input.trades?.length) {
        const { error: profileError } = await supabase.from('contractor_profiles' as any).update({
          trade_categories: input.trades,
          profile_status: 'active',
        }).eq('organization_id', organizationId);
        if (profileError) throw profileError;
      }
      return String(caseId);
}

export function useStartContractorOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateContractorCaseInput & {
      sendPortal: boolean;
      recipientEmail?: string;
      recipientName?: string;
    }) => {
      const caseId = await createContractorCaseRecord(input);
      if (!input.sendPortal) return { caseId, invitation: null };
      const recipientEmail = input.recipientEmail?.trim().toLowerCase();
      if (!recipientEmail) throw Object.assign(new Error('The checklist was created, but a recipient email is required to send the portal.'), { caseId });
      const { data, error } = await supabase.functions.invoke('contractor-invite', {
        body: { caseId, email: recipientEmail, name: input.recipientName?.trim(), role: 'contractor' },
      });
      if (error || !data?.ok) {
        throw Object.assign(new Error(data?.error || error?.message || 'The checklist was created, but the portal invitation could not be sent.'), { caseId });
      }
      return { caseId, invitation: data as ContractorInvitationResult };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['contractor-readiness'] }),
  });
}

export function useContractorAutomation(caseIds: string[]) {
  const stableIds = [...caseIds].sort();
  return useQuery({
    queryKey: ['contractor-readiness', 'automation', stableIds],
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const [links, reminders, documents] = await Promise.all([
        supabase.from('contractor_portal_links' as any)
          .select('id,case_id,email,recipient_name,role,expires_at,revoked_at,last_used_at,use_count,delivery_status,delivery_error,delivered_at,created_at')
          .in('case_id', stableIds).order('created_at', { ascending: false }),
        supabase.from('contractor_reminder_log' as any)
          .select('id,case_id,recipient_email,reminder_kind,status,sent_at,created_at')
          .in('case_id', stableIds).order('created_at', { ascending: false }),
        supabase.from('contractor_documents' as any)
          .select('id,case_id,expiration_date,verification_status')
          .in('case_id', stableIds).not('expiration_date', 'is', null),
      ]);
      if (links.error) throw links.error;
      if (reminders.error) throw reminders.error;
      if (documents.error) throw documents.error;
      const now = Date.now();
      const within90Days = now + 90 * 86400000;
      const expiringDocumentIds = new Set((documents.data ?? []).filter((document: any) => {
        const expires = new Date(`${document.expiration_date}T12:00:00Z`).getTime();
        return expires >= now && expires <= within90Days;
      }).map((document: any) => document.id));
      return {
        links: (links.data ?? []) as unknown as ContractorPortalLink[],
        reminders: (reminders.data ?? []) as unknown as ContractorReminderEvent[],
        expiringCount: expiringDocumentIds.size,
      };
    },
    staleTime: 30_000,
  });
}

export function useContractorReviewActions(caseId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['contractor-readiness'] });
    qc.invalidateQueries({ queryKey: ['commitments'] });
  };

  const reviewRequirement = useMutation({
    mutationFn: async (input: { requirement: ContractorRequirement; decision: 'verified' | 'needs_correction' | 'not_applicable'; note?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (input.decision === 'not_applicable' && input.requirement.legally_required) throw new Error('A legally required item cannot be marked not applicable.');
      if (input.decision === 'verified' && !input.requirement.current_document_id && input.requirement.verification_required) throw new Error('Upload a document before verifying this item.');
      if (input.requirement.current_document_id) {
        const { error } = await supabase.from('contractor_documents' as any).update({
          verification_status: input.decision === 'verified' ? 'verified' : input.decision === 'needs_correction' ? 'rejected' : 'under_review',
          verified_by: input.decision === 'verified' ? auth.user?.id : null,
          verified_at: input.decision === 'verified' ? new Date().toISOString() : null,
          rejection_reason: input.decision === 'needs_correction' ? input.note || 'Correction requested' : null,
        }).eq('id', input.requirement.current_document_id);
        if (error) throw error;
      }
      const { error } = await supabase.from('contractor_case_requirements' as any).update({
        status: input.decision,
        reviewed_by: auth.user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq('id', input.requirement.id);
      if (error) throw error;
      if (input.note) {
        const { error: commentError } = await supabase.from('contractor_requirement_comments' as any).insert({
          tenant_id: await requireTenantId(), requirement_id: input.requirement.id,
          author_type: 'staff', author_user_id: auth.user?.id,
          author_name: auth.user?.user_metadata?.full_name || auth.user?.email,
          body: input.note,
        });
        if (commentError) throw commentError;
      }
      await (supabase.rpc as any)('recompute_contractor_readiness', { p_case_id: caseId });
    },
    onSuccess: refresh,
  });

  const updateCase = useMutation({
    mutationFn: async (patch: Partial<Pick<ContractorCase, 'status' | 'risk_tier' | 'internal_notes'>>) => {
      const { error } = await supabase.from('contractor_qualification_cases' as any).update(patch).eq('id', caseId);
      if (error) throw error;
      if (patch.status === 'in_progress') {
        const { error: recomputeError } = await (supabase.rpc as any)('recompute_contractor_readiness', { p_case_id: caseId });
        if (recomputeError) throw recomputeError;
      }
    },
    onSuccess: refresh,
  });

  const addComment = useMutation({
    mutationFn: async ({ requirementId, body }: { requirementId: string; body: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('contractor_requirement_comments' as any).insert({
        tenant_id: await requireTenantId(), requirement_id: requirementId,
        author_type: 'staff', author_user_id: auth.user?.id,
        author_name: auth.user?.user_metadata?.full_name || auth.user?.email,
        body,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const analyzeDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('contractor-document-assist', { body: { documentId } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'AI document review failed');
      return data.suggestion as Record<string, unknown>;
    },
    onSuccess: refresh,
  });

  const invite = useMutation({
    mutationFn: async ({ email, name, role = 'contractor' }: { email: string; name?: string; role?: 'contractor' | 'broker' }) => {
      const { data, error } = await supabase.functions.invoke('contractor-invite', { body: { caseId, email, name, role } });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Invitation failed');
      return data as { link: string; emailSent: boolean; expiresAt: string };
    },
    onSuccess: refresh,
  });

  const createException = useMutation({
    mutationFn: async ({ requirementId, reason, expiresAt }: { requirementId: string; reason: string; expiresAt: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Sign in again to approve an exception.');
      const { error } = await supabase.from('contractor_exceptions' as any).insert({
        tenant_id: await requireTenantId(), case_id: caseId, requirement_id: requirementId,
        reason: reason.trim(), expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
        approved_by: auth.user.id,
      });
      if (error) throw error;
      await (supabase.rpc as any)('recompute_contractor_readiness', { p_case_id: caseId });
    },
    onSuccess: refresh,
  });

  return { reviewRequirement, updateCase, addComment, analyzeDocument, invite, createException };
}

export async function getContractorDocumentUrl(path: string) {
  const { data, error } = await supabase.storage.from('contractor-readiness').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw error || new Error('Could not open document');
  return data.signedUrl;
}
