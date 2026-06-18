import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractChangeOrders } from "@/hooks/useContractFinancials";
import { useCommitments } from "@/hooks/useCommitments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, BarChart3, TrendingUp, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

function exportBudgetCsv(rows: any[], contractNumber: string) {
  const headers = ["#","Description","Budget Code","Scheduled Value","Billed to Date","% Complete","Balance to Finish"];
  const csvRows = rows.map(r => [
    r.item_number, r.description ?? "", r.budget_code ?? "",
    r.subtotal ?? 0, r.billed_to_date ?? 0,
    `${pct(r.billed_to_date ?? 0, r.subtotal ?? 0)}%`,
    (r.subtotal ?? 0) - (r.billed_to_date ?? 0),
  ]);
  const csv = [headers, ...csvRows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `budget-${contractNumber}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function BudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading: lc } = useProjectContracts(projectId!);
  const { data: commitments = [], isLoading: lm } = useCommitments(projectId ?? null);
  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;
  const { data: coList = [], isLoading: lo } = useContractChangeOrders(contract?.id ?? "");

  const isLoading = lc || lm || lo;

  const sov = (contract?.sov_items ?? []).slice().sort((a, b) => a.item_number - b.item_number);

  // Financials
  const base        = contract?.base_contract_amount ?? 0;
  const approvedCOs = coList.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const revised     = base + approvedCOs;
  const totalSched  = sov.reduce((s, i) => s + (i.subtotal ?? 0), 0);
  const totalBilled = sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0);
  const totalBal    = totalSched - totalBilled;
  const overallPct  = pct(totalBilled, totalSched);

  // Commitment totals
  const totalCommitted = commitments.reduce((s, c) => s + c.original_value, 0);

  // Cost distribution by section (items 1-16 vs 17-20 CO scope)
  const baseSov = sov.filter(i => i.item_number <= 16);
  const coSov   = sov.filter(i => i.item_number > 16);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Budget & Cost Summary</h1>
            <p className="text-muted-foreground text-sm">
              {contract ? `${contract.contract_number} — ${contract.contract_title}` : ""}
            </p>
          </div>
        </div>
        {sov.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportBudgetCsv(sov, contract?.contract_number ?? "PC")}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </div>

      {/* Financial snapshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Original Contract",   value: fmt(base),          sub: "Base contract value",       color: "text-foreground" },
          { label: "Approved COs",        value: `+${fmt(approvedCOs)}`, sub: `${coList.filter(c => c.status === "approved").length} change orders`, color: "text-emerald-600" },
          { label: "Revised Contract",    value: fmt(revised),       sub: "Current contract value",    color: "text-[var(--apas-sapphire)]" },
          { label: "Subcontract Exposure",value: fmt(totalCommitted), sub: `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`, color: "text-amber-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {totalSched > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">SOV Completion</span>
              <span className="font-bold text-[var(--apas-sapphire)]">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-3" />
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="font-semibold">{fmt(totalSched)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Billed to Date</p>
                <p className="font-semibold text-[var(--apas-sapphire)]">{fmt(totalBilled)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance to Finish</p>
                <p className="font-semibold text-amber-600">{fmt(totalBal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Base Contract SOV */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Original Scope — {contract?.contract_number}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : baseSov.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No SOV items found.</p>
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
                    <th className="p-3 w-32">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {baseSov.map(item => {
                    const bp = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                    const bal = (item.subtotal ?? 0) - (item.billed_to_date ?? 0);
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
                        <td className={`p-3 text-right font-mono ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {fmt(bal)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Progress value={bp} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-7 text-right">{bp}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t-2">
                    <td colSpan={2} className="p-3 text-right">Base Contract Total</td>
                    <td className="p-3 text-right font-mono">{fmt(baseSov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(baseSov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0))}</td>
                    <td className="p-3 text-right font-mono text-amber-600">{fmt(baseSov.reduce((s, i) => s + ((i.subtotal ?? 0) - (i.billed_to_date ?? 0)), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CO Scope Items */}
      {coSov.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Change Order Scope Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3 w-8">#</th>
                    <th className="text-left p-3">CO Reference</th>
                    <th className="text-right p-3">Authorized Value</th>
                    <th className="text-right p-3">Billed</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="p-3 w-32">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {coSov.map((item, idx) => {
                    const coRef = coList[idx] ?? null;
                    const bp = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                    const bal = (item.subtotal ?? 0) - (item.billed_to_date ?? 0);
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground font-mono">{item.item_number}</td>
                        <td className="p-3">
                          <p className="font-medium font-mono text-sm">{coRef?.co_number ?? `CO Item ${item.item_number}`}</p>
                          {coRef && <p className="text-xs text-muted-foreground">{coRef.description}</p>}
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
                            <Progress value={bp} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground w-7 text-right">{bp}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t-2">
                    <td colSpan={2} className="p-3 text-right">CO Scope Total</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{fmt(coSov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(coSov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0))}</td>
                    <td className="p-3 text-right font-mono text-amber-600">{fmt(coSov.reduce((s, i) => s + ((i.subtotal ?? 0) - (i.billed_to_date ?? 0)), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commitments summary */}
      {commitments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subcontract Commitments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">Commitment #</th>
                  <th className="text-left p-3">Contractor</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-mono font-medium">
                      <Link to={`/projects/${projectId}/financials/commitments/${c.id}`} className="text-[var(--apas-sapphire)] hover:underline">
                        {c.commitment_no}
                      </Link>
                    </td>
                    <td className="p-3">{c.title}</td>
                    <td className="p-3 text-muted-foreground capitalize">{c.commitment_type.replace("_", " ")}</td>
                    <td className="p-3 text-right font-mono font-semibold">{fmt(c.original_value)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "executed" ? "bg-green-100 text-green-800" :
                        c.status === "closed"   ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold text-sm border-t-2">
                  <td colSpan={3} className="p-3 text-right">Total Committed</td>
                  <td className="p-3 text-right font-mono text-amber-600">{fmt(totalCommitted)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
