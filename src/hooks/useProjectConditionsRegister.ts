/* Generated Supabase types intentionally lag additive migrations in this repository. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { requireTenantId } from '@/lib/tenant';
import type { FieldItem } from '@/hooks/useFieldAccountability';
import {
  buildProjectConditionRecordUpsertRow,
  mapProjectConditionDbRowsToRecords,
  type ProjectConditionDbAuditRow,
  type ProjectConditionDbCommentRow,
  type ProjectConditionDbNotationRow,
  type ProjectConditionDbRecordRow,
  type ProjectConditionRecord,
} from '@/lib/accountability/projectConditionsRegister';

export interface ProjectConditionsRegisterData {
  records: ProjectConditionRecord[];
  source: 'durable-register';
}

export function useProjectConditionsRegister(projectId: string | null, projectName: string) {
  const qc = useQueryClient();
  const key = ['project-conditions-register', projectId];

  const list = useQuery<ProjectConditionsRegisterData>({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async () => {
      const db = supabase as any;
      const recordsResult = await db.from('project_condition_records')
        .select(`
          id, project_id, field_item_id, condition_number, source_system, source_record_id,
          building_or_area, elevation, floor, unit, element, location_label,
          classification, classification_status, observed_condition, condition_category,
          severity, quantity, quantity_unit, repair_type, spec_reference,
          permit_status, owner_signoff_status, status,
          ai_suggestion, ai_confidence, human_review_required,
          client_publish_status, client_summary, updated_at
        `)
        .eq('project_id', projectId)
        .order('condition_number', { ascending: true });
      if (recordsResult.error) throw recordsResult.error;

      const records = (recordsResult.data ?? []) as ProjectConditionDbRecordRow[];
      const conditionIds = records.map((record) => record.id);
      if (!conditionIds.length) return { records: [], source: 'durable-register' };

      const [commentsResult, notationsResult, auditResult] = await Promise.all([
        db.from('project_condition_comments')
          .select('id, condition_id, body, role, audience, created_by, created_at')
          .in('condition_id', conditionIds)
          .order('created_at', { ascending: true }),
        db.from('project_condition_notations')
          .select('id, condition_id, notation_type, body, audience, created_by, created_at')
          .in('condition_id', conditionIds)
          .order('created_at', { ascending: true }),
        db.from('project_condition_audit_events')
          .select('id, condition_id, event_type, note, actor_id, created_at')
          .in('condition_id', conditionIds)
          .order('created_at', { ascending: true }),
      ]);
      const firstError = [commentsResult, notationsResult, auditResult].find((result) => result.error)?.error;
      if (firstError) throw firstError;

      return {
        records: mapProjectConditionDbRowsToRecords({
          projectName,
          records,
          comments: (commentsResult.data ?? []) as ProjectConditionDbCommentRow[],
          notations: (notationsResult.data ?? []) as ProjectConditionDbNotationRow[],
          audit: (auditResult.data ?? []) as ProjectConditionDbAuditRow[],
        }),
        source: 'durable-register',
      };
    },
    staleTime: 30_000,
  });

  const promoteFieldItems = useMutation({
    mutationFn: async (items: FieldItem[]) => {
      if (!projectId) throw new Error('No project selected');
      if (!items.length) return [];
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Please sign in again');
      const tenantId = await requireTenantId(userId);
      const itemIds = items.map((item) => item.id);
      const { data: existing, error: existingError } = await (supabase as any).from('project_condition_records')
        .select('source_record_id')
        .eq('project_id', projectId)
        .eq('source_system', 'field-accountability')
        .in('source_record_id', itemIds);
      if (existingError) throw existingError;

      const existingSourceIds = new Set((existing ?? []).map((row: { source_record_id: string | null }) => row.source_record_id).filter(Boolean));
      const rows = items
        .filter((item) => !existingSourceIds.has(item.id))
        .map((item) => buildProjectConditionRecordUpsertRow({
          item,
          tenantId,
          userId,
          projectName,
        }));
      if (!rows.length) return [];

      const { data, error } = await (supabase as any).from('project_condition_records')
        .insert(rows)
        .select('id');
      if (error) throw error;
      return data as { id: string }[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['field-accountability', projectId] });
    },
  });

  return {
    ...list,
    promoteFieldItems,
  };
}
