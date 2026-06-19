import { useEffect } from "react";
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
import { AlertCircle } from "lucide-react";
import { useInvoice } from "@/hooks/useInvoices";
import { gateExplainer } from "@/lib/financial/lien";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paid_date: z.string().min(1, "Date required"),
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
  /** The commitment invoice being paid. Null when no invoice exists yet. */
  invoiceId: string | null;
}

/**
 * Record an AP payment (us → sub). Disabled with an explainer when there is no
 * invoice or the lien gate is not satisfied. The DB enforces both regardless.
 */
export function RecordCommitmentPaymentDialog({ open, onOpenChange, invoiceId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { balance, isGated, recordPayment } = useInvoice(invoiceId);
  const bal = balance.data;
  const gated = isGated("progress");

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { amount: undefined as unknown as number, paid_date: today, method: "check", reference: "", notes: "" },
    });

  useEffect(() => {
    if (open) {
      reset({ amount: undefined as unknown as number, paid_date: today, method: "check", reference: "", notes: "" });
      if (bal?.balance_due > 0) setValue("amount", Number(bal.balance_due));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bal?.balance_due]);

  const blocked = !invoiceId || gated;

  const onSubmit = async (v: FormValues) => {
    try {
      await recordPayment.mutateAsync({
        amount: v.amount, paid_date: v.paid_date,
        method: v.method || null, reference: v.reference || null, notes: v.notes || null,
      });
      toast.success(`Recorded ${fmt(v.amount)} paid`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment to Vendor</DialogTitle>
          <DialogDescription>
            {bal
              ? <>Invoice {bal.invoice_no} · billed {fmt(bal.billed_amount)} · paid {fmt(bal.paid_to_date)} ·{" "}
                  <span className={bal.balance_due > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                    balance {fmt(bal.balance_due)}</span></>
              : "Disbursement against a received vendor invoice."}
          </DialogDescription>
        </DialogHeader>

        {!invoiceId && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>No invoice received yet. A vendor must submit an invoice before any payment can be recorded.</span>
          </div>
        )}
        {invoiceId && gated && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{gateExplainer("progress")} Approve an inbound lien release first.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={blocked} className="space-y-4 disabled:opacity-50">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Paid date</Label>
                <Input type="date" {...register("paid_date")} />
                {errors.paid_date && <p className="text-xs text-destructive">{errors.paid_date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("method")}>
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
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || blocked}>
              {isSubmitting ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
