/**
 * A4 · Workflow definitions CRUD hooks.
 *
 * One `workflow_definitions` row per (tenant, module, version). Steps live in
 * `workflow_steps`, ordered by `sequence`. An Owner-admin can clone an
 * existing definition to bump the version and edit the steps.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import type { WorkflowModule } from "@/lib/workflow-engine";

export interface WorkflowDefinition {
  id: string;
  tenant_id: string;
  module: string;
  name: string;
  version: number;
  is_default: boolean;
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  definition_id: string;
  sequence: number;
  state_name: string;
  assignee_rule: string; // 'role:PM' | 'field:responsible_contractor_id' | 'explicit'
  due_offset_days: number | null;
  auto_actions: Record<string, unknown>;
}

export function useWorkflowDefinitions(module?: WorkflowModule | string) {
  const qc = useQueryClient();

  const list = useQuery<WorkflowDefinition[]>({
    queryKey: ["workflow-definitions", module ?? "all"],
    queryFn: async () => {
      let q = supabase.from("workflow_definitions" as any)
        .select("*")
        .order("module")
        .order("version", { ascending: false });
      if (module) q = q.eq("module", module);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorkflowDefinition[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      module: string; name: string; isDefault?: boolean; cloneFromId?: string;
    }) => {
      const tenant_id = await requireTenantId();

      // Pick a version that doesn't collide with an existing (tenant, module, version) row.
      const { data: existing } = await supabase
        .from("workflow_definitions" as any)
        .select("version").eq("module", input.module);
      const nextVersion = Math.max(
        0, ...(existing ?? []).map((e: any) => e.version ?? 0),
      ) + 1;

      const { data: def, error: defErr } = await supabase
        .from("workflow_definitions" as any)
        .insert({
          tenant_id, module: input.module, name: input.name,
          version: nextVersion, is_default: input.isDefault ?? false,
        } as any)
        .select().single();
      if (defErr) throw defErr;

      if (input.cloneFromId) {
        const { data: steps } = await supabase
          .from("workflow_steps" as any).select("*")
          .eq("definition_id", input.cloneFromId)
          .order("sequence");
        if (steps && steps.length > 0) {
          await supabase.from("workflow_steps" as any).insert(
            (steps as any[]).map((s) => ({
              definition_id: (def as any).id,
              sequence: s.sequence,
              state_name: s.state_name,
              assignee_rule: s.assignee_rule,
              due_offset_days: s.due_offset_days,
              auto_actions: s.auto_actions,
            })) as any,
          );
        }
      }

      return def as WorkflowDefinition;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-definitions"] }),
  });

  const setDefault = useMutation({
    mutationFn: async (input: { definitionId: string; module: string }) => {
      await supabase.from("workflow_definitions" as any)
        .update({ is_default: false } as any).eq("module", input.module);
      const { error } = await supabase.from("workflow_definitions" as any)
        .update({ is_default: true } as any).eq("id", input.definitionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-definitions"] }),
  });

  return { ...list, create, setDefault };
}

export function useWorkflowSteps(definitionId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<WorkflowStep[]>({
    queryKey: ["workflow-steps", definitionId],
    enabled: Boolean(definitionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_steps" as any).select("*")
        .eq("definition_id", definitionId!).order("sequence");
      if (error) throw error;
      return (data ?? []) as WorkflowStep[];
    },
  });

  /** Replace all steps for a definition in one transaction-like swap. */
  const replaceAll = useMutation({
    mutationFn: async (steps: Array<Omit<WorkflowStep, "id" | "definition_id">>) => {
      if (!definitionId) throw new Error("No definition");
      await supabase.from("workflow_steps" as any).delete().eq("definition_id", definitionId);
      if (steps.length === 0) return [];
      const rows = steps.map((s, i) => ({
        definition_id: definitionId,
        sequence: i + 1,
        state_name: s.state_name,
        assignee_rule: s.assignee_rule,
        due_offset_days: s.due_offset_days,
        auto_actions: s.auto_actions ?? {},
      }));
      const { data, error } = await supabase
        .from("workflow_steps" as any).insert(rows as any).select();
      if (error) throw error;
      return (data ?? []) as WorkflowStep[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-steps", definitionId] }),
  });

  return { ...list, replaceAll };
}
