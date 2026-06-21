import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** One Schedule-of-Values line with its latest pay-app progress (G703 grid). */
export interface SovProgressRow {
  sov_line_item_id: string;
  item_no: string;
  kind: "base" | "change_order";
  change_order_id: string | null;
  description: string;
  budget_code: string | null;
  unit: string | null;
  scheduled_qty: number;
  unit_price: number;
  scheduled_value: number;
  qty_to_date: number;
  value_to_date: number;
  pct_complete: number;
  retainage: number;
  qty_remaining: number;
  value_remaining: number;
  latest_pay_app_no: number | null;
  sort_order: number;
}

const num = (v: unknown) => Number(v ?? 0);

/** Quantity + progress per SOV line for a project, driven by the latest pay app. */
export function useSovProgress(projectId: string | null) {
  return useQuery({
    queryKey: ["sov-progress", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_sov_current_progress" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        scheduled_qty: num(r.scheduled_qty),
        unit_price: num(r.unit_price),
        scheduled_value: num(r.scheduled_value),
        qty_to_date: num(r.qty_to_date),
        value_to_date: num(r.value_to_date),
        pct_complete: num(r.pct_complete),
        retainage: num(r.retainage),
        qty_remaining: num(r.qty_remaining),
        value_remaining: num(r.value_remaining),
        sort_order: num(r.sort_order),
      })) as SovProgressRow[];
    },
  });
}
