import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractChangeOrders } from "@/hooks/useContractFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ChangeOrdersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading: loadingContracts } = useProjectContracts(projectId!);
  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;
  const { data: coList = [], isLoading: loadingCOs } = useContractChangeOrders(contract?.id ?? "");

  const isLoading = loadingContracts || loadingCOs;
  const approvedTotal = coList.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const pendingTotal  = coList.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start gap-2">
        <TrendingUp className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Change Orders</h1>
          <p className="text-muted-foreground text-sm">
            {contract ? `Prime Contract ${contract.contract_number}` : "Prime contract change orders"}
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total COs", value: coList.length.toString(), sub: "all statuses" },
          { label: "Approved", value: fmt(approvedTotal), sub: `${coList.filter(c => c.status === "approved").length} approved`, color: "text-emerald-600" },
          { label: "Pending", value: fmt(pendingTotal), sub: `${coList.filter(c => c.status === "pending").length} pending`, color: "text-amber-600" },
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

      {/* CO Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change Order Log</CardTitle>
        </CardHeader>
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
                  </tr>
                </thead>
                <tbody>
                  {coList.map(co => (
                    <tr key={co.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-mono font-medium">{co.co_number ?? "—"}</td>
                      <td className="p-3">{co.description}</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(co.co_date)}</td>
                      <td className={`p-3 text-right font-mono ${co.amount < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {co.amount >= 0 ? "+" : ""}{fmt(co.amount)}
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
                  <tr className="bg-muted/60 font-bold text-sm border-t">
                    <td colSpan={3} className="p-3 text-right">Total Approved</td>
                    <td className="p-3 text-right font-mono text-emerald-600">+{fmt(approvedTotal)}</td>
                    <td />
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
