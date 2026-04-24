/**
 * D4 · ChangeOrderLineGrid — editable lines for a change_order.
 * Each line has cost_code_id, description, amount. The header `amount`
 * on the parent CO must equal the sum of lines at the moment the CO is
 * moved to `executed` (enforced by the validate_co_execute trigger).
 */
import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useChangeOrderLines, type ChangeOrderLine } from "@/hooks/useProcoreChangeOrders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CostCodePicker } from "@/components/shared/CostCodePicker";
import { money } from "@/lib/pdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function ChangeOrderLineGrid({
  coId, headerAmount, readOnly = false,
}: {
  coId: string;
  headerAmount: number;
  readOnly?: boolean;
}) {
  const { data: lines = [], addLine } = useChangeOrderLines(coId);
  const qc = useQueryClient();

  const [draftCode, setDraftCode] = useState<string | null>(null);
  const [draftDesc, setDraftDesc] = useState("");
  const [draftAmt, setDraftAmt] = useState<number>(0);

  const total = lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);
  const variance = total - headerAmount;
  const balanced = Math.abs(variance) < 0.01;

  async function handleAdd() {
    if (!draftCode || !draftDesc.trim() || !draftAmt) {
      toast.error("Cost code + description + amount required");
      return;
    }
    try {
      await addLine.mutateAsync({
        costCodeId: draftCode,
        description: draftDesc.trim(),
        amount: draftAmt,
      });
      setDraftCode(null); setDraftDesc(""); setDraftAmt(0);
    } catch (e: any) { toast.error(e.message); }
  }

  async function removeLine(id: string) {
    try {
      const { error } = await supabase
        .from("change_order_lines" as any).delete().eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["co-lines", coId] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-56 p-2 text-left font-medium">Cost code</th>
              <th className="p-2 text-left font-medium">Description</th>
              <th className="w-36 p-2 text-right font-medium">Amount</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr><td colSpan={readOnly ? 3 : 4} className="p-6 text-center text-muted-foreground">
                No lines. Header amount currently {money(headerAmount)}.
              </td></tr>
            )}
            {lines.map((l: ChangeOrderLine) => (
              <tr key={l.id} className="border-t">
                <td className="p-2 font-mono text-xs text-muted-foreground">
                  {l.cost_code_id.slice(0, 8)}
                </td>
                <td className="p-2">{l.description}</td>
                <td className="p-2 text-right font-mono">{money(Number(l.amount))}</td>
                {!readOnly && (
                  <td className="p-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => removeLine(l.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/20 font-medium">
            <tr className="border-t">
              <td colSpan={2} className="p-2 text-right">Line total</td>
              <td className="p-2 text-right font-mono">{money(total)}</td>
              {!readOnly && <td />}
            </tr>
            <tr className="border-t">
              <td colSpan={2} className="p-2 text-right text-muted-foreground">Header amount</td>
              <td className="p-2 text-right font-mono text-muted-foreground">{money(headerAmount)}</td>
              {!readOnly && <td />}
            </tr>
            <tr className="border-t">
              <td colSpan={2} className="p-2 text-right text-muted-foreground">Variance</td>
              <td className="p-2 text-right">
                <Badge variant={balanced ? "default" : "destructive"} className="font-mono">
                  {balanced ? "Balanced" : money(variance)}
                </Badge>
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
          {!readOnly && (
            <tbody>
              <tr className="border-t-2 bg-muted/10">
                <td className="p-2">
                  <CostCodePicker value={draftCode} onChange={setDraftCode} />
                </td>
                <td className="p-2">
                  <Input
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    placeholder="Line description"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    value={draftAmt}
                    onChange={(e) => setDraftAmt(Number(e.target.value) || 0)}
                    className="text-right font-mono"
                  />
                </td>
                <td className="p-2">
                  <Button size="sm" onClick={handleAdd} disabled={addLine.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
