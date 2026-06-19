import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { summarizeLedger, type LedgerEntry } from "@/lib/financial/ledger";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const ENTRY_LABEL: Record<LedgerEntry["entry_type"], string> = {
  prime_contract: "Prime Contract", commitment: "Commitment", change_order: "Change Order",
  pay_app: "Pay App", invoice: "Invoice", payment: "Payment", lien_release: "Lien Release",
};
type Filter = "all" | "receivable" | "payable";

export default function LedgerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { ledger } = useProjectFinancials(projectId ?? null);
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(
    () => (ledger.data ?? []).filter((e) => filter === "all" || e.direction === filter),
    [ledger.data, filter],
  );
  const summary = useMemo(() => summarizeLedger(ledger.data ?? []), [ledger.data]);

  function exportCsv() {
    const headers = ["Date", "Type", "Direction", "Party", "Reference", "Status", "Amount"];
    const lines = rows.map((e) => [
      fmtDate(e.entry_date), ENTRY_LABEL[e.entry_type], e.direction,
      e.party_name ?? "", e.reference ?? "", e.status ?? "", String(e.amount ?? 0),
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <BookOpen className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Financial Ledger</h1>
            <p className="text-muted-foreground text-sm">
              Every AR/AP event across the cost-code cascade. Net cash {fmt(summary.netCash)}.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-1">
        {(["all", "receivable", "payable"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "receivable" ? "Receivable (A/R)" : "Payable (A/P)"}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Party</th>
                <th className="p-3">Reference</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {ledger.isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!ledger.isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No ledger entries yet.</td></tr>
              )}
              {rows.map((e) => (
                <tr key={e.ledger_id} className="border-t hover:bg-muted/20">
                  <td className="p-3 whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                  <td className="p-3"><Badge variant="outline" className="font-normal">{ENTRY_LABEL[e.entry_type]}</Badge></td>
                  <td className="p-3">{e.party_name ?? "—"}</td>
                  <td className="p-3"><span className="font-mono text-xs">{e.reference ?? "—"}</span></td>
                  <td className="p-3">
                    <Badge variant="secondary" className={e.direction === "receivable" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                      {e.direction === "receivable" ? "A/R" : "A/P"}
                    </Badge>{" "}<span className="text-xs text-muted-foreground">{e.status}</span>
                  </td>
                  <td className={`p-3 text-right font-medium ${e.entry_type === "payment" ? "text-emerald-700" : ""}`}>
                    {e.entry_type === "payment" ? "−" : ""}{fmt(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
