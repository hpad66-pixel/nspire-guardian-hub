import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoLineItem {
  id: string;
  change_order_id: string;
  line_no: number;
  description: string;
  unit: string | null;
  qty: number;
  unit_price: number;
  extended_value: number;
  basis: string | null;
}

const num = (v: unknown) => Number(v ?? 0);

/** Priced line items for every change order on a project, grouped by change_order_id. */
export function useChangeOrderLineItems(projectId: string | null) {
  return useQuery({
    queryKey: ["co-line-items", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_order_line_items" as any)
        .select("*, change_orders!inner(project_id)")
        .eq("change_orders.project_id", projectId!)
        .order("line_no");
      if (error) throw error;
      const map: Record<string, CoLineItem[]> = {};
      for (const r of (data ?? []) as any[]) {
        const li: CoLineItem = {
          id: r.id, change_order_id: r.change_order_id, line_no: num(r.line_no),
          description: r.description, unit: r.unit,
          qty: num(r.qty), unit_price: num(r.unit_price), extended_value: num(r.extended_value), basis: r.basis,
        };
        (map[li.change_order_id] ??= []).push(li);
      }
      return map;
    },
  });
}
