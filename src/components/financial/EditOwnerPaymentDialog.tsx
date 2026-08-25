import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type {
  AdminPrimeContractPayment,
  CorrectPrimePaymentInput,
} from "@/hooks/usePrimeContractPayments";

const METHODS = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH" },
  { value: "wire", label: "Wire" },
  { value: "card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to update receipt";
}

export function EditOwnerPaymentDialog({
  open,
  onOpenChange,
  payment,
  payAppLabel,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: AdminPrimeContractPayment | null;
  payAppLabel: string;
  onSave: (id: string, changes: CorrectPrimePaymentInput) => Promise<unknown>;
  isSaving: boolean;
}) {
  const [receivedDate, setReceivedDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("check");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !payment) return;
    setReceivedDate(payment.received_date);
    setAmount(String(payment.amount));
    setMethod(payment.method ?? "check");
    setReference(payment.reference ?? "");
    setNotes(payment.notes ?? "");
  }, [open, payment]);

  const numericAmount = Number(amount);
  const canSave = Boolean(payment && receivedDate && numericAmount > 0 && !isSaving);

  async function handleSave() {
    if (!payment || !canSave) return;
    try {
      await onSave(payment.id, {
        amount: numericAmount,
        received_date: receivedDate,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(`${money(numericAmount)} receipt updated`);
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(messageFor(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Correct Payment Received</DialogTitle>
          <DialogDescription>
            Update an unallocated owner receipt. Its contract and {payAppLabel} association remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This correction is available only before allocation. Once allocated, the receipt is locked to preserve the reconciliation and audit trail.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date received</Label>
              <Input type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Check #</Label>
              <Input value={reference} onChange={(event) => setReference(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving ? "Saving…" : "Save correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
