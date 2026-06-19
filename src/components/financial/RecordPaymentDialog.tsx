import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useProjectContracts } from "@/hooks/useProjectContracts";
import {
  useContractInvoices, useContractChangeOrders, useContractPayments, useInvoiceBalances,
} from "@/hooks/useContractFinancials";

const schema = z.object({
  direction: z.enum(["received", "paid"]),
  contract_id: z.string().uuid({ message: "Select a contract" }),
  invoice_id: z.string().uuid().optional().or(z.literal("")),
  change_order_id: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  payment_date: z.string().min(1, "Date required"),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// Radix Select forbids an empty-string item value; use a sentinel for "None".
const NONE = "__none__";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  /** Pre-select a contract (and lock the picker) when opened from a contract view. */
  defaultContractId?: string;
  defaultInvoiceId?: string;
  defaultDirection?: "received" | "paid";
}

export function RecordPaymentDialog({
  open, onOpenChange, projectId,
  defaultContractId, defaultInvoiceId, defaultDirection = "received",
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: contracts = [] } = useProjectContracts(projectId);
  const { data: balances = [] } = useInvoiceBalances(projectId);

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      direction: defaultDirection,
      contract_id: defaultContractId ?? "",
      invoice_id: defaultInvoiceId ?? "",
      change_order_id: "",
      amount: undefined as unknown as number,
      payment_date: today,
      payment_method: "check",
      reference: "",
      notes: "",
    },
  });

  const contractId = watch("contract_id");
  const invoiceId = watch("invoice_id");

  const { data: invoices = [] } = useContractInvoices(contractId);
  const { data: changeOrders = [] } = useContractChangeOrders(contractId);
  const { create } = useContractPayments(contractId);

  // Selected invoice's outstanding balance — pre-fills amount for convenience.
  const selectedBalance = useMemo(
    () => balances.find((b) => b.invoice_id === invoiceId),
    [balances, invoiceId],
  );

  // When an invoice is chosen, default the amount to its remaining balance.
  useEffect(() => {
    if (selectedBalance && selectedBalance.balance_due > 0) {
      setValue("amount", Number(selectedBalance.balance_due.toFixed(2)));
    }
  }, [selectedBalance, setValue]);

  useEffect(() => {
    if (open) {
      reset({
        direction: defaultDirection,
        contract_id: defaultContractId ?? "",
        invoice_id: defaultInvoiceId ?? "",
        change_order_id: "",
        amount: undefined as unknown as number,
        payment_date: today,
        payment_method: "check",
        reference: "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (v: FormValues) => {
    try {
      await create.mutateAsync({
        contract_id: v.contract_id,
        payment_date: v.payment_date,
        amount: v.amount,
        direction: v.direction,
        invoice_id: v.invoice_id || null,
        change_order_id: v.change_order_id || null,
        reference: v.reference || null,
        payment_method: v.payment_method || null,
        notes: v.notes || null,
      });
      toast.success(`Recorded ${fmt(v.amount)} ${v.direction === "received" ? "received" : "paid"}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a full or partial payment against an invoice / pay app, optionally tied to a change order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received (from owner)</SelectItem>
                      <SelectItem value="paid">Paid (to sub / vendor)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" {...register("payment_date")} />
              {errors.payment_date && <p className="text-xs text-destructive">{errors.payment_date.message}</p>}
            </div>
          </div>

          {/* Contract */}
          <div className="space-y-1.5">
            <Label>Contract</Label>
            <Controller
              control={control}
              name="contract_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!defaultContractId}>
                  <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_number ? `${c.contract_number} — ` : ""}{c.contract_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.contract_id && <p className="text-xs text-destructive">{errors.contract_id.message}</p>}
          </div>

          {/* Invoice / pay app */}
          <div className="space-y-1.5">
            <Label>Against invoice / pay app</Label>
            <Controller
              control={control}
              name="invoice_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!contractId}>
                  <SelectTrigger><SelectValue placeholder={contractId ? "Select invoice" : "Pick a contract first"} /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => {
                      const bal = balances.find((b) => b.invoice_id === inv.id);
                      const label = inv.invoice_kind === "pay_app" && inv.pay_app_no
                        ? `Pay App #${inv.pay_app_no}`
                        : inv.invoice_number ?? "Invoice";
                      return (
                        <SelectItem key={inv.id} value={inv.id}>
                          {label} · {fmt(inv.amount)}{bal ? ` (bal ${fmt(bal.balance_due)})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {selectedBalance && (
              <p className="text-xs text-muted-foreground">
                Net due {fmt(selectedBalance.net_due)} · paid {fmt(selectedBalance.paid_to_date)} ·{" "}
                <span className={selectedBalance.balance_due > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  balance {fmt(selectedBalance.balance_due)}
                </span>
              </p>
            )}
          </div>

          {/* Change order (optional) */}
          <div className="space-y-1.5">
            <Label>Against change order <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Controller
              control={control}
              name="change_order_id"
              render={({ field }) => (
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  disabled={!contractId}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {changeOrders.map((co) => (
                      <SelectItem key={co.id} value={co.id}>
                        {co.co_number ?? "CO"} · {fmt(co.amount)} — {co.description.slice(0, 40)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Amount + method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="ach">ACH / Wire</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reference <span className="text-muted-foreground font-normal">(check #, confirmation)</span></Label>
            <Input placeholder="e.g. Check 1042" {...register("reference")} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Optional memo" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
