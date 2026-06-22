/**
 * ReopenCoDialog — admin action to reopen a signed/executed change order for a
 * content amendment when the client asks for changes. Clears the signatures,
 * returns the CO to Draft (so the existing inline editor + re-sign + re-send
 * flow applies), and records the reason in the amendment audit trail. The CO
 * stops counting as executed until it's re-signed with a new date.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useReopenChangeOrder } from "@/hooks/useProcoreChangeOrders";
import { coLabel } from "@/lib/changeOrder/coLabel";

interface ReopenCo {
  id: string;
  co_no: number | null;
  co_type: string | null;
  amendment_history?: Array<{ reason: string; at: string; from_status?: string }> | null;
}

export function ReopenCoDialog({
  open, onOpenChange, co, onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  co: ReopenCo;
  onDone?: () => void;
}) {
  const reopen = useReopenChangeOrder();
  const [reason, setReason] = useState("");
  const label = coLabel(co.co_type, co.co_no);
  const history = Array.isArray(co.amendment_history) ? co.amendment_history : [];

  async function submit() {
    try {
      await reopen.mutateAsync({ coId: co.id, reason });
      toast.success(`${label} reopened for editing. Edit the content, then re-sign & re-send with a new date.`);
      setReason("");
      onOpenChange(false);
      onDone?.();
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reopen {label} for editing</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Use this when the client asks to change the <strong>content</strong> of a signed change order.
            It clears the signatures and returns {label} to <strong>Draft</strong> so you can edit it inline,
            then re-sign and re-send with a new date — a clean audit trail instead of editing locked content.
          </p>
          <p className="text-sm text-[var(--apas-amber)]">
            While reopened, {label} no longer counts as executed in the contract totals until you re-sign it.
          </p>
          <div>
            <Label>Reason (required)</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested revised scope language in section 2." />
          </div>
          {history.length > 0 && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              <div className="font-medium mb-1">Amendment history</div>
              {history.map((h, i) => (
                <div key={i}>{h.reason} · {new Date(h.at).toLocaleDateString()}</div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={reopen.isPending || !reason.trim()}>
            {reopen.isPending ? "Reopening…" : "Reopen for editing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
