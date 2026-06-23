/**
 * AllocatePaymentDialog — split (or re-split) an already-recorded payment across
 * the base contract / change orders / line items. Loads any existing allocations,
 * lets the user edit them, and replaces them on save.
 */
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAllocationTargets, usePaymentAllocations } from "@/hooks/usePaymentAllocations";
import { PaymentAllocationEditor } from "@/components/financial/PaymentAllocationEditor";
import { validateAllocations, type AllocationDraft } from "@/lib/financial/paymentAllocation";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

export function AllocatePaymentDialog({
  open, onOpenChange, payment, primeContractId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment: { id: string; amount: number; reference?: string | null; received_date?: string | null } | null;
  primeContractId: string | null;
}) {
  const { data: targets } = useAllocationTargets(primeContractId);
  const { data: existing, saveAll } = usePaymentAllocations(payment?.id ?? null);
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);

  useEffect(() => {
    if (open && existing) {
      setAllocations(existing.map((a) => ({
        kind: a.kind, change_order_id: a.change_order_id, sov_line_item_id: a.sov_line_item_id, amount: Number(a.amount),
      })));
    }
  }, [open, existing]);

  async function save() {
    if (!payment) return;
    const errs = validateAllocations(payment.amount, allocations);
    if (errs.length) { toast.error(errs[0]); return; }
    try {
      await saveAll.mutateAsync({ paymentId: payment.id, allocations });
      toast.success("Allocation saved.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't save allocation");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Allocate payment</DialogTitle>
          <DialogDescription>
            {payment ? <>Splitting {fmt(payment.amount)}{payment.reference ? ` · ${payment.reference}` : ""}{payment.received_date ? ` · ${payment.received_date}` : ""}.</> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border p-3">
          <PaymentAllocationEditor
            paymentAmount={payment?.amount ?? 0}
            value={allocations}
            onChange={setAllocations}
            targets={targets}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saveAll.isPending}>{saveAll.isPending ? "Saving…" : "Save allocation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
