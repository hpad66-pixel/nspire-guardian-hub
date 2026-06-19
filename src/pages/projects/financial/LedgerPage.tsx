import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { RecordPaymentDialog } from "@/components/financial/RecordPaymentDialog";
import {
  useProjectLedger, type LedgerEntry,
} from "@/hooks/useContractFinancials";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { type ContractInvoice } from "@/hooks/useContractFinancials";
import { downloadContractPayAppPdf } from "@/lib/pdf/payAppFromContract";
import { summarizeLedger } from "@/lib/financial/ledger";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Plus, Download, FileText, ArrowDownLeft, ArrowUpRight, Scale,
} from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const ENTRY_LABEL: Record<LedgerEntry["entry_type"], string> = {
  invoice: "Invoice",
  pay_app: "Pay App",
  change_order: "Change Order",
  payment: "Payment",
};

type Filter = "all" | "receivable" | "payable";

export default function LedgerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: ledger = [], isLoading } = useProjectLedger(projectId!);
  const { data: contracts = [] } = useProjectContracts(projectId!);

  const [filter, setFilter] = useState<Filter>("all");
  const [payOpen, setPayOpen] = useState(false);

  const rows = useMemo(
    () => ledger.filter((e) => filter === "all" || e.direction === filter),
    [ledger, filter],
  );

  // KPIs — billings vs cash on each side.
  const k = useMemo(() => summarizeLedger(ledger), [ledger]);

  async function handleGenerateAia(entry: LedgerEntry) {
    try {
      const contract = contracts.find((c) => c.id === entry.contract_id);
      if (!contract || !entry.invoice_id) {
        toast.error("Contract or invoice not found");
        return;
      }
      const [{ data: invoice, error: invErr }, { data: cos }] = await Promise.all([
        supabase.from("contract_invoices").select("*").eq("id", entry.invoice_id).single(),
        supabase.from("contract_change_orders").select("*").eq("contract_id", entry.contract_id),
      ]);
      if (invErr || !invoice) {
        toast.error("Could not load invoice");
        return;
      }
      await downloadContractPayAppPdf({
        contract,
        invoice: invoice as ContractInvoice,
        sovItems: contract.sov_items ?? [],
        changeOrders: (cos ?? []) as any,
      });
      toast.success("AIA G702/G703 generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate pay app");
    }
  }

  function exportCsv() {
    const headers = ["Date", "Type", "Direction", "Party", "Reference", "Description", "Status", "Amount"];
    const lines = rows.map((e) => [
      fmtDate(e.entry_date), ENTRY_LABEL[e.entry_type], e.direction,
      e.party_name ?? "", e.reference ?? "", (e.description ?? "").replace(/\s+/g, " "),
      e.status ?? "", String(e.amount ?? 0),
    ]);
    const csv = [headers, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "A/R Billed (to owner)", value: fmt(k.arBilled), icon: ArrowUpRight, color: "text-foreground" },
    { label: "A/R Received", value: fmt(k.arReceived), icon: ArrowDownLeft, color: "text-emerald-600" },
    { label: "A/R Outstanding", value: fmt(k.arOutstanding), icon: Scale, color: k.arOutstanding > 0 ? "text-amber-600" : "text-emerald-600" },
    { label: "A/P Billed (from subs)", value: fmt(k.apBilled), icon: ArrowDownLeft, color: "text-foreground" },
    { label: "A/P Paid", value: fmt(k.apPaid), icon: ArrowUpRight, color: "text-[var(--apas-sapphire)]" },
    { label: "A/P Outstanding", value: fmt(k.apOutstanding), icon: Scale, color: k.apOutstanding > 0 ? "text-amber-600" : "text-emerald-600" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <BookOpen className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Financial Ledger</h1>
            <p className="text-muted-foreground text-sm">
              Receivables (invoices to the owner) and payables (invoices from subs &amp; vendors), with every payment.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setPayOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Record Payment
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <kpi.icon className="h-3.5 w-3.5" /> {kpi.label}
              </div>
              <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {(["all", "receivable", "payable"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "receivable" ? "Receivable (A/R)" : "Payable (A/P)"}
          </Button>
        ))}
      </div>

      {/* Ledger table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Party</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading ledger…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No ledger entries yet.</td></tr>
              )}
              {rows.map((e) => {
                const isPayment = e.entry_type === "payment";
                return (
                  <tr key={e.ledger_id} className="border-t hover:bg-muted/20">
                    <td className="p-3 whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="font-normal">{ENTRY_LABEL[e.entry_type]}</Badge>
                    </td>
                    <td className="p-3">{e.party_name ?? "—"}</td>
                    <td className="p-3">
                      <span className="font-mono text-xs">{e.reference ?? "—"}</span>
                      {e.description && <div className="text-xs text-muted-foreground truncate max-w-[260px]">{e.description}</div>}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="secondary"
                        className={
                          e.direction === "receivable"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {e.direction === "receivable" ? "A/R" : "A/P"}
                      </Badge>{" "}
                      <span className="text-xs text-muted-foreground">{e.status}</span>
                    </td>
                    <td className={`p-3 text-right font-medium ${isPayment ? "text-emerald-700" : ""}`}>
                      {isPayment ? "−" : ""}{fmt(e.amount)}
                    </td>
                    <td className="p-3 text-right">
                      {e.entry_type === "pay_app" && (
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateAia(e)} title="Generate AIA G702/G703">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <RecordPaymentDialog open={payOpen} onOpenChange={setPayOpen} projectId={projectId!} />
    </div>
  );
}
