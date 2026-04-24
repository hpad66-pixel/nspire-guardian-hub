/**
 * D6 · BudgetMatrixGrid — the budget matrix rendered as a sticky-first-column
 * grid with 11 derived columns. Clicking a numeric cell opens CellDrillDown.
 * Red-accented rows for negative variance.
 */
import { useState } from "react";
import type { BudgetMatrixRow } from "@/hooks/useBudget";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { CellDrillDown, type DrillColumn } from "./CellDrillDown";

export interface BudgetMatrixGridProps {
  rows: BudgetMatrixRow[];
  projectId?: string;
}

const COL_LABELS: Array<{ key: keyof BudgetMatrixRow; label: string; drill?: DrillColumn }> = [
  { key: "original_budget",       label: "Original",        drill: undefined },
  { key: "approved_budget_mods",  label: "Mods",            drill: "mods" },
  { key: "revised_budget",        label: "Revised",         drill: undefined },
  { key: "committed_cost",        label: "Committed",       drill: "committed" },
  { key: "executed_cco",          label: "CCO",             drill: "cco" },
  { key: "direct_cost",           label: "Direct",          drill: "direct" },
  { key: "pending_exposure",      label: "Exposure",        drill: "exposure" },
  { key: "forecast_to_complete",  label: "Forecast",        drill: undefined },
  { key: "variance",              label: "Variance",        drill: undefined },
];

export function BudgetMatrixGrid({ rows, projectId }: BudgetMatrixGridProps) {
  const [drill, setDrill] = useState<{
    costCodeId: string;
    costCode: string;
    column: DrillColumn;
  } | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-10 text-center text-muted-foreground">
        No budget lines yet. Add cost-code rows to start tracking.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="sticky left-0 bg-muted/60 p-2 text-left font-medium w-56 border-r">
                Cost code
              </th>
              {COL_LABELS.map((c) => (
                <th key={c.key} className="p-2 text-right font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const over = Number(r.variance) < 0;
              return (
                <tr key={r.cost_code_id} className={`border-t ${over ? "bg-destructive/5" : ""}`}>
                  <td className="sticky left-0 bg-background p-2 font-mono text-xs border-r">
                    <div className="text-muted-foreground">{r.cost_code}</div>
                    <div className="text-xs font-normal">{r.cost_code_desc}</div>
                  </td>
                  {COL_LABELS.map((c) => {
                    const val = Number(r[c.key]);
                    const clickable = c.drill != null && projectId != null;
                    return (
                      <td
                        key={c.key}
                        className={`p-2 text-right font-mono ${
                          clickable ? "cursor-pointer hover:underline" : ""
                        } ${c.key === "variance" && over ? "text-destructive font-bold" : ""}`}
                        onClick={() => {
                          if (clickable) {
                            setDrill({
                              costCodeId: r.cost_code_id,
                              costCode: r.cost_code,
                              column: c.drill!,
                            });
                          }
                        }}
                      >
                        {money(val)}
                        {c.key === "variance" && over && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">Over</Badge>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drill && projectId && (
        <CellDrillDown
          open={!!drill}
          onOpenChange={(o) => !o && setDrill(null)}
          projectId={projectId}
          costCodeId={drill.costCodeId}
          costCode={drill.costCode}
          column={drill.column}
        />
      )}
    </>
  );
}
