/**
 * D6 · BudgetSnapshotDialog — captures the current budget_matrix into
 * budget_snapshots.payload as immutable jsonb, tagged with period_end.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBudgetSnapshots } from "@/hooks/useBudget";
import { toast } from "sonner";

export function BudgetSnapshotDialog({
  open, onOpenChange, projectBudgetId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectBudgetId: string;
}) {
  const { capture } = useBudgetSnapshots(projectBudgetId);
  const [periodEnd, setPeriodEnd] = useState(() => {
    const d = new Date();
    d.setDate(0); // last day of prior month
    return d.toISOString().split("T")[0];
  });

  async function handleCapture() {
    if (!periodEnd) { toast.error("Period end is required"); return; }
    try {
      await capture.mutateAsync({ periodEnd });
      toast.success(`Snapshot captured for ${periodEnd}`);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capture budget snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Freezes the current budget matrix into an immutable jsonb payload tagged
            with the period end. Typically used for month-end close.
          </p>
          <div>
            <Label>Period end</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCapture} disabled={capture.isPending}>
            {capture.isPending ? "Capturing…" : "Capture snapshot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
