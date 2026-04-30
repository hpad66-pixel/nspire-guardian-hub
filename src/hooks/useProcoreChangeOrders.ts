/**
 * D4 · Change Orders (PCO/OCO/CCO).
 * Named useProcoreChangeOrders to coexist with pre-existing useChangeOrders.ts.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface ChangeOrder {
  id: string; tenant_id: string; project_id: string;
  co_no: number | null;
  co_type: "PCO"|"OCO"|"CCO"|null;
  prime_contract_id: string | null;
  commitment_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  days_impact: number;
  status: "draft"|"pending"|"out_for_signature"|"executed"|"rejected"|"void";
  reason_code: string | null;
  parent_pco_id: string | null;
  peer_co_id: string | null;
  executed_date: string | null;
}

export interface ChangeOrderLine {
  id: string; change_order_id: string;
  cost_code_id: string; description: string; amount: number;
}

export function useChangeOrdersByType(projectId: string | null, coType: "PCO"|"OCO"|"CCO") {
  return useQuery<ChangeOrder[]>({
    queryKey: ["change-orders", projectId, coType],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any).select("*")
        .eq("project_id", projectId!).eq("co_type", coType)
        .order("co_no", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChangeOrder[];
    },
  });
}

export function useChangeOrderLines(coId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<ChangeOrderLine[]>({
    queryKey: ["co-lines", coId],
    enabled: Boolean(coId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_order_lines" as any).select("*")
        .eq("change_order_id", coId!);
      if (error) throw error;
      return (data ?? []) as ChangeOrderLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: { costCodeId: string; description: string; amount: number }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("change_order_lines" as any).insert({
        tenant_id, change_order_id: coId!,
        cost_code_id: input.costCodeId,
        description: input.description,
        amount: input.amount,
      } as any).select().single();
      if (error) throw error;
      return data as ChangeOrderLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-lines", coId] }),
  });

  return { ...list, addLine };
}

/** Promote a PCO to an OCO once signed by the Owner. */
export function usePromoteToOco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pcoId: string) => {
      const tenant_id = await requireTenantId();
      const { data: pco, error: e1 } = await supabase
        .from("change_orders" as any).select("*").eq("id", pcoId).single();
      if (e1) throw e1;

      const { data: oco, error: e2 } = await supabase.from("change_orders" as any).insert({
        tenant_id,
        project_id: (pco as any).project_id,
        prime_contract_id: (pco as any).prime_contract_id,
        co_type: "OCO",
        title: (pco as any).title,
        description: (pco as any).description,
        amount: (pco as any).amount,
        status: "executed",
        parent_pco_id: pcoId,
        executed_date: new Date().toISOString().split("T")[0],
      } as any).select().single();
      if (e2) throw e2;

      // Copy lines
      const { data: lines } = await supabase
        .from("change_order_lines" as any).select("*").eq("change_order_id", pcoId);
      if (Array.isArray(lines) && lines.length > 0) {
        await supabase.from("change_order_lines" as any).insert(
          (lines as any[]).map((l) => ({
            tenant_id,
            change_order_id: (oco as any).id,
            cost_code_id: l.cost_code_id,
            description: l.description,
            amount: l.amount,
          })) as any,
        );
      }

      return oco as ChangeOrder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change-orders"] }),
  });
}
