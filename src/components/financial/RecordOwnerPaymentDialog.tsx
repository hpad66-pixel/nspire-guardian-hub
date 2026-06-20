/**
 * Record a cash receipt from the OWNER/CLIENT against a prime pay application.
 * The user is the prime contractor; this is money coming IN (accounts receivable).
 * The payment is applied to a specific Pay App (invoice) — which bundles the base
 * contract and any approved change orders billed in that period.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePrimeContractPayments } from "@/hooks/usePrimeContractPayments";
import type { PayAppBalance } from "@/hooks/useProjectFinancials";

// Values must match the DB check constraint (check/ach/wire/card/other).
const METHODS = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire" },
  { value: "card", label: "Credit Card" },
  { value: "other", label: "Other" },
];
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const today = () => new Date().toISOString().split("T")[0];

export function RecordOwnerPaymentDialog({
  open, onOpenChange, primeContractId, payApps,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  primeContractId: string;
  payApps: PayAppBalance[];
}) {
  const [payAppId, setPayAppId] = useState<string>("");
  const [receivedDate, setReceivedDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("check");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const selected = useMemo(() => payApps.find((p) => p.pay_app_id === payAppId), [payApps, payAppId]);
  const { create } = usePrimeContractPayments(payAppId || null);

  // Default the amount to the selected invoice's remaining balance.
  useEffect(() => {
    if (selected) setAmount(selected.balance_due > 0 ? String(selected.balance_due) : "");
  }, [selected]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setPayAppId(""); setReceivedDate(today()); setAmount("");
      setMethod("check"); setReference(""); setNotes("");
    }
  }, [open]);

  const amt = Number(amount);
  const overpays = selected != null && amt > selected.balance_due + 0.004;
  const canSave = payAppId && receivedDate && amt > 0 && !overpays && !create.isPending;

  function handleSave() {
    if (!canSave || !selected) return;
    create.mutate(
      {
        prime_contract_id: primeContractId,
        pay_app_id: payAppId,
        amount: amt,
        received_date: receivedDate,
        method,
        reference: reference || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success(`Recorded ${money(amt)} received against Pay App #${selected.pay_app_no}`);
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment Received</DialogTitle>
          <DialogDescription>
            Cash received from the owner/client against a prime pay application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* What is this payment against? */}
          <div className="space-y-1.5">
            <Label>Applies to invoice</Label>
            <Select value={payAppId} onValueChange={setPayAppId}>
              <SelectTrigger><SelectValue placeholder="Select the pay app this payment is against" /></SelectTrigger>
              <SelectContent>
                {[...payApps].sort((a, b) => a.pay_app_no - b.pay_app_no).map((p) => (
                  <SelectItem key={p.pay_app_id} value={p.pay_app_id}>
                    Pay App #{p.pay_app_no} — {money(p.balance_due)} open of {money(p.billed_amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground">
                Billed {money(selected.billed_amount)} · received {money(selected.received_to_date)} ·
                <span className={selected.balance_due > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  {" "}{money(selected.balance_due)} open
                </span>. This invoice covers base contract + any approved change orders for the period.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date received</Label>
              <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Check #</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 10428" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything worth recording about this receipt" />
          </div>

          {overpays && selected && (
            <p className="text-xs text-destructive">
              {money(amt)} exceeds the {money(selected.balance_due)} open on Pay App #{selected.pay_app_no}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {create.isPending ? "Recording…" : "Record Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
