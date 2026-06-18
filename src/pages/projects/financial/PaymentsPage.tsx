import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractInvoices, useContractPayments } from "@/hooks/useContractFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Receipt, AlertCircle, ShieldCheck, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function exportPaymentsCsv(payments: any[], invoices: any[], contractNumber: string) {
  const headers = ["Date","Reference","Method","Amount","Running Total"];
  let running = 0;
  const rows = [...payments]
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date))
    .map(p => {
      running += p.amount;
      return [fmtDate(p.payment_date), p.reference ?? "", p.payment_method ?? "check", fmt(p.amount), fmt(running)];
    });
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `payments-${contractNumber}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function PaymentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading: loadingC } = useProjectContracts(projectId!);
  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;
  const { data: invoices = [], isLoading: loadingI } = useContractInvoices(contract?.id ?? "");
  const { data: payments = [], isLoading: loadingP } = useContractPayments(contract?.id ?? "");

  const isLoading = loadingC || loadingI || loadingP;

  // Financials
  const totalBilled    = invoices.reduce((s, i) => s + i.amount, 0);
  const totalRetainage = invoices.reduce((s, i) => s + i.retainage, 0);
  const totalNetDue    = invoices.reduce((s, i) => s + (i.net_due ?? (i.amount - i.retainage)), 0);
  const totalPaid      = payments.reduce((s, p) => s + p.amount, 0);
  const outstanding    = totalNetDue - totalPaid;

  // Payments sorted chronologically for running total
  const sortedPayments = [...payments].sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  let runningTotal = 0;
  const paymentsWithRunning = sortedPayments.map(p => {
    runningTotal += p.amount;
    return { ...p, runningTotal };
  });

  // Invoice billing summary — what's owed per pay app
  const invoicesSorted = [...invoices].sort((a, b) =>
    (a.invoice_number ?? "").localeCompare(b.invoice_number ?? "")
  );

  const kpis = [
    {
      label: "Total Billed",
      value: fmt(totalBilled),
      sub: `${invoices.length} pay application${invoices.length !== 1 ? "s" : ""}`,
      icon: Receipt,
      color: "text-foreground",
    },
    {
      label: "Retainage Held",
      value: fmt(totalRetainage),
      sub: `${totalBilled > 0 ? ((totalRetainage / totalBilled) * 100).toFixed(1) : 0}% of billed`,
      icon: ShieldCheck,
      color: "text-amber-600",
    },
    {
      label: "Net Certified",
      value: fmt(totalNetDue),
      sub: "Billed minus retainage",
      icon: Receipt,
      color: "text-[var(--apas-sapphire)]",
    },
    {
      label: "Total Paid",
      value: fmt(totalPaid),
      sub: `${payments.length} payment${payments.length !== 1 ? "s" : ""}`,
      icon: CreditCard,
      color: "text-emerald-600",
    },
    {
      label: outstanding > 0 ? "Outstanding" : "Net Position",
      value: fmt(Math.abs(outstanding)),
      sub: outstanding > 0 ? "Net certified unpaid" : "Overpaid vs net certified",
      icon: AlertCircle,
      color: outstanding > 0 ? "text-destructive" : "text-emerald-600",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <CreditCard className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Payments Received</h1>
            <p className="text-muted-foreground text-sm">
              {contract
                ? `${contract.contract_number} — ${contract.contract_title}`
                : "Prime contract payment history"}
            </p>
          </div>
        </div>
        {payments.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportPaymentsCsv(payments, invoices, contract?.contract_number ?? "PC")}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Billing vs Payment Summary by Invoice */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Invoice Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : invoicesSorted.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3">Pay App</th>
                    <th className="text-left p-3">Period</th>
                    <th className="text-right p-3">Gross Billed</th>
                    <th className="text-right p-3">Retainage</th>
                    <th className="text-right p-3">Net Certified</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesSorted.map(inv => {
                    const net = inv.net_due ?? (inv.amount - inv.retainage);
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-mono font-medium">{inv.invoice_number ?? "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                        </td>
                        <td className="p-3 text-right font-mono">{fmt(inv.amount)}</td>
                        <td className="p-3 text-right font-mono text-amber-600">({fmt(inv.retainage)})</td>
                        <td className="p-3 text-right font-mono font-semibold text-[var(--apas-sapphire)]">{fmt(net)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === "paid"      ? "bg-blue-100 text-blue-800" :
                            inv.status === "approved"  ? "bg-green-100 text-green-800" :
                            inv.status === "submitted" ? "bg-amber-100 text-amber-800" :
                            "bg-gray-100 text-gray-700"
                          }`}>{inv.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t">
                    <td colSpan={2} className="p-3 text-right">Totals</td>
                    <td className="p-3 text-right font-mono">{fmt(totalBilled)}</td>
                    <td className="p-3 text-right font-mono text-amber-600">({fmt(totalRetainage)})</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totalNetDue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History with Running Total */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : paymentsWithRunning.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Reference</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-right p-3">Cumulative Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsWithRunning.map((pay, idx) => (
                    <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="p-3">{fmtDate(pay.payment_date)}</td>
                      <td className="p-3 font-mono text-sm">{pay.reference ?? "—"}</td>
                      <td className="p-3 text-muted-foreground capitalize">{pay.payment_method ?? "—"}</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-semibold">{fmt(pay.amount)}</td>
                      <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(pay.runningTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t-2">
                    <td colSpan={4} className="p-3 text-right">Total Paid</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{fmt(totalPaid)}</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totalPaid)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Retainage Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-600" /> Retainage Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Retainage Withheld</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(totalRetainage)}</p>
              <p className="text-xs text-muted-foreground">Held across all pay applications</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Retainage Released</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(0)}</p>
              <p className="text-xs text-muted-foreground">Released upon substantial completion</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Retainage Held</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(totalRetainage)}</p>
              <p className="text-xs text-muted-foreground">Will be released at final completion</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
