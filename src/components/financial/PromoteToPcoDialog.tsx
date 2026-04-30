/**
 * D3 · PromoteToPcoDialog — multi-select change-event lines → one PCO.
 *
 * Opens from ChangeEventDetailPage. Shows the checked line IDs, prompts for a
 * PCO title, resolves the prime contract for the project, calls
 * useChangeEventLines().promoteToPco which creates a change_orders row with
 * co_type='PCO', copies the selected lines into change_order_lines, and flips
 * the source event lines to status_bucket='approved' with pco_id set.
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChangeEventLines } from "@/hooks/useChangeEvents";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

export interface PromoteToPcoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  projectId: string;
  selectedLineIds: string[];
  onPromoted?: (pcoId: string) => void;
}

export function PromoteToPcoDialog({
  open, onOpenChange, eventId, projectId, selectedLineIds, onPromoted,
}: PromoteToPcoDialogProps) {
  const { data: lines = [], promoteToPco } = useChangeEventLines(eventId);
  const { data: prime } = usePrimeContract(projectId);

  const [title, setTitle] = useState("");

  const selectedLines = useMemo(
    () => lines.filter((l) => selectedLineIds.includes(l.id)),
    [lines, selectedLineIds],
  );
  const totalAmount = useMemo(
    () => selectedLines.reduce((s, l) => s + Number(l.estimated_cost ?? 0), 0),
    [selectedLines],
  );

  async function handlePromote() {
    if (!prime) { toast.error("No prime contract on this project — create one first"); return; }
    if (!title.trim()) { toast.error("PCO title is required"); return; }
    if (selectedLines.length === 0) { toast.error("Select at least one line"); return; }
    try {
      const pco = await promoteToPco.mutateAsync({
        projectId,
        primeContractId: prime.id,
        title: title.trim(),
        lineIds: selectedLineIds,
      });
      toast.success(`PCO created for ${money(totalAmount)}`);
      onPromoted?.((pco as any).id);
      onOpenChange(false);
      setTitle("");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Promote to Potential Change Order (PCO)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>PCO title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unforeseen foundation work"
            />
          </div>
          <div className="rounded-md border">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/40 text-sm font-medium">
              <span>Selected lines ({selectedLines.length})</span>
              <Badge className="font-mono">{money(totalAmount)}</Badge>
            </div>
            <div className="divide-y text-sm max-h-56 overflow-y-auto">
              {selectedLines.length === 0 ? (
                <div className="p-4 text-muted-foreground">
                  No lines selected. Close, check some lines in the grid, then reopen.
                </div>
              ) : selectedLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between px-3 py-2">
                  <div>{l.description}</div>
                  <span className="font-mono">{money(Number(l.estimated_cost))}</span>
                </div>
              ))}
            </div>
          </div>
          {!prime && (
            <div className="text-sm text-destructive">
              This project has no Prime Contract yet. Create one before promoting lines to a PCO.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handlePromote}
            disabled={!prime || selectedLines.length === 0 || !title.trim() || promoteToPco.isPending}
          >
            {promoteToPco.isPending ? "Creating PCO…" : "Create PCO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
