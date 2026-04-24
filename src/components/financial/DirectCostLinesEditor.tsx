/**
 * Shared line-editor used by Invoice / Timecard / Expense entry forms.
 * Every direct_cost_line carries a cost_code_id; for timecards we also edit
 * hours + rate and auto-compute amount = hours × rate.
 */
import { useState, useCallback } from "react";
import { Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CostCodePicker } from "@/components/shared/CostCodePicker";
import { money } from "@/lib/pdf";

export interface DirectCostLineDraft {
  id: string;
  cost_code_id: string | null;
  amount: number;
  hours?: number | null;
  rate?: number | null;
}

export function DirectCostLinesEditor({
  lines, onChange, costType,
}: {
  lines: DirectCostLineDraft[];
  onChange: (next: DirectCostLineDraft[]) => void;
  costType: "invoice" | "timecard" | "expense";
}) {
  const showHoursRate = costType === "timecard";

  const update = useCallback(
    (id: string, patch: Partial<DirectCostLineDraft>) => {
      onChange(
        lines.map((l) => {
          if (l.id !== id) return l;
          const next = { ...l, ...patch };
          if (showHoursRate) {
            const h = next.hours ?? 0;
            const r = next.rate ?? 0;
            next.amount = Number((h * r).toFixed(2));
          }
          return next;
        }),
      );
    },
    [lines, onChange, showHoursRate],
  );

  function addLine() {
    onChange([
      ...lines,
      {
        id: `draft-${crypto.randomUUID()}`,
        cost_code_id: null, amount: 0,
        hours: showHoursRate ? 0 : null,
        rate: showHoursRate ? 0 : null,
      },
    ]);
  }

  function remove(id: string) {
    onChange(lines.filter((l) => l.id !== id));
  }

  const total = lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-2 text-left font-medium w-64">Cost code</th>
              {showHoursRate && (
                <>
                  <th className="p-2 text-right font-medium w-24">Hours</th>
                  <th className="p-2 text-right font-medium w-24">Rate</th>
                </>
              )}
              <th className="p-2 text-right font-medium w-32">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={showHoursRate ? 5 : 3} className="p-6 text-center text-muted-foreground">
                  No lines yet.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">
                  <CostCodePicker
                    value={l.cost_code_id}
                    onChange={(id) => update(l.id, { cost_code_id: id })}
                  />
                </td>
                {showHoursRate && (
                  <>
                    <td className="p-1">
                      <Input
                        type="number" inputMode="decimal" step="0.25" min="0"
                        value={l.hours ?? 0}
                        onChange={(e) => update(l.id, { hours: Number(e.target.value) || 0 })}
                        className="text-right font-mono"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number" inputMode="decimal" step="0.01" min="0"
                        value={l.rate ?? 0}
                        onChange={(e) => update(l.id, { rate: Number(e.target.value) || 0 })}
                        className="text-right font-mono"
                      />
                    </td>
                  </>
                )}
                <td className="p-1">
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    value={l.amount}
                    onChange={(e) => update(l.id, { amount: Number(e.target.value) || 0 })}
                    className="text-right font-mono"
                    disabled={showHoursRate}
                  />
                </td>
                <td className="p-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => remove(l.id)} title="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/20 font-medium">
            <tr className="border-t">
              <td colSpan={showHoursRate ? 3 : 1} className="p-2 text-right">Total</td>
              <td className="p-2 text-right font-mono">{money(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addLine}>
        <Plus className="h-4 w-4 mr-1" /> Add line
      </Button>
    </div>
  );
}
