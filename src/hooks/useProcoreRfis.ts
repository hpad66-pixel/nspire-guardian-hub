/**
 * C1 · RFIs (Procore Lite enhancements).
 * Named useProcoreRfis to coexist with the pre-existing useRFIs.ts.
 */
import { toDateOnly } from "@/lib/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createWorkflowInstance, advanceWorkflow } from "@/lib/workflow";

export function useProcoreRfis(projectId: string | null) {
  return useQuery({
    queryKey: ["procore-rfis", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_rfis" as any).select("*")
        .eq("project_id", projectId!)
        .order("date_initiated", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRfiResponses(rfiId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["rfi-responses", rfiId],
    enabled: Boolean(rfiId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfi_responses" as any).select("*")
        .eq("rfi_id", rfiId!).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { body: string; isOfficial?: boolean }) => {
      if (!rfiId) throw new Error("No RFI");
      const { data, error } = await supabase.from("rfi_responses" as any).insert({
        rfi_id: rfiId,
        body: input.body,
        is_official: input.isOfficial ?? false,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rfi-responses", rfiId] }),
  });

  return { ...list, add };
}

export function useCreateProcoreRfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string; question: string; rfiManagerId?: string;
      specificationSectionId?: string; drawingNumber?: string;
      costCodeId?: string; scheduleImpactDays?: number; costImpactCents?: number;
    }) => {
      const { data: num } = await supabase.rpc("next_rfi_number" as any, {
        p_project_id: input.projectId,
      } as any);

      const { data: rfi, error } = await supabase.from("project_rfis" as any).insert({
        project_id: input.projectId,
        rfi_number: num as unknown as string,
        question: input.question,
        rfi_manager_id: input.rfiManagerId ?? null,
        specification_section_id: input.specificationSectionId ?? null,
        drawing_number: input.drawingNumber ?? null,
        cost_code_id: input.costCodeId ?? null,
        schedule_impact_days: input.scheduleImpactDays ?? 0,
        cost_impact_cents: input.costImpactCents ?? 0,
        stage: "open",
        date_initiated: toDateOnly(new Date()),
      } as any).select().single();
      if (error) throw error;

      try {
        await createWorkflowInstance({
          recordId: (rfi as any).id, recordType: "rfi", module: "rfi",
          projectId: input.projectId,
          explicitAssignee: input.rfiManagerId,
        });
      } catch (e) {
        console.warn("[useCreateProcoreRfi] workflow create skipped:", (e as Error).message);
      }
      return rfi;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["procore-rfis", v.projectId] }),
  });
}

export function useCloseProcoreRfi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { rfiId: string; instanceId?: string }) => {
      await supabase.from("project_rfis" as any).update({ stage: "closed" } as any).eq("id", input.rfiId);
      if (input.instanceId) {
        await advanceWorkflow({ instanceId: input.instanceId, action: "close" });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procore-rfis"] }),
  });
}
