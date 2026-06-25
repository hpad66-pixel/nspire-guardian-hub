/**
 * D6 · Budget matrix + modifications + snapshots.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface ProjectBudget {
  id: string; tenant_id: string; project_id: string;
  name: string; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface BudgetLine {
  id: string; project_budget_id: string;
  cost_code_id: string; original_budget: number;
}

export interface BudgetMatrixRow {
  project_budget_id: string;
  cost_code_id: string;
  cost_code: string;
  cost_code_desc: string;
  original_budget: number;
  approved_budget_mods: number;
  revised_budget: number;
  committed_cost: number;
  executed_cco: number;
  direct_cost: number;
  pending_exposure: number;
  forecast_to_complete: number;
  variance: number;
}

export interface BudgetModification {
  id: string; project_budget_id: string;
  mod_no: number; title: string;
  status: "draft"|"approved"|"void";
  approved_at: string | null; approved_by: string | null;
  created_at: string;
}

export function useActiveBudget(projectId: string | null) {
  const qc = useQueryClient();
  const one = useQuery<ProjectBudget | null>({
    queryKey: ["active-budget", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budgets" as any).select("*")
        .eq("project_id", projectId!).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProjectBudget | null;
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("project_budgets" as any).insert({
        tenant_id, project_id: projectId!, name, is_active: true,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as ProjectBudget;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-budget", projectId] }),
  });

  return { ...one, create };
}

export function useBudgetLines(projectBudgetId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<BudgetLine[]>({
    queryKey: ["budget-lines", projectBudgetId],
    enabled: Boolean(projectBudgetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_lines" as any).select("*")
        .eq("project_budget_id", projectBudgetId!);
      if (error) throw error;
      return (data ?? []) as unknown as BudgetLine[];
    },
  });

  const upsertLine = useMutation({
    mutationFn: async (input: { costCodeId: string; originalBudget: number }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("budget_lines" as any).upsert({
        tenant_id, project_budget_id: projectBudgetId!,
        cost_code_id: input.costCodeId,
        original_budget: input.originalBudget,
      } as any, { onConflict: "project_budget_id,cost_code_id" }).select().single();
      if (error) throw error;
      return data as unknown as BudgetLine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-lines", projectBudgetId] });
      qc.invalidateQueries({ queryKey: ["budget-matrix", projectBudgetId] });
    },
  });

  return { ...list, upsertLine };
}

export function useBudgetMatrix(projectBudgetId: string | null) {
  return useQuery<BudgetMatrixRow[]>({
    queryKey: ["budget-matrix", projectBudgetId],
    enabled: Boolean(projectBudgetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_matrix" as any).select("*")
        .eq("project_budget_id", projectBudgetId!)
        .order("cost_code");
      if (error) throw error;
      return (data ?? []) as unknown as BudgetMatrixRow[];
    },
  });
}

export function useBudgetModifications(projectBudgetId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<BudgetModification[]>({
    queryKey: ["budget-modifications", projectBudgetId],
    enabled: Boolean(projectBudgetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_modifications" as any).select("*")
        .eq("project_budget_id", projectBudgetId!).order("mod_no", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetModification[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      transfers: Array<{ fromCostCodeId: string; toCostCodeId: string; amount: number }>;
    }) => {
      const tenant_id = await requireTenantId();
      const { data: mod, error: modErr } = await supabase.from("budget_modifications" as any).insert({
        tenant_id, project_budget_id: projectBudgetId!, title: input.title, status: "draft",
      } as any).select().single();
      if (modErr) throw modErr;

      if (input.transfers.length > 0) {
        const { error: linesErr } = await supabase.from("budget_modification_lines" as any).insert(
          input.transfers.map((t) => ({
            budget_modification_id: (mod as any).id,
            from_cost_code_id: t.fromCostCodeId,
            to_cost_code_id: t.toCostCodeId,
            amount: t.amount,
          })) as any,
        );
        if (linesErr) throw linesErr;
      }
      return mod as unknown as BudgetModification;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-modifications", projectBudgetId] }),
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_modifications" as any)
        .update({ status: "approved" } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget-modifications", projectBudgetId] });
      qc.invalidateQueries({ queryKey: ["budget-matrix", projectBudgetId] });
    },
  });

  return { ...list, create, approve };
}

export function useBudgetSnapshots(projectBudgetId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["budget-snapshots", projectBudgetId],
    enabled: Boolean(projectBudgetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budget_snapshots" as any).select("id, period_end, created_at")
        .eq("project_budget_id", projectBudgetId!).order("period_end", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const capture = useMutation({
    mutationFn: async (input: { periodEnd: string }) => {
      const tenant_id = await requireTenantId();
      const { data: matrix } = await supabase
        .from("budget_matrix" as any).select("*")
        .eq("project_budget_id", projectBudgetId!);
      const { data, error } = await supabase.from("budget_snapshots" as any).insert({
        tenant_id, project_budget_id: projectBudgetId!,
        period_end: input.periodEnd,
        payload: matrix ?? [],
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget-snapshots", projectBudgetId] }),
  });

  return { ...list, capture };
}

/** CSV export of the budget matrix. */
export function buildBudgetMatrixCsv(rows: BudgetMatrixRow[]): string {
  const header = [
    "cost_code","cost_code_desc","original_budget","approved_budget_mods","revised_budget",
    "committed_cost","executed_cco","direct_cost","pending_exposure","forecast_to_complete","variance",
  ].join(",");
  const body = rows.map((r) => [
    r.cost_code, JSON.stringify(r.cost_code_desc),
    r.original_budget, r.approved_budget_mods, r.revised_budget,
    r.committed_cost, r.executed_cco, r.direct_cost,
    r.pending_exposure, r.forecast_to_complete, r.variance,
  ].join(",")).join("\n");
  return `${header}\n${body}`;
}
