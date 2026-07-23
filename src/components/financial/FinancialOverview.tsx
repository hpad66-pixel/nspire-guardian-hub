import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp, ArrowDownLeft, ArrowUpRight, Scale, ShieldCheck, ShieldAlert,
  FileText, Wallet, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { summarizeLedger, type LedgerEntry } from "@/lib/financial/ledger";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);
const fmt2 = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const ENTRY_LABEL: Record<LedgerEntry["entry_type"], string> = {
  prime_contract: "Prime Contract", commitment: "Commitment", change_order: "Change Order",
  pay_app: "Pay App", invoice: "Invoice", payment: "Payment", lien_release: "Lien Release",
};

type Filter = "all" | "receivable" | "payable";

interface Kpi {
  label: string; value: string; sub?: string; tip: string;
  color: string; icon: typeof TrendingUp; to: string;
}

export function FinancialOverview({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { summary, ledger, payAppBalances, invoiceBalances } = useProjectFinancials(projectId);
  const s = summary.data;
  const [filter, setFilter] = useState<Filter>("all");
  const [showMore, setShowMore] = useState(false);
  const go = (tab: string) => navigate(`/projects/${projectId}/financials/${tab}`);
  // Map a ledger entry to its source-record detail route.
  const ledgerHref = (e: LedgerEntry): string => {
    const base = `/projects/${projectId}/financials`;
    const id = String(e.ledger_id ?? "").split(":")[1] ?? "";
    switch (e.entry_type) {
      case "pay_app": return id ? `${base}/prime-contract/pay-apps/${id}` : `${base}/prime-contract`;
      case "prime_contract": return `${base}/prime-contract`;
      case "change_order": return `${base}/change-orders`;
      case "commitment": return id ? `${base}/commitments/${id}` : `${base}/commitments`;
      case "invoice": return `${base}/invoices`;
      case "payment": return `${base}/payments`;
      case "lien_release": return `${base}/lien-releases`;
      default: return base;
    }
  };

  const rows = useMemo(
    () => (ledger.data ?? []).filter((e) => filter === "all" || e.direction === filter),
    [ledger.data, filter],
  );
  const summ = useMemo(() => summarizeLedger(ledger.data ?? []), [ledger.data]);

  // Contract-value waterfall
  const base = s?.original_contract ?? 0;
  const cos = s?.approved_co_value ?? 0;
  const revised = s?.revised_contract ?? base + cos;
  const billed = s?.billed_to_date ?? 0;
  const billedPct = revised > 0 ? Math.round((billed / revised) * 100) : 0;

  // The handful that actually matter at a glance — plain-language, with tooltips.
  const primary: Kpi[] = [
    { label: "Total Contract", value: fmt(revised), sub: "incl. change orders", icon: FileText, color: "text-foreground",
      to: "prime-contract",
      tip: "The full value of the job today — your original contract plus every approved change order. This is the most the client can be billed without a new change order." },
    { label: "Change Orders", value: fmt(cos), icon: TrendingUp, color: cos >= 0 ? "text-emerald-600" : "text-destructive",
      to: "change-orders",
      tip: "Extra or changed work that's been approved and added to the contract. A negative number means approved deductions (credits back to the client)." },
    { label: "Billed to Date", value: fmt(billed), sub: `${billedPct}% of contract`, icon: ArrowUpRight, color: "text-foreground",
      to: "prime-contract",
      tip: "How much you've invoiced the client so far, across all pay applications — the running total of what you've asked to be paid." },
    { label: "Paid to Date", value: fmt(s?.received_to_date), icon: ArrowDownLeft, color: "text-emerald-600",
      to: "payments",
      tip: "Cash the client has actually paid you to date. (Different from 'billed' — billing is what you asked for; this is what you've received.)" },
    { label: "Outstanding (owed to you)", value: fmt(s?.ar_outstanding), icon: Scale,
      color: (s?.ar_outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600",
      to: "prime-contract",
      tip: "Money you've billed the client but haven't been paid yet — outstanding invoices the client still owes you." },
  ];

  // Secondary detail — the payables side, retainage and net position. Useful, but
  // hidden by default so the top isn't a wall of numbers.
  const secondary: Kpi[] = [
    { label: "Original Contract", value: fmt(base), icon: FileText, color: "text-foreground", to: "prime-contract",
      tip: "The contract value before any change orders — what the job was originally signed for." },
    { label: "Committed to Subs", value: fmt(s?.committed_total), icon: ArrowUpRight, color: "text-foreground", to: "commitments",
      tip: "The total value of subcontracts and purchase orders you've committed to — what you've agreed to pay your subs and suppliers." },
    { label: "Paid to Subs", value: fmt(s?.paid_to_subs), icon: ArrowUpRight, color: "text-[var(--apas-sapphire)]", to: "payments?tab=paid",
      tip: "Cash you've actually paid out to subcontractors and suppliers to date." },
    { label: "You Owe Subs (A/P)", value: fmt(s?.ap_outstanding), icon: Scale,
      color: (s?.ap_outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600", to: "invoices",
      tip: "Approved subcontractor/supplier invoices you've received but haven't paid yet — what you still owe them." },
    { label: "Retainage (held / owed)", value: `${fmt(s?.ar_retainage_held)} / ${fmt(s?.ap_retainage_held)}`, icon: ShieldCheck, color: "text-muted-foreground", to: "prime-contract",
      tip: "Money withheld until closeout. Left: retainage the client is holding back from you. Right: retainage you're holding back from your subs. Released when the work is accepted." },
    { label: "Net Cash Position", value: fmt(s?.net_cash_position), icon: Wallet,
      color: (s?.net_cash_position ?? 0) >= 0 ? "text-emerald-600" : "text-destructive", to: "ledger",
      tip: "Cash received from the client minus cash paid to subs — roughly how much of this job's money is currently in your pocket." },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* Primary KPIs — the numbers that matter at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {primary.map((k) => <KpiCard key={k.label} k={k} onClick={() => go(k.to)} />)}
        </div>

        {/* Secondary detail — collapsed by default */}
        <div>
          <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={() => setShowMore((v) => !v)}>
            {showMore ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
            {showMore ? "Hide" : "More detail"} — subs, retainage &amp; net cash
          </Button>
          {showMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
              {secondary.map((k) => <KpiCard key={k.label} k={k} onClick={() => go(k.to)} />)}
            </div>
          )}
        </div>

        {/* Contract Value — composition + billing progress */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contract Value</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Composition: Base + COs = Revised (stacked, proportional to revised) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Original + Change Orders = Total Contract</span>
                <span className="font-semibold text-foreground">{fmt(revised)}</span>
              </div>
              <div className="flex h-7 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="bg-muted-foreground/50 flex items-center justify-center text-[10px] font-medium text-white"
                  style={{ width: revised > 0 ? `${Math.max(2, (base / revised) * 100)}%` : "0%" }}
                  title={`Original ${fmt(base)}`}
                >
                  {base / Math.max(revised, 1) > 0.12 ? fmt(base) : ""}
                </div>
                <div
                  className="bg-emerald-500/70 flex items-center justify-center text-[10px] font-medium text-white"
                  style={{ width: revised > 0 ? `${(cos / revised) * 100}%` : "0%" }}
                  title={`Change Orders ${fmt(cos)}`}
                >
                  {cos / Math.max(revised, 1) > 0.08 ? fmt(cos) : ""}
                </div>
              </div>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted-foreground/50" /> Original {fmt(base)}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500/70" /> Change Orders {fmt(cos)}</span>
              </div>
            </div>

            {/* Billing progress vs revised */}
            <ProgressRow label="Billed to Date" value={s?.billed_to_date ?? 0} max={revised} barCls="bg-[var(--apas-sapphire)]" />
            <ProgressRow label="Paid to Date" value={s?.received_to_date ?? 0} max={revised} barCls="bg-emerald-500" />
          </CardContent>
        </Card>

        {/* AR aging + AP aging */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AgingCard title="Owed to You — Pay Apps" rows={(payAppBalances.data ?? []).map((p) => ({
            ref: `Pay App #${p.pay_app_no}`, billed: p.billed_amount, settled: p.received_to_date,
            balance: p.balance_due, status: p.status,
            to: `/projects/${projectId}/financials/prime-contract/pay-apps/${(p as any).pay_app_id}`,
          }))} />
          <AgingCard title="You Owe — Vendor Invoices" rows={(invoiceBalances.data ?? []).map((i) => ({
            ref: i.invoice_no ?? "Invoice", billed: i.billed_amount, settled: i.paid_to_date,
            balance: i.balance_due, status: i.status, lien: i.lien_satisfied,
            to: `/projects/${projectId}/financials/commitments/${(i as any).commitment_id}`,
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
            <div className="overflow-x-auto"><table className="w-full text-sm">
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
                  <tr
                    key={e.ledger_id}
                    className="border-t hover:bg-accent/30 cursor-pointer"
                    onClick={() => navigate(ledgerHref(e))}
                    title={`Open ${ENTRY_LABEL[e.entry_type]}`}
                  >
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
            </table></div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function KpiCard({ k, onClick }: { k: Kpi; onClick: () => void }) {
  const Icon = k.icon;
  return (
    <Card onClick={onClick} className="cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{k.label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto shrink-0 text-muted-foreground/60 hover:text-foreground"
                aria-label={`What does "${k.label}" mean?`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-xs leading-relaxed">{k.tip}</TooltipContent>
          </Tooltip>
        </div>
        <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
        {k.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</div>}
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, value, max, barCls }: { label: string; value: number; max: number; barCls: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{fmt(value)} <span className="text-muted-foreground font-normal">· {pct.toFixed(0)}%</span></span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AgingCard({ title, rows }: {
  title: string;
  rows: Array<{ ref: string; billed: number; settled: number; balance: number; status: string; lien?: boolean; to?: string }>;
}) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="p-2.5">Ref</th><th className="p-2.5 text-right">Billed</th>
              <th className="p-2.5 text-right">Settled</th><th className="p-2.5 text-right">Balance</th><th className="p-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">None</td></tr>}
            {rows.map((r) => (
              <tr
                key={r.ref}
                className={`border-t ${r.to ? "cursor-pointer hover:bg-accent/30" : ""}`}
                onClick={r.to ? () => navigate(r.to!) : undefined}
                title={r.to ? `Open ${r.ref}` : undefined}
              >
                <td className={`p-2.5 font-mono text-xs ${r.to ? "text-primary" : ""}`}>{r.ref}</td>
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
        </table></div>
      </CardContent>
    </Card>
  );
}
