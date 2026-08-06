/**
 * Record a disbursement TO a subcontractor against one of their invoices.
 * The user is the prime contractor; this is money going OUT (accounts payable).
 * Surfaces the DB lien-gate and over-payment guards as friendly messages.
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
import { useCommitmentPayments, CommitmentPaymentError } from "@/hooks/useCommitmentPayments";
import { useCommitmentAllocationTargets, useCommitmentPaymentAllocations } from "@/hooks/useCommitmentPaymentAllocations";
import { PaymentAllocationEditor } from "@/components/financial/PaymentAllocationEditor";
import { validateAllocations, type AllocationDraft } from "@/lib/financial/paymentAllocation";
import type { CommitmentInvoiceBalance } from "@/hooks/useProjectFinancials";
import type { Commitment } from "@/hooks/useCommitments";

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

function vendorName(c?: Commitment) {
  if (!c) return "Subcontractor";
  return (c.title ?? "").split("—")[0].trim() || c.commitment_no;
}

export function RecordSubPaymentDialog({
  open, onOpenChange, commitments, invoiceBalances,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  commitments: Commitment[];
  invoiceBalances: CommitmentInvoiceBalance[];
}) {
  const [commitmentId, setCommitmentId] = useState<string>("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [paidDate, setPaidDate] = useState(today());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("check");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const commitment = useMemo(() => commitments.find((c) => c.id === commitmentId), [commitments, commitmentId]);
  const invoicesForCommitment = useMemo(
    () => invoiceBalances.filter((i) => i.commitment_id === commitmentId),
    [invoiceBalances, commitmentId],
  );
  const selected = useMemo(() => invoiceBalances.find((i) => i.commitment_invoice_id === invoiceId), [invoiceBalances, invoiceId]);
  const { create } = useCommitmentPayments(invoiceId || null);
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);
  const { data: allocTargets } = useCommitmentAllocationTargets(commitmentId || null);
  const { saveAll } = useCommitmentPaymentAllocations(null);

  useEffect(() => { setInvoiceId(""); setAllocations([]); }, [commitmentId]);
  useEffect(() => {
    if (selected) setAmount(selected.balance_due > 0 ? String(selected.balance_due) : "");
  }, [selected]);
  useEffect(() => {
    if (!open) {
      setCommitmentId(""); setInvoiceId(""); setPaidDate(today());
      setAmount(""); setMethod("check"); setReference(""); setNotes(""); setAllocations([]);
    }
  }, [open]);

  const amt = Number(amount);
  const overpays = selected != null && amt > selected.balance_due + 0.004;
  const lienBlocked = selected != null && !selected.lien_satisfied;
  const canSave = invoiceId && paidDate && amt > 0 && !overpays && !create.isPending && !saveAll.isPending;

  async function handleSave() {
    if (!canSave || !selected) return;
    const allocErrs = validateAllocations(amt, allocations);
    if (allocErrs.length) { toast.error(allocErrs[0]); return; }
    try {
      const created: any = await create.mutateAsync({
        commitment_id: selected.commitment_id,
        commitment_invoice_id: invoiceId,
        amount: amt,
        paid_date: paidDate,
        method,
        reference: reference || null,
        notes: notes || null,
      });
      if (allocations.length && created?.id) {
        await saveAll.mutateAsync({ paymentId: created.id, allocations });
      }
      toast.success(`Recorded ${money(amt)} paid to ${vendorName(commitment)}${allocations.length ? ` · split ${allocations.length} ways` : ""}`);
      onOpenChange(false);
    } catch (e: unknown) {
      const err = e as CommitmentPaymentError;
      toast.error(err?.message ?? "Failed to record payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment to Subcontractor</DialogTitle>
          <DialogDescription>
            Cash paid to a subcontractor against an invoice — optionally split across their base, change orders, or line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Subcontractor</Label>
            <Select value={commitmentId} onValueChange={setCommitmentId}>
              <SelectTrigger><SelectValue placeholder="Select a subcontractor" /></SelectTrigger>
              <SelectContent>
                {commitments.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{vendorName(c)} · {c.commitment_no}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Against invoice</Label>
            <Select value={invoiceId} onValueChange={setInvoiceId} disabled={!commitmentId}>
              <SelectTrigger>
                <SelectValue placeholder={commitmentId ? "Select their invoice" : "Pick a subcontractor first"} />
              </SelectTrigger>
              <SelectContent>
                {invoicesForCommitment.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No open invoices for this sub.</div>
                )}
                {invoicesForCommitment.map((i) => (
                  <SelectItem key={i.commitment_invoice_id} value={i.commitment_invoice_id}>
                    Invoice #{i.invoice_no ?? "—"} — {money(i.balance_due)} open of {money(i.billed_amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground">
                Billed {money(selected.billed_amount)} · paid {money(selected.paid_to_date)} ·
                <span className={selected.balance_due > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                  {" "}{money(selected.balance_due)} open
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date paid</Label>
              <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
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
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 2041" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {/* Split this payment across the sub's base / change orders / line items */}
          {commitmentId && (
            <div className="rounded-md border p-3">
              <PaymentAllocationEditor
                paymentAmount={amt || 0}
                value={allocations}
                onChange={setAllocations}
                targets={allocTargets}
                manageLineItemsHref={
                  commitment ? `/projects/${commitment.project_id}/financials/commitments/${commitment.id}?tab=sov` : undefined
                }
              />
            </div>
          )}

          {overpays && selected && (
            <p className="text-xs text-destructive">
              {money(amt)} exceeds the {money(selected.balance_due)} open on this invoice.
            </p>
          )}
          {lienBlocked && (
            <p className="text-xs text-amber-600">
              Heads up: this invoice has no approved lien release on file. The system may block the payment until a
              lien release is approved.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {create.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
