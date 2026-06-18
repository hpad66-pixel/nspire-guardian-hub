import { useParams, Link } from "react-router-dom";
import { generateFinancialReport } from "@/lib/pdf/financialReport";
import { useState } from "react";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractInvoices, useContractChangeOrders, useContractPayments } from "@/hooks/useContractFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, FileSignature, Receipt, TrendingUp, CreditCard, ShieldCheck,
  Download, ArrowRight,
} from "lucide-react";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n ?? 0);
}
function fmt2(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

const STATUS_BADGE: Record<string, string> = {
  draft:             "bg-gray-100 text-gray-700",
  out_for_signature: "bg-amber-100 text-amber-800",
  executed:          "bg-green-100 text-green-800",
  terminated:        "bg-red-100 text-red-800",
};

function exportSovCsv(sov: any[], contractNumber: string) {
  const headers = ["#", "Description", "Budget Code", "Scheduled Value", "Billed to Date", "% Complete", "Balance to Finish"];
  const rows = sov.map(i => [
    i.item_number, i.description ?? "", i.budget_code ?? "",
    i.subtotal ?? 0, i.billed_to_date ?? 0,
    `${pct(i.billed_to_date ?? 0, i.subtotal ?? 0)}%`,
    (i.subtotal ?? 0) - (i.billed_to_date ?? 0),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `sov-${contractNumber}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function PrimeContractPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading } = useProjectContracts(projectId!);
  const [activeTab, setActiveTab] = useState("sov");

  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;
  const invoices    = useContractInvoices(contract?.id ?? "");
  const changeOrders = useContractChangeOrders(contract?.id ?? "");
  const payments    = useContractPayments(contract?.id ?? "");

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

  const sov      = (contract.sov_items ?? []).slice().sort((a, b) => a.item_number - b.item_number);
  const invList  = invoices.data ?? [];
  const coList   = changeOrders.data ?? [];
  const payList  = payments.data ?? [];

  // Financial calculations
  const base         = contract.base_contract_amount ?? 0;
  const approvedCOs  = coList.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const revised      = base + approvedCOs;
  const totalBilled  = invList.filter(i => ["submitted", "approved", "paid"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalRet     = invList.filter(i => ["submitted", "approved", "paid"].includes(i.status)).reduce((s, i) => s + i.retainage, 0);
  const totalNetDue  = totalBilled - totalRet;
  const totalPaid    = payList.reduce((s, p) => s + p.amount, 0);
  const outstanding  = totalNetDue - totalPaid;
  const balance      = revised - totalBilled;
  const overallPct   = pct(totalBilled, revised);

  // Sorted payments for display
  const sortedPayments = [...payList].sort((a, b) => a.payment_date.localeCompare(b.payment_date));

  function handleExportPdf() {
    generateFinancialReport({
      projectName: contract.contract_title,
      companyName: contract.prime_contractor_name ?? undefined,
      contract: {
        contract_number: contract.contract_number ?? "PC",
        contract_title: contract.contract_title,
        contract_value: contract.base_contract_amount ?? 0,
      },
      sovItems: sov.map(i => ({
        item_number: String(i.item_number),
        description: i.description ?? "",
        scheduled_value: i.subtotal ?? 0,
        completed_to_date: i.billed_to_date ?? undefined,
      })),
      changeOrders: coList.map(c => ({
        co_number: c.co_number,
        title: c.title,
        amount: c.amount,
        status: c.status,
        co_date: c.co_date ?? null,
      })),
      invoices: invList.map(i => ({
        invoice_number: i.invoice_number ?? null,
        period_start: i.period_start ?? null,
        period_end: i.period_end ?? null,
        amount: i.amount,
        retainage: i.retainage,
        net_due: i.net_due ?? (i.amount - i.retainage),
        status: i.status,
      })),
      payments: payList.map(p => ({
        payment_date: p.payment_date,
        reference: p.reference ?? null,
        amount: p.amount,
        payment_method: p.payment_method ?? null,
      })),
    });
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      {/* ── Contract Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)]" />
            <h1 className="text-2xl font-bold">{contract.contract_title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[contract.status] ?? STATUS_BADGE.draft}`}>
              {contract.status.replace(/_/g, " ")}
            </span>
          </div>
          {contract.contract_number && (
            <p className="text-muted-foreground font-mono text-sm">#{contract.contract_number}</p>
          )}
          {contract.prime_contractor_name && (
            <p className="text-sm text-muted-foreground">{contract.prime_contractor_name}</p>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportPdf()}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Financial Report
          </Button>
          <Link to={`/projects/${projectId}/contracts/${contract.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Contract Details
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Financial Waterfall ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-gray-300">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Original Contract</p>
            <p className="text-xl font-bold">{fmt(base)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(contract.contract_date)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${approvedCOs > 0 ? "border-l-emerald-400" : "border-l-gray-200"}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Approved COs</p>
            <p className={`text-xl font-bold ${approvedCOs > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {approvedCOs >= 0 ? "+" : ""}{fmt(approvedCOs)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{coList.filter(c => c.status === "approved").length} change order{coList.filter(c => c.status === "approved").length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[var(--apas-sapphire)]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Revised Contract</p>
            <p className="text-xl font-bold text-[var(--apas-sapphire)]">{fmt(revised)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Base + all approved COs</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance to Finish</p>
            <p className={`text-xl font-bold ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{overallPct}% complete</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Billing & Payment Status ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Billed to Date</p>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{fmt(totalBilled)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{invList.length} pay app{invList.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Retainage Held</p>
              <ShieldCheck className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600">{fmt(totalRet)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">5% of billed work</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid to Date</p>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{payList.length} payment{payList.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className={outstanding > 0 ? "border-destructive/30" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {outstanding > 0 ? "Outstanding" : "Advance Balance"}
              </p>
              <TrendingUp className={`h-4 w-4 ${outstanding > 0 ? "text-destructive" : "text-emerald-500"}`} />
            </div>
            <p className={`text-xl font-bold ${outstanding > 0 ? "text-destructive" : "text-emerald-600"}`}>
              {fmt(Math.abs(outstanding))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {outstanding > 0 ? "Net certified, unpaid" : "Paid ahead of net certified"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Completion Progress ─────────────────────────────────────── */}
      {revised > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2 text-sm">
              <span className="font-medium">Contract Completion</span>
              <span className="font-bold text-[var(--apas-sapphire)]">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-3 mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmt(totalBilled)} billed of {fmt(revised)} revised</span>
              <span>{fmt(balance)} remaining</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabbed Detail Sections ──────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="sov">
            Schedule of Values{sov.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{sov.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Pay Applications{invList.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{invList.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="cos">
            Change Orders{coList.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{coList.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments Received{payList.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{payList.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* SOV Tab */}
        <TabsContent value="sov">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Schedule of Values</CardTitle>
              {sov.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => exportSovCsv(sov, contract.contract_number ?? "PC")}>
                  <Download className="h-4 w-4 mr-1.5" /> Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {sov.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No SOV lines.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3 w-8">#</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3">Scheduled Value</th>
                        <th className="text-right p-3">Billed</th>
                        <th className="text-right p-3">Balance</th>
                        <th className="p-3 w-28">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sov.map(item => {
                        const billedPct = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                        const bal = (item.subtotal ?? 0) - (item.billed_to_date ?? 0);
                        return (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3 text-muted-foreground font-mono">{item.item_number}</td>
                            <td className="p-3">
                              <p className="font-medium">{item.description || <span className="text-muted-foreground italic">CO scope item</span>}</p>
                              {item.budget_code && <span className="text-xs font-mono text-muted-foreground">{item.budget_code}</span>}
                            </td>
                            <td className="p-3 text-right font-mono">{fmt(item.subtotal)}</td>
                            <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">
                              {(item.billed_to_date ?? 0) > 0 ? fmt(item.billed_to_date) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className={`p-3 text-right font-mono ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {fmt(bal)}
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
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm border-t-2">
                        <td colSpan={2} className="p-3 text-right">Total</td>
                        <td className="p-3 text-right font-mono">{fmt(sov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                        <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0))}</td>
                        <td className="p-3 text-right font-mono text-amber-600">{fmt(sov.reduce((s, i) => s + ((i.subtotal ?? 0) - (i.billed_to_date ?? 0)), 0))}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Progress value={overallPct} className="h-1.5 flex-1" />
                            <span className="text-xs w-7 text-right">{overallPct}%</span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pay Applications Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Pay Applications
              </CardTitle>
              <Link to={`/projects/${projectId}/financials/invoices`}>
                <Button variant="outline" size="sm">All Invoices <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {invList.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No pay applications yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">Pay App</th>
                        <th className="text-left p-3">Period</th>
                        <th className="text-right p-3">Gross</th>
                        <th className="text-right p-3">Retainage</th>
                        <th className="text-right p-3">Net Due</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...invList].sort((a, b) => (a.invoice_number ?? "").localeCompare(b.invoice_number ?? "")).map(inv => (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono font-medium">{inv.invoice_number ?? "—"}</td>
                          <td className="p-3 text-muted-foreground text-xs">{fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}</td>
                          <td className="p-3 text-right font-mono">{fmt2(inv.amount)}</td>
                          <td className="p-3 text-right font-mono text-amber-600">({fmt2(inv.retainage)})</td>
                          <td className="p-3 text-right font-mono font-semibold text-[var(--apas-sapphire)]">{fmt2(inv.net_due ?? (inv.amount - inv.retainage))}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === "paid"      ? "bg-blue-100 text-blue-800" :
                              inv.status === "approved"  ? "bg-green-100 text-green-800" :
                              inv.status === "submitted" ? "bg-amber-100 text-amber-800" :
                              "bg-gray-100 text-gray-700"
                            }`}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm border-t-2">
                        <td colSpan={2} className="p-3 text-right">Totals</td>
                        <td className="p-3 text-right font-mono">{fmt2(totalBilled)}</td>
                        <td className="p-3 text-right font-mono text-amber-600">({fmt2(totalRet)})</td>
                        <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt2(totalNetDue)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Orders Tab */}
        <TabsContent value="cos">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Change Orders
              </CardTitle>
              <Link to={`/projects/${projectId}/financials/change-orders`}>
                <Button variant="outline" size="sm">Full CO Log <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {coList.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No change orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">CO #</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coList.map(co => (
                        <tr key={co.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono font-medium">{co.co_number ?? "—"}</td>
                          <td className="p-3">{co.description}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(co.co_date)}</td>
                          <td className={`p-3 text-right font-mono ${co.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                            {co.amount >= 0 ? "+" : ""}{fmt2(co.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              co.status === "approved" ? "bg-green-100 text-green-800" :
                              co.status === "rejected" ? "bg-red-100 text-red-800" :
                              co.status === "voided"   ? "bg-gray-100 text-gray-500" :
                              "bg-amber-100 text-amber-800"
                            }`}>{co.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm border-t-2">
                        <td colSpan={3} className="p-3 text-right">Total Approved COs</td>
                        <td className="p-3 text-right font-mono text-emerald-600">+{fmt2(approvedCOs)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payments Received
              </CardTitle>
              <Link to={`/projects/${projectId}/financials/payments`}>
                <Button variant="outline" size="sm">Full Payment Log <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {payList.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">#</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Reference</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPayments.map((pay, i) => (
                        <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 text-muted-foreground font-mono">{i + 1}</td>
                          <td className="p-3">{fmtDate(pay.payment_date)}</td>
                          <td className="p-3 font-mono text-sm">{pay.reference ?? "—"}</td>
                          <td className="p-3 text-right font-mono text-emerald-600 font-semibold">{fmt2(pay.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm border-t-2">
                        <td colSpan={3} className="p-3 text-right">Total Received</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{fmt2(totalPaid)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
