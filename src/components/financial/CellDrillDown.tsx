/**
 * D6 · CellDrillDown — shows the source rows feeding a budget cell.
 *
 * Dialog opens when a user clicks a numeric cell in BudgetMatrixGrid. For
 * each supported column (committed / cco / direct / exposure / mods) we
 * query the underlying table filtered by cost_code_id + project_id.
 */
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pdf";

export type DrillColumn = "committed" | "cco" | "direct" | "exposure" | "mods";

export interface CellDrillDownProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  costCodeId: string;
  costCode: string;
  column: DrillColumn;
}

const TITLE: Record<DrillColumn, string> = {
  committed: "Committed cost — source commitment SOV lines",
  cco:       "Executed CCOs — source change-order lines",
  direct:    "Direct cost — source direct_cost_lines",
  exposure:  "Pending exposure — source change-event lines",
  mods:      "Approved budget modifications",
};

export function CellDrillDown({
  open, onOpenChange, projectId, costCodeId, costCode, column,
}: CellDrillDownProps) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["drill", column, projectId, costCodeId],
    enabled: open,
    queryFn: async () => await fetchSource(column, projectId, costCodeId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {TITLE[column]}
            <Badge variant="outline" className="font-mono">{costCode}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center">
            No source rows feed this cell.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0">
                <tr>
                  <th className="p-2 text-left font-medium">Reference</th>
                  <th className="p-2 text-left font-medium">Description</th>
                  <th className="p-2 text-right font-medium">Amount</th>
                  <th className="p-2 text-left font-medium">Status / Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono text-xs">{r.ref ?? "—"}</td>
                    <td className="p-2">{r.description ?? "—"}</td>
                    <td className="p-2 text-right font-mono">{money(Number(r.amount ?? 0))}</td>
                    <td className="p-2 text-xs text-muted-foreground">{r.status_or_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function fetchSource(column: DrillColumn, projectId: string, costCodeId: string): Promise<any[]> {
  switch (column) {
    case "committed": {
      const { data } = await supabase
        .from("commitment_sov_lines" as any)
        .select("id, description, scheduled_value, commitment:commitments!inner(id, commitment_no, title, status, project_id)")
        .eq("cost_code_id", costCodeId);
      return (data ?? [])
        .filter((r: any) => r.commitment?.project_id === projectId && r.commitment?.status === "executed")
        .map((r: any) => ({
          ref: r.commitment.commitment_no,
          description: `${r.commitment.title} — ${r.description}`,
          amount: r.scheduled_value,
          status_or_date: r.commitment.status,
        }));
    }
    case "cco": {
      const { data } = await supabase
        .from("change_order_lines" as any)
        .select("id, description, amount, co:change_orders!inner(id, co_no, co_type, status, title, project_id)")
        .eq("cost_code_id", costCodeId);
      return (data ?? [])
        .filter((r: any) => r.co?.project_id === projectId && r.co?.co_type === "CCO" && r.co?.status === "executed")
        .map((r: any) => ({
          ref: `CCO-${r.co.co_no}`,
          description: `${r.co.title} — ${r.description}`,
          amount: r.amount,
          status_or_date: r.co.status,
        }));
    }
    case "direct": {
      const { data } = await supabase
        .from("direct_cost_lines" as any)
        .select("id, amount, direct_cost:direct_costs!inner(id, reference_no, cost_date, status, description, project_id)")
        .eq("cost_code_id", costCodeId);
      return (data ?? [])
        .filter((r: any) => r.direct_cost?.project_id === projectId && ["approved", "paid"].includes(r.direct_cost?.status))
        .map((r: any) => ({
          ref: r.direct_cost.reference_no ?? "—",
          description: r.direct_cost.description ?? "",
          amount: r.amount,
          status_or_date: `${r.direct_cost.status} · ${r.direct_cost.cost_date}`,
        }));
    }
    case "exposure": {
      const { data } = await supabase
        .from("change_event_lines" as any)
        .select("id, description, estimated_cost, event:change_events!inner(id, event_no, title, project_id)")
        .eq("cost_code_id", costCodeId)
        .eq("status_bucket", "pending");
      return (data ?? [])
        .filter((r: any) => r.event?.project_id === projectId)
        .map((r: any) => ({
          ref: `CE-${r.event.event_no}`,
          description: `${r.event.title} — ${r.description}`,
          amount: r.estimated_cost,
          status_or_date: "pending",
        }));
    }
    case "mods": {
      const { data } = await supabase
        .from("budget_modification_lines" as any)
        .select("amount, from_cost_code_id, to_cost_code_id, mod:budget_modifications!inner(id, mod_no, title, status, approved_at)")
        .or(`from_cost_code_id.eq.${costCodeId},to_cost_code_id.eq.${costCodeId}`);
      return (data ?? [])
        .filter((r: any) => r.mod?.status === "approved")
        .map((r: any) => {
          const direction = r.to_cost_code_id === costCodeId ? "+" : "−";
          return {
            ref: `BM-${r.mod.mod_no}`,
            description: r.mod.title,
            amount: direction === "+" ? r.amount : -r.amount,
            status_or_date: `approved ${r.mod.approved_at?.slice(0, 10) ?? ""}`,
          };
        });
    }
  }
}
