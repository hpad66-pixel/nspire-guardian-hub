/**
 * D5 · Direct Costs hooks (invoices/timecards/expenses).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface DirectCost {
  id: string; tenant_id: string; project_id: string;
  cost_type: "invoice"|"timecard"|"expense";
  reference_no: string | null;
  vendor_org_id: string | null;
  employee_id: string | null;
  cost_date: string;
  amount: number;
  description: string | null;
  status: "open"|"approved"|"paid"|"void";
  attachment_doc_id: string | null;
}

export interface DirectCostLine {
  id: string; direct_cost_id: string;
  cost_code_id: string; amount: number;
  hours: number | null; rate: number | null;
}

export function useDirectCosts(projectId: string | null, costType?: DirectCost["cost_type"]) {
  const qc = useQueryClient();
  const list = useQuery<DirectCost[]>({
    queryKey: ["direct-costs", projectId, costType ?? "all"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      let q = supabase.from("direct_costs" as any).select("*").eq("project_id", projectId!);
      if (costType) q = q.eq("cost_type", costType);
      const { data, error } = await q.order("cost_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DirectCost[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<DirectCost> & {
      cost_type: DirectCost["cost_type"]; cost_date: string; amount: number;
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("direct_costs" as any).insert({
        tenant_id, project_id: projectId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as DirectCost;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-costs", projectId] }),
  });

  return { ...list, create };
}

export function useDirectCostLines(directCostId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<DirectCostLine[]>({
    queryKey: ["direct-cost-lines", directCostId],
    enabled: Boolean(directCostId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_cost_lines" as any).select("*")
        .eq("direct_cost_id", directCostId!);
      if (error) throw error;
      return (data ?? []) as unknown as DirectCostLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: Omit<DirectCostLine, "id"|"direct_cost_id">) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("direct_cost_lines" as any).insert({
        tenant_id, direct_cost_id: directCostId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as DirectCostLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-cost-lines", directCostId] }),
  });

  return { ...list, addLine };
}

/** CSV export: one row per direct_cost_line, cost-code tagged. */
export function buildDirectCostsCsv(
  costs: DirectCost[],
  lines: DirectCostLine[],
  costCodes: Array<{ id: string; code: string }>,
): string {
  const codeMap = new Map(costCodes.map((c) => [c.id, c.code]));
  const header = ["reference_no","cost_date","vendor_or_employee","amount","cost_code","description"].join(",");
  const rows: string[] = [header];
  for (const l of lines) {
    const parent = costs.find((c) => c.id === l.direct_cost_id);
    if (!parent) continue;
    rows.push([
      JSON.stringify(parent.reference_no ?? ""),
      parent.cost_date,
      JSON.stringify(parent.vendor_org_id ?? parent.employee_id ?? ""),
      String(l.amount),
      codeMap.get(l.cost_code_id) ?? "",
      JSON.stringify(parent.description ?? ""),
    ].join(","));
  }
  return rows.join("\n");
}
