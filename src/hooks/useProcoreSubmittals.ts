/**
 * C2 · Submittals — multi-step approver workflow.
 * Named useProcoreSubmittals to coexist with pre-existing useSubmittals.ts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

/**
 * Severity ordering used when rolling up step responses to a single submittal
 * status. Worst-of-all wins — if any step is "rejected", the submittal is
 * rejected; if none is rejected but any is "revise", it's revise-and-resubmit;
 * etc. `fyi` is the no-op that doesn't block approval.
 */
export const SEVERITY_RANK: Record<string, number> = {
  rejected: 4, revise: 3, approved_as_noted: 2, approved: 1, fyi: 0,
};

/** Pure function — pick the worst response across an array of step responses. */
export function pickWorstResponse(
  responses: Array<string | null | undefined>,
): string | null {
  const filtered = responses.filter((r): r is string => Boolean(r));
  if (filtered.length === 0) return null;
  return filtered.sort(
    (a, b) => (SEVERITY_RANK[b] ?? 0) - (SEVERITY_RANK[a] ?? 0),
  )[0];
}

export interface SubmittalStep {
  id: string; submittal_id: string; sequence: number; approver_id: string;
  due_date: string | null;
  response: "approved"|"approved_as_noted"|"revise"|"rejected"|"fyi"|null;
  responded_at: string | null; comment: string | null;
}

export function useProcoreSubmittals(projectId: string | null) {
  return useQuery({
    queryKey: ["procore-submittals", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_submittals" as any).select("*")
        .eq("project_id", projectId!)
        .order("final_due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubmittalSteps(submittalId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<SubmittalStep[]>({
    queryKey: ["submittal-steps", submittalId],
    enabled: Boolean(submittalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submittal_workflow_steps" as any).select("*")
        .eq("submittal_id", submittalId!).order("sequence");
      if (error) throw error;
      return (data ?? []) as SubmittalStep[];
    },
  });

  const setApprovers = useMutation({
    mutationFn: async (approverIds: string[]) => {
      if (!submittalId) throw new Error("No submittal");
      await supabase.from("submittal_workflow_steps" as any).delete().eq("submittal_id", submittalId);
      if (approverIds.length === 0) return [];
      const rows = approverIds.map((approverId, i) => ({
        submittal_id: submittalId,
        sequence: i + 1,
        approver_id: approverId,
      }));
      const { data, error } = await supabase.from("submittal_workflow_steps" as any).insert(rows as any).select();
      if (error) throw error;
      return (data ?? []) as SubmittalStep[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submittal-steps", submittalId] }),
  });

  const respond = useMutation({
    mutationFn: async (input: { stepId: string; response: SubmittalStep["response"]; comment?: string }) => {
      const { data, error } = await supabase
        .from("submittal_workflow_steps" as any)
        .update({
          response: input.response,
          responded_at: new Date().toISOString(),
          comment: input.comment ?? null,
        } as any)
        .eq("id", input.stepId)
        .select().single();
      if (error) throw error;
      return data as SubmittalStep;
    },
    onSuccess: async () => {
      const { data: steps } = await supabase
        .from("submittal_workflow_steps" as any).select("*")
        .eq("submittal_id", submittalId!);
      if (Array.isArray(steps) && steps.every((s: any) => s.response)) {
        const worst = (steps as any[])
          .map((s) => s.response)
          .sort((a, b) => (SEVERITY_RANK[b] ?? 0) - (SEVERITY_RANK[a] ?? 0))[0];
        await supabase.from("project_submittals" as any)
          .update({ status: worst } as any).eq("id", submittalId!);
      }
      qc.invalidateQueries({ queryKey: ["submittal-steps", submittalId] });
      qc.invalidateQueries({ queryKey: ["procore-submittals"] });
    },
  });

  return { ...list, setApprovers, respond };
}

export function useSubmittalPackages(projectId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["submittal-packages", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submittal_packages" as any).select("*")
        .eq("project_id", projectId!).order("number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { number: string; title?: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("submittal_packages" as any).insert({
        tenant_id, project_id: projectId!, number: input.number, title: input.title ?? null,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submittal-packages", projectId] }),
  });

  return { ...list, create };
}

export function useSubmittalRegister(projectId: string | null) {
  return useQuery({
    queryKey: ["submittal-register", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submittal_register_items" as any).select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
