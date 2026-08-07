/**
 * VendorPaymentLedger — every disbursement to ONE subcontractor, oldest → newest,
 * with a running balance and a grand total. This is the "what have we actually
 * sent this vendor" view: date, method (wire / check / ACH), reference, the
 * invoice it paid, your note, and the amount.
 *
 * Rendered on the vendor's own commitment page (Payments tab). Recording a
 * payment goes through the same RecordSubPaymentDialog used on the project-level
 * Payments page, so every entry lands in commitment_payments and rolls straight
 * into paid-to-subs on the project dashboard.
 */
import { useMemo, useState } from "react";
import { Wallet, Plus, StickyNote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVendorPayments } from "@/hooks/useVendorPayments";
import { buildVendorLedger, openOnInvoices, remainingOnContract } from "@/lib/financial/vendorLedger";
import { RecordSubPaymentDialog } from "@/components/financial/RecordSubPaymentDialog";
import type { CommitmentInvoiceBalance } from "@/hooks/useProjectFinancials";
import type { Commitment } from "@/hooks/useCommitments";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function VendorPaymentLedger({
  commitment, commitments, invoiceBalances, revisedValue,
}: {
  commitment: Commitment;
  /** All project commitments — the record dialog needs the full list. */
  commitments: Commitment[];
  invoiceBalances: CommitmentInvoiceBalance[];
  /** Original + approved SCOs, for the remaining-on-contract figure. */
  revisedValue: number;
}) {
  const { data: payments = [], isLoading } = useVendorPayments(commitment.id);
  const [payOpen, setPayOpen] = useState(false);

  const mine = useMemo(
    () => invoiceBalances.filter((i) => i.commitment_id === commitment.id),
    [invoiceBalances, commitment.id],
  );

  // Oldest → newest with a running total, so this reads like a bank statement.
  const { rows, totalPaid } = useMemo(() => buildVendorLedger(payments), [payments]);
  const billed = useMemo(() => mine.reduce((s, i) => s + i.billed_amount, 0), [mine]);
  const openBalance = openOnInvoices(billed, totalPaid);
  const contractLeft = remainingOnContract(revisedValue, totalPaid);

  return (
    <div className="space-y-4">
      {/* Money summary for THIS vendor */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Paid to date" value={fmt(totalPaid)} tone="text-[var(--apas-sapphire)]" />
        <Stat label="Invoiced" value={fmt(billed)} />
        <Stat
          label="Open on invoices"
          value={fmt(openBalance)}
          tone={openBalance > 0.005 ? "text-amber-600" : "text-emerald-600"}
        />
        <Stat
          label="Left on contract"
          value={fmt(contractLeft)}
          tone={contractLeft < -0.005 ? "text-destructive" : undefined}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Payment history
              {payments.length > 0 && (
                <span className="font-normal normal-case">
                  · {payments.length} payment{payments.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Record payment
            </Button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading payments…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No payments recorded to this vendor yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Record a wire, check, or ACH against one of their invoices to start the ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Method</th>
                    <th className="p-3 text-left">Reference</th>
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-right">Running total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ payment: p, runningTotal }) => {
                    return (
                      <tr key={p.id} className="border-t align-top hover:bg-muted/20">
                        <td className="whitespace-nowrap p-3 font-medium">{fmtDate(p.paid_date)}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-normal capitalize">
                            {p.method ?? "payment"}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{p.reference || "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <div>{p.invoice_no ?? "—"}</div>
                          {p.notes && (
                            <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="italic">{p.notes}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-medium text-[var(--apas-sapphire)]">
                          {fmt(p.amount)}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-muted-foreground">{fmt(runningTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="p-3" colSpan={4}>
                      Total paid to {vendorShortName(commitment)}
                    </td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totalPaid)}</td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Payments are recorded against an invoice, so this ledger reconciles with the invoice balances above and
        feeds “Paid to subs” on the project financial dashboard.
      </p>

      <RecordSubPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        commitments={commitments}
        invoiceBalances={invoiceBalances}
        defaultCommitmentId={commitment.id}
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function vendorShortName(c: Commitment) {
  return (c.title ?? "").split("—")[0].trim() || c.commitment_no;
}
