/**
 * VendorPaymentLedger — every disbursement to ONE subcontractor, oldest → newest,
 * with a running balance and a grand total. This is the "what have we actually
 * sent this vendor" view: date, method (wire / check / ACH), reference, the
 * invoice it paid, your note, and the amount.
 *
 * Deliberately dependency-light: it renders data and raises `onRecordPayment`
 * so the parent page owns the record dialog. Pulling a payment dialog in here
 * would drag the whole allocation-editor subgraph into this lazy route.
 */
import { useMemo } from "react";
import { Wallet, Plus, StickyNote, Receipt } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildVendorLedger, openOnInvoices, remainingOnContract } from "@/lib/financial/vendorLedger";
import type { VendorPayment } from "@/hooks/useVendorPayments";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export interface LedgerInvoice {
  id: string;
  invoice_no: string | null;
  status: string;
  billed: number;
}

export function VendorPaymentLedger({
  vendorName, payments, invoices, revisedValue, isLoading, onRecordPayment,
}: {
  vendorName: string;
  payments: VendorPayment[];
  /** This vendor's invoices — each row can be paid directly. */
  invoices: LedgerInvoice[];
  /** Original + approved SCOs, for the remaining-on-contract figure. */
  revisedValue: number;
  isLoading?: boolean;
  /** Open the parent's record-payment dialog for a given invoice. */
  onRecordPayment: (invoiceId: string) => void;
}) {
  // Oldest → newest with a running total, so this reads like a bank statement.
  const { rows, totalPaid } = useMemo(() => buildVendorLedger(payments), [payments]);

  const paidByInvoice = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (!p.commitment_invoice_id) continue;
      m.set(p.commitment_invoice_id, (m.get(p.commitment_invoice_id) ?? 0) + p.amount);
    }
    return m;
  }, [payments]);

  const billed = useMemo(() => invoices.reduce((s, i) => s + i.billed, 0), [invoices]);
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

      {/* Invoices — pay one directly */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Invoices
          </div>
          {invoices.length === 0 ? (
            <div className="p-5 text-center text-sm text-muted-foreground">
              No invoices for this vendor yet — create one on the Invoices tab, then pay it here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Billed</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const paid = paidByInvoice.get(i.id) ?? 0;
                    const bal = i.billed - paid;
                    return (
                      <tr key={i.id} className="border-t">
                        <td className="p-3 font-medium">{i.invoice_no ?? "—"}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-normal capitalize">{i.status}</Badge>
                        </td>
                        <td className="p-3 text-right font-mono">{fmt(i.billed)}</td>
                        <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(paid)}</td>
                        <td className={`p-3 text-right font-mono ${bal > 0.005 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(bal)}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => onRecordPayment(i.id)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Record payment
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment history */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Payment history
            {payments.length > 0 && (
              <span className="font-normal normal-case">
                · {payments.length} payment{payments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading payments…</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No payments recorded to this vendor yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Record a wire, check, or ACH against one of their invoices above to start the ledger.
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
                  {rows.map(({ payment: p, runningTotal }) => (
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
                          <div className="mt-1 flex items-start gap-1.5">
                            <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                            <span className="italic">{p.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-[var(--apas-sapphire)]">{fmt(p.amount)}</td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground">{fmt(runningTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="p-3" colSpan={4}>Total paid to {vendorName}</td>
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
