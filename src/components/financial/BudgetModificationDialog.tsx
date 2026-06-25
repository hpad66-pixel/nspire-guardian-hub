/**
 * D6 · BudgetModificationDialog — formal budget transfer(s) between cost codes.
 *
 * Each line represents a balanced transfer ($amount FROM cost_code_A TO cost_code_B)
 * so the net across all lines is always zero by construction. Dialog stores the mod
 * as draft; approve step (in the parent) flips status to 'approved' which applies
 * the transfer to budget_matrix in real time.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { CostCodePicker } from "@/components/shared/CostCodePicker";
import { useBudgetModifications } from "@/hooks/useBudget";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

interface TransferDraft {
  id: string;
  fromCostCodeId: string | null;
  toCostCodeId: string | null;
  amount: number;
}

export function BudgetModificationDialog({
  open, onOpenChange, projectBudgetId, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectBudgetId: string;
  onCreated?: (modId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [transfers, setTransfers] = useState<TransferDraft[]>([
    { id: crypto.randomUUID(), fromCostCodeId: null, toCostCodeId: null, amount: 0 },
  ]);
  const { create } = useBudgetModifications(projectBudgetId);

  const total = transfers.reduce((s, t) => s + (t.amount || 0), 0);

  function addTransfer() {
    setTransfers([
      ...transfers,
      { id: crypto.randomUUID(), fromCostCodeId: null, toCostCodeId: null, amount: 0 },
    ]);
  }
  function remove(id: string) {
    setTransfers(transfers.filter((t) => t.id !== id));
  }
  function update(id: string, patch: Partial<TransferDraft>) {
    setTransfers(transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Title required"); return; }
    const valid = transfers.every((t) =>
      t.fromCostCodeId && t.toCostCodeId && t.fromCostCodeId !== t.toCostCodeId && t.amount > 0,
    );
    if (!valid) {
      toast.error("Every transfer needs distinct from/to cost codes and amount > 0");
      return;
    }
    try {
      const mod = await create.mutateAsync({
        title: title.trim(),
        transfers: transfers.map((t) => ({
          fromCostCodeId: t.fromCostCodeId!,
          toCostCodeId: t.toCostCodeId!,
          amount: t.amount,
        })),
      });
      toast.success(`Draft BM-${(mod as any).mod_no} created`);
      onCreated?.((mod as any).id);
      onOpenChange(false);
      setTitle("");
      setTransfers([{ id: crypto.randomUUID(), fromCostCodeId: null, toCostCodeId: null, amount: 0 }]);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New budget modification</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
                   placeholder="e.g. Shift contingency to structural steel" />
          </div>

          <div className="rounded-md border">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left font-medium">From cost code</th>
                  <th className="p-2 text-left font-medium">To cost code</th>
                  <th className="p-2 text-right font-medium w-32">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">
                      <CostCodePicker
                        value={t.fromCostCodeId}
                        onChange={(id) => update(t.id, { fromCostCodeId: id })}
                      />
                    </td>
                    <td className="p-2">
                      <CostCodePicker
                        value={t.toCostCodeId}
                        onChange={(id) => update(t.id, { toCostCodeId: id })}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number" inputMode="decimal" step="0.01" min="0"
                        value={t.amount}
                        onChange={(e) => update(t.id, { amount: Number(e.target.value) || 0 })}
                        className="text-right font-mono"
                      />
                    </td>
                    <td className="p-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => remove(t.id)} disabled={transfers.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/20 font-medium">
                <tr className="border-t">
                  <td colSpan={2} className="p-2 text-right">Gross transferred</td>
                  <td className="p-2 text-right font-mono">{money(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table></div>
          </div>

          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={addTransfer}>
              <Plus className="h-4 w-4 mr-1" /> Add transfer
            </Button>
            <p className="text-xs text-muted-foreground">
              Each line is balanced by construction — same amount leaves one cost code and enters another.
              Net impact on total budget: always $0.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save as draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
