import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { summarizeLedger } from "@/lib/financial/ledger";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function PaymentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { ledger } = useProjectFinancials(projectId ?? null);

  const payments = useMemo(
    () => (ledger.data ?? []).filter((e) => e.entry_type === "payment")
      .sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? "")),
    [ledger.data],
  );
  const s = useMemo(() => summarizeLedger(ledger.data ?? []), [ledger.data]);

  const kpis = [
    { label: "Received (A/R)", value: fmt(s.arReceived), icon: ArrowDownLeft, color: "text-emerald-600" },
    { label: "Paid to Subs (A/P)", value: fmt(s.apPaid), icon: ArrowUpRight, color: "text-[var(--apas-sapphire)]" },
    { label: "Net Cash", value: fmt(s.netCash), icon: CreditCard, color: s.netCash >= 0 ? "text-emerald-600" : "text-destructive" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start gap-2">
        <CreditCard className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground text-sm">All cash in (from owner) and out (to subs &amp; vendors).</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><k.icon className="h-3.5 w-3.5" /> {k.label}</div>
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3">Date</th><th className="p-3">Direction</th><th className="p-3">Party</th>
                <th className="p-3">Reference</th><th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No payments recorded yet.</td></tr>}
              {payments.map((p) => (
                <tr key={p.ledger_id} className="border-t hover:bg-muted/20">
                  <td className="p-3 whitespace-nowrap">{fmtDate(p.entry_date)}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className={p.direction === "receivable" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                      {p.direction === "receivable" ? "Received" : "Paid"}
                    </Badge>
                  </td>
                  <td className="p-3">{p.party_name ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="p-3 text-right font-medium">{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
