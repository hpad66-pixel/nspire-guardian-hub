import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, ArrowDownLeft, ArrowUpRight, Scale, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { summarizeLedger, type LedgerEntry } from "@/lib/financial/ledger";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n ?? 0);
const fmt2 = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const ENTRY_LABEL: Record<LedgerEntry["entry_type"], string> = {
  prime_contract: "Prime Contract", commitment: "Commitment", change_order: "Change Order",
  pay_app: "Pay App", invoice: "Invoice", payment: "Payment", lien_release: "Lien Release",
};

type Filter = "all" | "receivable" | "payable";

export function FinancialOverview({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { summary, ledger, payAppBalances, invoiceBalances } = useProjectFinancials(projectId);
  const s = summary.data;
  const [filter, setFilter] = useState<Filter>("all");
  const go = (tab: string) => navigate(`/projects/${projectId}/financials/${tab}`);

  const rows = useMemo(
    () => (ledger.data ?? []).filter((e) => filter === "all" || e.direction === filter),
    [ledger.data, filter],
  );
  const summ = useMemo(() => summarizeLedger(ledger.data ?? []), [ledger.data]);

  // Contract-value waterfall
  const base = s?.original_contract ?? 0;
  const cos = s?.approved_co_value ?? 0;
  const revised = s?.revised_contract ?? base + cos;

  const kpis = [
    { label: "Original Contract", value: fmt(base), icon: TrendingUp, color: "text-foreground", to: "prime-contract" },
    { label: "Approved COs", value: fmt(cos), icon: TrendingUp, color: cos > 0 ? "text-emerald-600" : "text-muted-foreground", to: "change-orders" },
    { label: "Revised Contract", value: fmt(revised), icon: TrendingUp, color: "text-foreground", to: "prime-contract" },
    { label: "Billed to Date", value: fmt(s?.billed_to_date), icon: ArrowUpRight, color: "text-foreground", to: "prime-contract" },
    { label: "Received", value: fmt(s?.received_to_date), icon: ArrowDownLeft, color: "text-emerald-600", to: "payments" },
    { label: "A/R Outstanding", value: fmt(s?.ar_outstanding), icon: Scale, color: (s?.ar_outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600", to: "prime-contract" },
    { label: "Committed", value: fmt(s?.committed_total), icon: ArrowDownLeft, color: "text-foreground", to: "commitments" },
    { label: "Paid to Subs", value: fmt(s?.paid_to_subs), icon: ArrowUpRight, color: "text-[var(--apas-sapphire)]", to: "payments" },
    { label: "A/P Outstanding", value: fmt(s?.ap_outstanding), icon: Scale, color: (s?.ap_outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600", to: "invoices" },
    { label: "Retainage (AR/AP)", value: `${fmt(s?.ar_retainage_held)} / ${fmt(s?.ap_retainage_held)}`, icon: ShieldCheck, color: "text-muted-foreground", to: "prime-contract" },
    { label: "Net Cash Position", value: fmt(s?.net_cash_position), icon: Scale, color: (s?.net_cash_position ?? 0) >= 0 ? "text-emerald-600" : "text-destructive", to: "ledger" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card
            key={k.label}
            onClick={() => go(k.to)}
            className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30"
            title={`View ${k.label} detail`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <k.icon className="h-3.5 w-3.5" /> {k.label}
              </div>
              <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waterfall */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Contract Value</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 text-sm">
            <WaterBar label="Base" value={base} max={revised} cls="bg-muted-foreground/40" />
            <span className="pb-6 text-muted-foreground">+</span>
            <WaterBar label="Executed COs" value={cos} max={revised} cls="bg-emerald-500/60" />
            <span className="pb-6 text-muted-foreground">=</span>
            <WaterBar label="Revised" value={revised} max={revised} cls="bg-[var(--apas-sapphire)]/70" />
          </div>
        </CardContent>
      </Card>

      {/* AR aging + AP aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AgingCard title="A/R — Pay Apps" rows={(payAppBalances.data ?? []).map((p) => ({
          ref: `Pay App #${p.pay_app_no}`, billed: p.billed_amount, settled: p.received_to_date,
          balance: p.balance_due, status: p.status,
        }))} />
        <AgingCard title="A/P — Vendor Invoices" rows={(invoiceBalances.data ?? []).map((i) => ({
          ref: i.invoice_no ?? "Invoice", billed: i.billed_amount, settled: i.paid_to_date,
          balance: i.balance_due, status: i.status, lien: i.lien_satisfied,
        }))} />
      </div>

      {/* Unified ledger */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Ledger</CardTitle>
          <div className="flex gap-1">
            {(["all", "receivable", "payable"] as Filter[]).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "receivable" ? "A/R" : "A/P"}
              </Button>
            ))}
          </div>
        </CardHeader>
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
                    {e.entry_type === "payment" ? "−" : ""}{fmt2(e.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* sanity: client summary echoes server summary */}
      <p className="text-xs text-muted-foreground">
        Ledger check — A/R received {fmt2(summ.arReceived)} · A/P paid {fmt2(summ.apPaid)} · net cash {fmt2(summ.netCash)}
      </p>
    </div>
  );
}

function WaterBar({ label, value, max, cls }: { label: string; value: number; max: number; cls: string }) {
  const h = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium">{fmt(value)}</div>
      <div className="w-16 rounded-t" style={{ height: `${h}px` }}>
        <div className={`w-16 rounded-t ${cls}`} style={{ height: `${h}px` }} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AgingCard({ title, rows }: {
  title: string;
  rows: Array<{ ref: string; billed: number; settled: number; balance: number; status: string; lien?: boolean }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="p-2.5">Ref</th><th className="p-2.5 text-right">Billed</th>
              <th className="p-2.5 text-right">Settled</th><th className="p-2.5 text-right">Balance</th><th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">None</td></tr>}
            {rows.map((r) => (
              <tr key={r.ref} className="border-t">
                <td className="p-2.5 font-mono text-xs">{r.ref}</td>
                <td className="p-2.5 text-right">{fmt2(r.billed)}</td>
                <td className="p-2.5 text-right">{fmt2(r.settled)}</td>
                <td className={`p-2.5 text-right font-medium ${r.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>{fmt2(r.balance)}</td>
                <td className="p-2.5 text-right">
                  {r.lien === false && <ShieldAlert className="h-4 w-4 text-amber-600 inline" />}
                  {r.lien === true && <ShieldCheck className="h-4 w-4 text-emerald-600 inline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
