/**
 * D4 · PromoteToOcoDialog — converts an approved PCO into an executed OCO.
 *
 * Calls usePromoteToOco (from useProcoreChangeOrders) which creates a new
 * change_orders row with co_type='OCO', status='executed', parent_pco_id set,
 * and copies the PCO's line items over.
 */
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePromoteToOco, type ChangeOrder } from "@/hooks/useProcoreChangeOrders";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

export function PromoteToOcoDialog({
  open, onOpenChange, pco, onPromoted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pco: ChangeOrder;
  onPromoted?: (ocoId: string) => void;
}) {
  const promote = usePromoteToOco();

  async function handleGo() {
    try {
      const oco = await promote.mutateAsync(pco.id);
      toast.success(`OCO-${(oco as any).co_no} created and executed`);
      onPromoted?.((oco as any).id);
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote PCO → OCO</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            This will create an executed Owner Change Order (OCO) with the same amount
            and lines as PCO-{String(pco.co_no).padStart(4, "0")}.
          </p>
          <p className="text-muted-foreground">
            The OCO lifts revised_contract_value on the Prime Contract immediately.
            This action is not reversible — use a reversing CO to undo.
          </p>
          <div className="rounded-md border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{pco.title}</div>
              <div className="text-xs text-muted-foreground">
                PCO-{String(pco.co_no).padStart(4, "0")} · current status {pco.status}
              </div>
            </div>
            <span className="font-mono">{money(Number(pco.amount))}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleGo} disabled={promote.isPending}>
            {promote.isPending ? "Promoting…" : "Create executed OCO"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
