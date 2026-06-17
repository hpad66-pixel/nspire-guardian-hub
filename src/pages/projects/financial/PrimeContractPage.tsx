import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractInvoices, useContractChangeOrders, useContractPayments } from "@/hooks/useContractFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, FileSignature, Receipt, TrendingUp, CreditCard, ShieldCheck } from "lucide-react";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  out_for_signature: "bg-amber-100 text-amber-800",
  executed: "bg-green-100 text-green-800",
  terminated: "bg-red-100 text-red-800",
};

// Inner component that receives a contract id and renders financials
function ContractFinancials({ contractId, projectId }: { contractId: string; projectId: string }) {
  const invoices = useContractInvoices(contractId);
  const changeOrders = useContractChangeOrders(contractId);
  const payments = useContractPayments(contractId);

  const invList = invoices.data ?? [];
  const coList = changeOrders.data ?? [];
  const payList = payments.data ?? [];

  const approvedCOs = coList.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const totalBilled = invList.filter(i => ["approved", "paid"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPaid = payList.reduce((s, p) => s + p.amount, 0);
  const retainageHeld = invList.filter(i => ["approved", "paid"].includes(i.status)).reduce((s, i) => s + i.retainage, 0);

  return { approvedCOs, totalBilled, totalPaid, retainageHeld, invList, coList, payList };
}

export default function PrimeContractPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading } = useProjectContracts(projectId!);

  // Use the first executed contract, or first contract of any status
  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;

  const invoices = useContractInvoices(contract?.id ?? "");
  const changeOrders = useContractChangeOrders(contract?.id ?? "");
  const payments = useContractPayments(contract?.id ?? "");

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!contract) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <FinancialSubNav />
        <h1 className="text-3xl font-bold">Prime Contract</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <p>No contracts yet for this project.</p>
            <Link to={`/projects/${projectId}/contracts/new`} className="text-[var(--apas-sapphire)] underline text-sm">
              Add a contract
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sov = (contract.sov_items ?? []).slice().sort((a, b) => a.item_number - b.item_number);
  const invList = invoices.data ?? [];
  const coList = changeOrders.data ?? [];
  const payList = payments.data ?? [];

  const base = contract.base_contract_amount ?? 0;
  const approvedCOs = coList.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const revised = base + approvedCOs;
  const totalBilled = invList.filter(i => ["approved", "paid"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPaid = payList.reduce((s, p) => s + p.amount, 0);
  const retainageHeld = invList.filter(i => ["approved", "paid"].includes(i.status)).reduce((s, i) => s + i.retainage, 0);
  const balance = revised - totalBilled;
  const overallPct = pct(totalBilled, revised);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)]" />
            <h1 className="text-2xl font-bold">{contract.contract_title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[contract.status] ?? STATUS_COLOR.draft}`}>
              {contract.status.replace(/_/g, " ")}
            </span>
          </div>
          {contract.contract_number && (
            <p className="text-muted-foreground font-mono text-sm">#{contract.contract_number}</p>
          )}
          {contracts.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Showing primary executed contract ·{" "}
              <Link to={`/projects/${projectId}/contracts`} className="text-[var(--apas-sapphire)] underline">
                View all {contracts.length} contracts
              </Link>
            </p>
          )}
        </div>
        <Link to={`/projects/${projectId}/contracts/${contract.id}`}>
          <button className="flex items-center gap-1.5 text-sm text-[var(--apas-sapphire)] hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Full contract details
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Original Value", value: fmt(base), sub: contract.contract_date ? `Dated ${fmtDate(contract.contract_date)}` : "Base contract", icon: FileSignature, color: "text-foreground" },
          { label: "Approved COs", value: fmt(approvedCOs), sub: `${coList.filter(c => c.status === "approved").length} of ${coList.length} approved`, icon: TrendingUp, color: approvedCOs >= 0 ? "text-emerald-600" : "text-destructive" },
          { label: "Revised Value", value: fmt(revised), sub: "Base + approved COs", icon: TrendingUp, color: "text-[var(--apas-sapphire)]" },
          { label: "Billed to Date", value: fmt(totalBilled), sub: `${overallPct}% complete`, icon: Receipt, color: "text-foreground" },
          { label: "Paid to Date", value: fmt(totalPaid), sub: `${fmt(totalBilled - totalPaid)} outstanding`, icon: CreditCard, color: "text-emerald-600" },
        ].map((k) => (
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

      {/* Progress */}
      {revised > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2 text-sm">
              <span className="font-medium">Completion</span>
              <span className="font-bold">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* SOV */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Schedule of Values</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sov.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No SOV lines.{" "}
              <Link to={`/projects/${projectId}/contracts/${contract.id}/edit`} className="text-[var(--apas-sapphire)] underline">
                Edit contract
              </Link>{" "}
              to add line items.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3 w-8">#</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Scheduled Value</th>
                    <th className="text-right p-3">Billed</th>
                    <th className="p-3 w-28">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {sov.map((item) => {
                    const billedPct = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground font-mono">{item.item_number}</td>
                        <td className="p-3">
                          <p className="font-medium">{item.description}</p>
                          {item.budget_code && <span className="text-xs font-mono text-muted-foreground">{item.budget_code}</span>}
                        </td>
                        <td className="p-3 text-right font-mono">{fmt(item.subtotal)}</td>
                        <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">
                          {(item.billed_to_date ?? 0) > 0 ? fmt(item.billed_to_date) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Progress value={billedPct} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-7 text-right">{billedPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/60 font-bold text-sm">
                    <td colSpan={2} className="p-3 text-right">Total</td>
                    <td className="p-3 text-right font-mono">{fmt(sov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0))}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <Progress value={overallPct} className="h-1.5 flex-1" />
                        <span className="text-xs w-7 text-right">{overallPct}%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Invoices</CardTitle>
            <Link to={`/projects/${projectId}/contracts/${contract.id}`} className="text-xs text-[var(--apas-sapphire)] hover:underline">
              Manage →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invList.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">Invoice #</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-right p-3">Net Due</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invList.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="p-3 font-mono">{inv.invoice_number ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                    <td className="p-3 text-right font-mono">{fmt(inv.amount)}</td>
                    <td className="p-3 text-right font-mono">{fmt(inv.net_due ?? (inv.amount - inv.retainage))}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === "paid" ? "bg-emerald-100 text-emerald-800" :
                        inv.status === "approved" ? "bg-green-100 text-green-800" :
                        inv.status === "submitted" ? "bg-blue-100 text-blue-800" :
                        inv.status === "rejected" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold text-sm">
                  <td colSpan={2} className="p-3 text-right">Total</td>
                  <td className="p-3 text-right font-mono">{fmt(invList.reduce((s, i) => s + i.amount, 0))}</td>
                  <td className="p-3 text-right font-mono">{fmt(invList.reduce((s, i) => s + (i.net_due ?? (i.amount - i.retainage)), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Change Orders */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Change Orders</CardTitle>
            <Link to={`/projects/${projectId}/contracts/${contract.id}`} className="text-xs text-[var(--apas-sapphire)] hover:underline">
              Manage →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {coList.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No change orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">CO #</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {coList.map(co => (
                  <tr key={co.id} className="border-b last:border-0">
                    <td className="p-3 font-mono">{co.co_number ?? "—"}</td>
                    <td className="p-3">{co.description}</td>
                    <td className={`p-3 text-right font-mono ${co.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {co.amount >= 0 ? "+" : ""}{fmt(co.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        co.status === "approved" ? "bg-green-100 text-green-800" :
                        co.status === "rejected" ? "bg-red-100 text-red-800" :
                        co.status === "voided" ? "bg-gray-100 text-gray-500" :
                        "bg-amber-100 text-amber-800"
                      }`}>{co.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payments Received</CardTitle>
            <Link to={`/projects/${projectId}/contracts/${contract.id}`} className="text-xs text-[var(--apas-sapphire)] hover:underline">
              Manage →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payList.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Reference</th>
                  <th className="text-left p-3">Method</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payList.map(pay => (
                  <tr key={pay.id} className="border-b last:border-0">
                    <td className="p-3">{fmtDate(pay.payment_date)}</td>
                    <td className="p-3 font-mono">{pay.reference ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{pay.payment_method ?? "—"}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{fmt(pay.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold text-sm">
                  <td colSpan={3} className="p-3 text-right">Total Received</td>
                  <td className="p-3 text-right font-mono text-emerald-600">{fmt(payList.reduce((s, p) => s + p.amount, 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
