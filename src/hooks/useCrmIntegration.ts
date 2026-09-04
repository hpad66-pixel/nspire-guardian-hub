import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type ContactProposal,
  type CrmCategoryCatalog,
  type CrmIntegrationIntake,
  type UploadGrant,
} from '@/lib/crm-integration/contract';

// The forward migration is intentionally not folded into the large generated
// Supabase type file; remove this exception after the next schema regeneration.
/* eslint-disable @typescript-eslint/no-explicit-any */

type GatewayResponse<T> = { ok: boolean; data?: T; error?: string; message?: string; correlationId?: string };

async function invokeGateway<T>(projectId: string, operation: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('crm-integration-gateway', {
    body: { operation, projectId, ...body },
  });
  if (error) throw new Error(error.message || 'CRM integration request failed');
  const response = data as GatewayResponse<T>;
  if (!response?.ok || !response.data) {
    throw new Error(response?.message || 'CRM integration request failed safely');
  }
  return response.data;
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function useCrmIntakes(projectId?: string) {
  return useQuery<CrmIntegrationIntake[]>({
    queryKey: ['crm-integration-intakes', projectId ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('crm_integration_intakes' as any)
        .select([
          'id', 'tenant_id', 'project_id', 'submitter_user_id', 'source_contract_version',
          'status', 'correlation_id', 'source_context', 'project_private_context',
          'review_payload', 'external_intake_id', 'canonical_apas_contact_id',
          'current_remote_status', 'last_processed_apas_event_id', 'retry_count',
          'retryable', 'next_retry_at', 'safe_failure_code', 'safe_failure_reason',
          'project_directory_entry_id', 'submitted_at', 'approved_at', 'resolved_at',
          'created_at', 'updated_at',
        ].join(','))
        .order('created_at', { ascending: false })
        .limit(50);
      if (projectId) query = query.eq('project_id', projectId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CrmIntegrationIntake[];
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useCrmCategories(projectId?: string) {
  return useQuery<CrmCategoryCatalog>({
    queryKey: ['crm-integration-categories', projectId],
    enabled: Boolean(projectId),
    queryFn: () => invokeGateway<CrmCategoryCatalog>(projectId!, 'categories'),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCrmIntakeActions(projectId?: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm-integration-intakes'] });

  const scan = useMutation({
    mutationFn: async (input: {
      front: File;
      back?: File | null;
      clientRequestId: string;
      sourceContext: Record<string, unknown>;
    }) => {
      if (!projectId) throw new Error('Choose a project before scanning a card.');
      const files = [
        { side: 'front' as const, file: input.front },
        ...(input.back ? [{ side: 'back' as const, file: input.back }] : []),
      ];
      const uploads = await Promise.all(files.map(async ({ side, file }) => ({
        side,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        sha256: await sha256(file),
      })));
      const started = await invokeGateway<{
        intakeId: string;
        correlationId: string;
        grants: UploadGrant[];
        alreadySubmitted?: boolean;
        status?: CrmIntegrationIntake['status'];
        remoteStatus?: string;
        reviewPayload?: Record<string, unknown>;
      }>(projectId, 'start_intake', {
        clientRequestId: input.clientRequestId,
        sourceContext: input.sourceContext,
        uploads,
      });
      if (started.alreadySubmitted) {
        return {
          intakeId: started.intakeId,
          status: started.status ?? 'waiting_crm_review',
          remoteStatus: started.remoteStatus ?? 'submitted',
          reviewPayload: started.reviewPayload ?? {},
        };
      }
      for (const grant of started.grants) {
        const file = files.find((item) => item.side === grant.side)?.file;
        if (!file) throw new Error(`The ${grant.side} card image is missing.`);
        const response = await fetch(grant.uploadUrl, {
          method: grant.method,
          headers: { ...grant.headers, 'Content-Type': file.type },
          body: file,
        });
        if (!response.ok) throw new Error(`The ${grant.side} image could not be uploaded securely.`);
      }
      return invokeGateway<{
        intakeId: string;
        status: CrmIntegrationIntake['status'];
        remoteStatus: string;
        reviewPayload: Record<string, unknown>;
      }>(projectId, 'complete_upload', { intakeId: started.intakeId });
    },
    onSuccess: invalidate,
  });

  const prepareApproval = useMutation({
    mutationFn: (input: { intakeId: string; proposal: ContactProposal }) => {
      if (!projectId) throw new Error('Project context is required.');
      return invokeGateway<{
        approvalId: string;
        approvalToken: string;
        proposalHash: string;
        expiresAt: string;
        exactPreview: ContactProposal;
      }>(projectId, 'prepare_approval', input);
    },
    onSuccess: invalidate,
  });

  const executeApproval = useMutation({
    mutationFn: (input: { intakeId: string; approvalId: string; approvalToken: string; proposalHash: string }) => {
      if (!projectId) throw new Error('Project context is required.');
      return invokeGateway<{ intakeId: string; status: CrmIntegrationIntake['status']; remoteStatus: string }>(
        projectId,
        'execute_approval',
        input,
      );
    },
    onSuccess: invalidate,
  });

  const refresh = useMutation({
    mutationFn: (intakeId: string) => {
      if (!projectId) throw new Error('Project context is required.');
      return invokeGateway(projectId, 'refresh_status', { intakeId });
    },
    onSuccess: invalidate,
  });

  const retry = useMutation({
    mutationFn: (intakeId: string) => {
      if (!projectId) throw new Error('Project context is required.');
      return invokeGateway(projectId, 'retry', { intakeId });
    },
    onSuccess: invalidate,
  });

  return { scan, prepareApproval, executeApproval, refresh, retry };
}
