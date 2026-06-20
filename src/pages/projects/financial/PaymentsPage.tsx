import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useCommitments } from "@/hooks/useCommitments";
import { summarizeLedger } from "@/lib/financial/ledger";
import { RecordOwnerPaymentDialog } from "@/components/financial/RecordOwnerPaymentDialog";
import { RecordSubPaymentDialog } from "@/components/financial/RecordSubPaymentDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, ArrowDownLeft, ArrowUpRight, Plus, Scale } from "lucide-react";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function PaymentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { summary, ledger, payAppBalances, invoiceBalances } = useProjectFinancials(projectId ?? null);
  const { data: primeContract } = usePrimeContract(projectId ?? null);
  const { data: commitments = [] } = useCommitments(projectId ?? null);

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  const entries = ledger.data ?? [];
  const received = useMemo(
    () => entries.filter((e) => e.entry_type === "payment" && e.direction === "receivable")
      .sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? "")),
    [entries],
  );
  const paid = useMemo(
    () => entries.filter((e) => e.entry_type === "payment" && e.direction === "payable")
      .sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? "")),
    [entries],
  );
  const s = useMemo(() => summarizeLedger(entries), [entries]);
  const sum = summary.data;

  const payApps = payAppBalances.data ?? [];
  const invoices = invoiceBalances.data ?? [];

  const kpis = [
    { label: "Received (A/R)", value: fmt(s.arReceived), icon: ArrowDownLeft, color: "text-emerald-600" },
    { label: "A/R Outstanding", value: fmt(sum?.ar_outstanding), icon: Scale, color: "text-amber-600" },
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
          <p className="text-muted-foreground text-sm">
            Record cash received from the owner and cash paid to subcontractors — reconciled against the contract and change orders.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><k.icon className="h-3.5 w-3.5" /> {k.label}</div>
            <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received" className="gap-1.5"><ArrowDownLeft className="h-4 w-4" /> Received from Owner</TabsTrigger>
          <TabsTrigger value="paid" className="gap-1.5"><ArrowUpRight className="h-4 w-4" /> Paid to Subcontractors</TabsTrigger>
        </TabsList>

        {/* ── Received from owner ───────────────────────────────────────── */}
        <TabsContent value="received" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Revised contract {fmt(sum?.revised_contract)} · billed {fmt(sum?.billed_to_date)} · received {fmt(sum?.received_to_date)} ·
              <span className="text-amber-600 font-medium"> {fmt(sum?.ar_outstanding)} outstanding</span>
            </p>
            <Button size="sm" onClick={() => setOwnerOpen(true)} disabled={!primeContract}>
              <Plus className="h-4 w-4 mr-1.5" /> Record Payment Received
            </Button>
          </div>

          {/* Per-invoice reconciliation */}
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                Reconciliation by pay application
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b">
                    <th className="p-3 text-left">Pay App</th>
                    <th className="p-3 text-right">Billed</th>
                    <th className="p-3 text-right">Received</th>
                    <th className="p-3 text-right">Open balance</th>
                    <th className="p-3 text-center">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {[...payApps].sort((a, b) => a.pay_app_no - b.pay_app_no).map((p) => (
                    <tr key={p.pay_app_id} className="border-t">
                      <td className="p-3 font-medium text-[var(--apas-sapphire)]">Pay App #{p.pay_app_no}</td>
                      <td className="p-3 text-right font-mono">{fmt(p.billed_amount)}</td>
                      <td className="p-3 text-right font-mono text-emerald-600">{fmt(p.received_to_date)}</td>
                      <td className={`p-3 text-right font-mono ${p.balance_due > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{fmt(p.balance_due)}</td>
                      <td className="p-3 text-center text-muted-foreground">{p.payment_count}</td>
                    </tr>
                  ))}
                  {payApps.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No pay applications yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Receipt log */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="p-3">Date</th><th className="p-3">From</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {received.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No payments received recorded yet.</td></tr>}
                  {received.map((p) => (
                    <tr key={p.ledger_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 whitespace-nowrap">{fmtDate(p.entry_date)}</td>
                      <td className="p-3">{p.party_name ?? "Owner"}</td>
                      <td className="p-3 font-mono text-xs">{p.reference ?? "—"}</td>
                      <td className="p-3 text-right font-medium text-emerald-600">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Paid to subcontractors ────────────────────────────────────── */}
        <TabsContent value="paid" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Sub invoiced {fmt(sum?.commitment_invoiced)} · paid {fmt(sum?.paid_to_subs)} ·
              <span className="text-amber-600 font-medium"> {fmt(sum?.ap_outstanding)} outstanding</span>
            </p>
            <Button size="sm" onClick={() => setSubOpen(true)} disabled={commitments.length === 0}>
              <Plus className="h-4 w-4 mr-1.5" /> Record Payment to Sub
            </Button>
          </div>

          {/* Per-invoice reconciliation */}
          <Card>
            <CardContent className="p-0">
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                Reconciliation by subcontractor invoice
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-muted-foreground border-b">
                    <th className="p-3 text-left">Invoice</th>
                    <th className="p-3 text-right">Billed</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Open balance</th>
                    <th className="p-3 text-center">Lien</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.commitment_invoice_id} className="border-t">
                      <td className="p-3 font-medium">Invoice #{i.invoice_no ?? "—"}</td>
                      <td className="p-3 text-right font-mono">{fmt(i.billed_amount)}</td>
                      <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(i.paid_to_date)}</td>
                      <td className={`p-3 text-right font-mono ${i.balance_due > 0 ? "text-amber-600" : "text-muted-foreground"}`}>{fmt(i.balance_due)}</td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className={i.lien_satisfied ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}>
                          {i.lien_satisfied ? "Released" : "Pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No subcontractor invoices yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Disbursement log */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="p-3">Date</th><th className="p-3">To</th><th className="p-3">Reference</th><th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paid.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No subcontractor payments recorded yet.</td></tr>}
                  {paid.map((p) => (
                    <tr key={p.ledger_id} className="border-t hover:bg-muted/20">
                      <td className="p-3 whitespace-nowrap">{fmtDate(p.entry_date)}</td>
                      <td className="p-3">{p.party_name ?? "—"}</td>
                      <td className="p-3 font-mono text-xs">{p.reference ?? "—"}</td>
                      <td className="p-3 text-right font-medium text-[var(--apas-sapphire)]">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {primeContract && (
        <RecordOwnerPaymentDialog
          open={ownerOpen}
          onOpenChange={setOwnerOpen}
          primeContractId={(primeContract as any).id}
          payApps={payApps}
        />
      )}
      <RecordSubPaymentDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        commitments={commitments}
        invoiceBalances={invoices}
      />
    </div>
  );
}
