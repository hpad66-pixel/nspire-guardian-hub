/**
 * RenumberCoDialog — admin-only override to change an executed/locked change
 * order's number. co_no is a reference label (not money) and is permitted by
 * the lock guard, so this keeps status/amount/signed content untouched, records
 * an audited reason, and validates the new number is free for the project+type.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRenumberChangeOrder } from "@/hooks/useProcoreChangeOrders";
import { coLabel } from "@/lib/changeOrder/coLabel";

interface RenumberCo {
  id: string;
  co_no: number | null;
  co_type: string | null;
  co_no_history?: Array<{ from: number; to: number; reason: string; at: string }> | null;
}

export function RenumberCoDialog({
  open, onOpenChange, co, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  co: RenumberCo;
  onDone?: () => void;
}) {
  const renumber = useRenumberChangeOrder();
  const [newNo, setNewNo] = useState("");
  const [reason, setReason] = useState("");

  const type = co.co_type ?? "CO";
  const label = coLabel(co.co_type, co.co_no);
  const history = Array.isArray(co.co_no_history) ? co.co_no_history : [];

  async function submit() {
    try {
      const n = parseInt(newNo, 10);
      const res = await renumber.mutateAsync({ coId: co.id, newCoNo: n, reason });
      const newLabel = coLabel(co.co_type, n);
      toast.success(
        res.specUpdated
          ? `Renumbered to ${newLabel}. Document, email, and PDF now use the new number.`
          : `Renumbered to ${newLabel}. Note: this CO has no generated document — a previously uploaded signed scan keeps its printed number.`,
      );
      setNewNo(""); setReason("");
      onOpenChange(false);
      onDone?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Renumber {label}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Admin override. This changes only the change-order <strong>number</strong> — status,
            amount, and signed content are untouched. The previously signed PDF still shows the old
            number, so re-issue the document if the client needs the new number on paper.
          </p>
          <div>
            <Label>New change-order number</Label>
            <Input type="number" inputMode="numeric" min={1} value={newNo}
              onChange={(e) => setNewNo(e.target.value)} placeholder="e.g. 9" />
          </div>
          <div>
            <Label>Reason (required)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={`e.g. Client requested ${label} be renumbered to match their CO log.`} />
          </div>
          {history.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              <div className="font-medium mb-1">Renumber history</div>
              {history.map((h, i) => (
                <div key={i}>
                  #{h.from} → #{h.to} · {h.reason} · {new Date(h.at).toLocaleDateString()}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={renumber.isPending || !newNo || !reason.trim()}>
            {renumber.isPending ? "Saving…" : "Renumber"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
