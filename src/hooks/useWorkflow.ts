import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  advanceWorkflow,
  createWorkflowInstance,
  getInstanceForRecord,
  type WorkflowAction,
  type WorkflowInstance,
  type WorkflowModule,
} from "@/lib/workflow";

export interface MyCourtRow {
  id: string;
  tenant_id: string;
  record_id: string;
  record_type: string;
  project_id: string | null;
  current_step: number;
  due_at: string | null;
  state: string;
  created_at: string;
  module: string;
  workflow_name: string;
  current_state_name: string | null;
}

export function useMyCourt() {
  return useQuery<MyCourtRow[]>({
    queryKey: ["my-court"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("my_court" as any)
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as MyCourtRow[];
    },
  });
}

export function useRecordWorkflow(recordType: string, recordId: string | null) {
  return useQuery<WorkflowInstance | null>({
    queryKey: ["workflow-instance", recordType, recordId],
    enabled: Boolean(recordId),
    queryFn: () => getInstanceForRecord(recordType, recordId!),
  });
}

export function useWorkflowEvents(instanceId: string | null) {
  return useQuery({
    queryKey: ["workflow-events", instanceId],
    enabled: Boolean(instanceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_events" as any)
        .select("*")
        .eq("instance_id", instanceId!)
        .order("occurred_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createWorkflowInstance>[0]) =>
      createWorkflowInstance(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["workflow-instance", vars.recordType, vars.recordId] });
      qc.invalidateQueries({ queryKey: ["my-court"] });
    },
  });
}

export function useAdvanceWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { instanceId: string; action: WorkflowAction; comment?: string; nextAssignee?: string }) =>
      advanceWorkflow(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-court"] });
      qc.invalidateQueries({ queryKey: ["workflow-instance"] });
      qc.invalidateQueries({ queryKey: ["workflow-events"] });
    },
  });
}

export { type WorkflowModule };
