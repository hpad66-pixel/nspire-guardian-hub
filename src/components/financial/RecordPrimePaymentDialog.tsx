import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePayApp } from "@/hooks/usePayApp";
import { useAllocationTargets, usePaymentAllocations } from "@/hooks/usePaymentAllocations";
import { PaymentAllocationEditor } from "@/components/financial/PaymentAllocationEditor";
import { validateAllocations, type AllocationDraft } from "@/lib/financial/paymentAllocation";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  received_date: z.string().min(1, "Date required"),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payAppId: string;
}

/** Record an AR receipt (owner → us) against a pay app. Blocks over-payment. */
export function RecordPrimePaymentDialog({ open, onOpenChange, payAppId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { detail, payAppBalance, recordPayment } = usePayApp(payAppId);
  const bal = payAppBalance.data;
  const primeContractId = (detail.data as any)?.prime_contract_id ?? null;
  const { data: targets } = useAllocationTargets(primeContractId);
  const { saveAll } = usePaymentAllocations(null);
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { amount: undefined as unknown as number, received_date: today, method: "check", reference: "", notes: "" },
    });
  const amount = Number(watch("amount")) || 0;

  useEffect(() => {
    if (open) {
      reset({ amount: undefined as unknown as number, received_date: today, method: "check", reference: "", notes: "" });
      setAllocations([]);
      if (bal?.balance_due > 0) setValue("amount", Number(bal.balance_due));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bal?.balance_due]);

  const onSubmit = async (v: FormValues) => {
    const allocErrs = validateAllocations(v.amount, allocations);
    if (allocErrs.length) { toast.error(allocErrs[0]); return; }
    try {
      const created: any = await recordPayment.mutateAsync({
        amount: v.amount, received_date: v.received_date,
        method: v.method || null, reference: v.reference || null, notes: v.notes || null,
      });
      if (allocations.length && created?.id) {
        await saveAll.mutateAsync({ paymentId: created.id, allocations });
      }
      toast.success(`Recorded ${fmt(v.amount)} received`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment Received</DialogTitle>
          <DialogDescription>
            {bal
              ? <>Pay App #{bal.pay_app_no} · billed {fmt(bal.billed_amount)} · received {fmt(bal.received_to_date)} ·{" "}
                  <span className={bal.balance_due > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                    balance {fmt(bal.balance_due)}</span></>
              : "Owner receipt against this pay application."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Received date</Label>
              <Input type="date" {...register("received_date")} />
              {errors.received_date && <p className="text-xs text-destructive">{errors.received_date.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("method")}>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="wire">Wire</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input placeholder="Check # / ACH trace" {...register("reference")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>

          {/* Optional: split this receipt across base contract / change orders / line items */}
          <div className="rounded-md border p-3">
            <PaymentAllocationEditor
              paymentAmount={amount}
              value={allocations}
              onChange={setAllocations}
              targets={targets}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Recording…" : "Record Receipt"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
