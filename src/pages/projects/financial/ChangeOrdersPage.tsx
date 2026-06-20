import { useParams, Link, useNavigate } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useChangeOrdersByProject, useDeleteChangeOrder } from "@/hooks/useChangeOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, ExternalLink, Trash2, Paperclip, Plus } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const EXECUTED = (s: string | null) => s === "executed" || s === "approved";
const PENDING = (s: string | null) => s === "pending" || s === "draft" || s === "submitted" || s === "out_for_signature";

export default function ChangeOrdersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { data: allCos = [], isLoading } = useChangeOrdersByProject(projectId ?? null);
  const deleteCo = useDeleteChangeOrder();
  // Prime-side change orders roll up the contract value.
  const coList = allCos.filter((c) => (c as any).co_type !== "CCO" && !(c as any).commitment_id);

  const approvedTotal = coList.filter((c) => EXECUTED(c.status)).reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const pendingTotal = coList.filter((c) => PENDING(c.status)).reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Prime Contract Change Orders</h1>
            <p className="text-muted-foreground text-sm">
              Changes between you and the owner on{" "}
              {contract ? `Prime Contract ${contract.contract_no}` : "the prime contract"} ·
              PCO = potential (pending) · PCCO = executed. Subcontractor change orders
              (SCOs) live on each commitment.
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/financials/change-orders/new`)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />New Change Order
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Change Orders", value: coList.length.toString(), sub: "all statuses" },
          { label: "Executed", value: fmt(approvedTotal), sub: `${coList.filter((c) => EXECUTED(c.status)).length} executed`, color: "text-emerald-600" },
          { label: "Pending", value: fmt(pendingTotal), sub: `${coList.filter((c) => PENDING(c.status)).length} pending`, color: "text-amber-600" },
          { label: "Net CO Value", value: fmt(approvedTotal), sub: "added to contract", color: "text-[var(--apas-sapphire)]" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-lg font-bold ${k.color ?? "text-foreground"}`}>{k.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Change Order Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : coList.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No change orders on this contract.</p>
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
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {coList.map((co) => (
                    <tr key={co.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                      onClick={() => (window.location.href = `/projects/${projectId}/financials/cos/${co.id}`)}>
                      <td className="p-3 font-mono font-medium">
                        {EXECUTED(co.status) ? "PCCO" : "PCO"} #{(co as any).co_no ?? "—"}
                      </td>
                      <td className="p-3">{co.title ?? co.description}</td>
                      <td className="p-3 text-muted-foreground">{fmtDate((co as any).executed_date)}</td>
                      <td className={`p-3 text-right font-mono ${Number(co.amount) < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {Number(co.amount) >= 0 ? "+" : ""}{fmt(Number(co.amount ?? 0))}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          EXECUTED(co.status) ? "bg-green-100 text-green-800" :
                          co.status === "rejected" || co.status === "void" ? "bg-gray-100 text-gray-500" :
                          "bg-amber-100 text-amber-800"
                        }`}>{co.status}</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(co as any).pdf_path && (
                            <a
                              href={(co as any).pdf_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="View / print the signed change order PDF"
                              className="text-[var(--apas-sapphire)] hover:text-primary"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Link to={`/projects/${projectId}/financials/cos/${co.id}`} onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          </Link>
                          {co.status === "draft" && (
                            <button
                              title="Delete this draft change order"
                              className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                              disabled={deleteCo.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete draft change order ${(co as any).co_no ?? ""}? This cannot be undone.`)) {
                                  deleteCo.mutate(co.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/60 font-bold text-sm border-t">
                    <td colSpan={3} className="p-3 text-right">Total Executed</td>
                    <td className="p-3 text-right font-mono text-emerald-600">+{fmt(approvedTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
