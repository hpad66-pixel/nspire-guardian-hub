/**
 * A4 · Ball-in-Court Workflow Engine — client service layer.
 *
 * Canonical API for creating and advancing workflow instances.
 * Every workflow-bearing module (RFI, Submittal, Punch, CO, Pay App, etc.)
 * uses these — do NOT re-implement per module.
 */
import { supabase } from "@/integrations/supabase/client";

export type WorkflowModule =
  | "rfi" | "submittal" | "punch_item"
  | "change_order" | "potential_change_order" | "prime_change_order" | "commitment_change_order"
  | "prime_pay_application" | "commitment_pay_application"
  | "inspection" | "meeting" | "daily_log";

export type WorkflowAction =
  | "submit" | "approve" | "reject" | "return" | "close" | "reassign" | "create";

export type WorkflowState = "open" | "approved" | "closed" | "rejected";

export interface WorkflowInstance {
  id: string;
  tenant_id: string;
  definition_id: string;
  record_id: string;
  record_type: string;
  project_id: string | null;
  current_step: number;
  current_assignee_id: string | null;
  due_at: string | null;
  state: WorkflowState;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

/** Create a workflow instance for a freshly-inserted record. */
export async function createWorkflowInstance(input: {
  recordId: string;
  recordType: string;
  module: WorkflowModule;
  projectId?: string;
  explicitAssignee?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_workflow_instance" as any, {
    p_record_id: input.recordId,
    p_record_type: input.recordType,
    p_module: input.module,
    p_project_id: input.projectId ?? null,
    p_explicit_assignee: input.explicitAssignee ?? null,
  } as any);
  if (error) throw error;
  return data as unknown as string;
}

/** Advance an open instance forward (or back, on reject/return). */
export async function advanceWorkflow(input: {
  instanceId: string;
  action: WorkflowAction;
  comment?: string;
  nextAssignee?: string;
}): Promise<WorkflowInstance> {
  const { data, error } = await supabase.rpc("advance_workflow" as any, {
    p_instance_id: input.instanceId,
    p_action: input.action,
    p_comment: input.comment ?? null,
    p_explicit_next_assignee: input.nextAssignee ?? null,
  } as any);
  if (error) throw error;
  return data as unknown as WorkflowInstance;
}

/** Look up the single workflow instance attached to a record (or null). */
export async function getInstanceForRecord(
  recordType: string,
  recordId: string,
): Promise<WorkflowInstance | null> {
  const { data, error } = await supabase
    .from("workflow_instances" as any)
    .select("*")
    .eq("record_type", recordType)
    .eq("record_id", recordId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as WorkflowInstance | null;
}
