import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract, usePrimeContractSov } from "@/hooks/usePrimeContract";
import { useChangeOrdersByProject } from "@/hooks/useChangeOrders";
import { useCommitments } from "@/hooks/useCommitments";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, BarChart3, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function pct(a: number, b: number) {
  return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
}

function exportBudgetCsv(rows: any[], contractNo: string) {
  const headers = ["#", "Description", "Cost Code", "Scheduled Value"];
  const csvRows = rows.map((r) => [r.line_no, r.description ?? "", r.cost_code_id ?? "", r.scheduled_value ?? 0]);
  const csv = [headers, ...csvRows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `budget-${contractNo}-${new Date().toISOString().split("T")[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function BudgetPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contract, isLoading: lc } = usePrimeContract(projectId ?? null);
  const { data: sov = [], isLoading: ls } = usePrimeContractSov(contract?.id ?? null);
  const { data: allCos = [] } = useChangeOrdersByProject(projectId ?? null);
  const { data: commitments = [], isLoading: lm } = useCommitments(projectId ?? null);
  const { summary } = useProjectFinancials(projectId ?? null);
  const s = summary.data;

  const isLoading = lc || ls || lm;

  const base = contract?.original_value ?? 0;
  const approvedCOs = allCos
    .filter((c) => (c as any).co_type !== "CCO" && !(c as any).commitment_id && (c.status === "executed" || c.status === "approved"))
    .reduce((acc, c) => acc + Number(c.amount ?? 0), 0);
  const revised = base + approvedCOs;
  const totalSched = sov.reduce((acc, i: any) => acc + Number(i.scheduled_value ?? 0), 0);
  const totalBilled = s?.billed_to_date ?? 0;
  const totalCommitted = commitments.reduce((acc, c) => acc + Number(c.original_value ?? 0), 0);
  const overallPct = pct(totalBilled, revised);

  const sortedSov = [...sov].sort((a: any, b: any) => (a.line_no ?? 0) - (b.line_no ?? 0));

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Budget &amp; Cost Summary</h1>
            <p className="text-muted-foreground text-sm">{contract ? `${contract.contract_no} — ${contract.title}` : ""}</p>
          </div>
        </div>
        {sortedSov.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => exportBudgetCsv(sortedSov, contract?.contract_no ?? "PC")}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Original Contract", value: fmt(base), sub: "Base contract value", color: "text-foreground" },
          { label: "Approved COs", value: `+${fmt(approvedCOs)}`, sub: "executed change orders", color: "text-emerald-600" },
          { label: "Revised Contract", value: fmt(revised), sub: "Current contract value", color: "text-[var(--apas-sapphire)]" },
          { label: "Subcontract Exposure", value: fmt(totalCommitted), sub: `${commitments.length} commitment${commitments.length !== 1 ? "s" : ""}`, color: "text-amber-600" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {revised > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Billed vs Revised Contract</span>
              <span className="font-bold text-[var(--apas-sapphire)]">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-3" />
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div><p className="text-xs text-muted-foreground">Revised</p><p className="font-semibold">{fmt(revised)}</p></div>
              <div><p className="text-xs text-muted-foreground">Billed to Date</p><p className="font-semibold text-[var(--apas-sapphire)]">{fmt(totalBilled)}</p></div>
              <div><p className="text-xs text-muted-foreground">Balance to Finish</p><p className="font-semibold text-amber-600">{fmt(revised - totalBilled)}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Schedule of Values — {contract?.contract_no ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : sortedSov.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No SOV lines found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3 w-8">#</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-left p-3">Cost Code</th>
                    <th className="text-right p-3">Scheduled Value</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSov.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground font-mono">{item.line_no}</td>
                      <td className="p-3 font-medium">{item.description}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{item.cost_code_id ?? "—"}</td>
                      <td className="p-3 text-right font-mono">{fmt(Number(item.scheduled_value ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t-2">
                    <td colSpan={3} className="p-3 text-right">Total Scheduled</td>
                    <td className="p-3 text-right font-mono">{fmt(totalSched)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {commitments.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Subcontract Commitments</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">Commitment #</th>
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-mono font-medium">
                      <Link to={`/projects/${projectId}/financials/commitments/${c.id}`} className="text-[var(--apas-sapphire)] hover:underline">
                        {c.commitment_no}
                      </Link>
                    </td>
                    <td className="p-3">{c.title}</td>
                    <td className="p-3 text-muted-foreground capitalize">{c.commitment_type.replace("_", " ")}</td>
                    <td className="p-3 text-right font-mono font-semibold">{fmt(Number(c.original_value ?? 0))}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === "executed" ? "bg-green-100 text-green-800" :
                        c.status === "closed" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
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
