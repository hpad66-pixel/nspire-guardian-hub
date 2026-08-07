/**
 * F1 · Sub portal — commitment detail for the vendor.
 *
 * Shows SOV (read-only) + invoice list + "New invoice" button that routes to
 * SubInvoiceBuilderPage + the payment ledger, so the vendor can see what
 * they've actually been paid against their contract without having to ask.
 * Invoice detail is read-only for subs unless the row is still in draft status.
 */
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSubPortalData } from "@/hooks/usePortals";
import { useCommitmentSov } from "@/hooks/useCommitments";
import { useCommitmentInvoices, useCommitmentTotals } from "@/hooks/useCommitments";
import { useVendorPayments } from "@/hooks/useVendorPayments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { money } from "@/lib/pdf";

const paidOn = (d: string | null | undefined) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function SubCommitmentDetailPage() {
  const { commitmentId } = useParams<{ commitmentId: string }>();
  const navigate = useNavigate();
  const { data: subData } = useSubPortalData();
  const commitment = (subData?.commitments ?? []).find((c: any) => c.id === commitmentId) as any;
  const { data: sov = [] } = useCommitmentSov(commitmentId ?? null);
  const { data: invoices = [] } = useCommitmentInvoices(commitmentId ?? null);
  const { data: totals } = useCommitmentTotals(commitmentId ?? null);
  const { data: payments = [] } = useVendorPayments(commitmentId ?? null);

  if (!commitment) {
    return <div className="p-6 text-muted-foreground">Loading commitment…</div>;
  }

  const sovTotal = sov.reduce((s, l) => s + Number(l.scheduled_value ?? 0), 0);
  const billedToDate = invoices
    .filter((i) => i.status === "approved" || i.status === "paid")
    .reduce((s, i) => s + Number(i.approved_amount ?? 0), 0);
  const paidToDate = payments.reduce((s, p) => s + p.amount, 0);
  // The contract as it stands today — original plus every executed change order,
  // which is what the vendor is actually working against.
  const revisedContract = Number((totals as any)?.revised_commitment_value ?? commitment.original_value);
  const changeOrders = Number((totals as any)?.executed_cco_value ?? 0);
  const outstanding = revisedContract - paidToDate;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Link to="/sub-portal/commitments" className="text-sm text-muted-foreground hover:underline">
          ← My commitments
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">{commitment.commitment_no}</span>
              {commitment.title}
            </h1>
            <div className="text-muted-foreground capitalize">
              {String(commitment.commitment_type).replace("_", " ")}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {String(commitment.status).replace("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Contract value</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(revisedContract)}</div>
            {changeOrders !== 0 && (
              <div className="text-xs text-muted-foreground">
                {money(Number(commitment.original_value))} base {changeOrders > 0 ? "+" : "−"} {money(Math.abs(changeOrders))} change orders
              </div>
            )}
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Billed to date</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(billedToDate)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Paid to date</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{money(paidToDate)}</div>
            <div className="text-xs text-muted-foreground">
              {revisedContract > 0 ? `${((paidToDate / revisedContract) * 100).toFixed(1)}% of contract` : "—"}
            </div>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Remaining</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{money(outstanding)}</div>
            <div className="text-xs text-muted-foreground">{commitment.retainage_pct}% retainage</div>
          </CardContent></Card>
      </div>

      <Tabs defaultValue="sov">
        <TabsList>
          <TabsTrigger value="sov">Schedule of Values</TabsTrigger>
          <TabsTrigger value="invoices">Invoices · {invoices.length}</TabsTrigger>
          <TabsTrigger value="payments">Payments · {payments.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="sov">
          <Card>
            <CardHeader><CardTitle>Schedule of Values (read-only)</CardTitle></CardHeader>
            <CardContent>
              {sov.length === 0 ? (
                <div className="text-muted-foreground">No SOV lines published yet.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="w-14 p-2 text-left font-medium">#</th>
                        <th className="p-2 text-left font-medium">Description</th>
                        <th className="w-32 p-2 text-right font-medium">Scheduled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sov.map((l) => (
                        <tr key={l.id} className="border-t">
                          <td className="p-2 font-mono text-xs text-muted-foreground">L{l.line_no}</td>
                          <td className="p-2">{l.description}</td>
                          <td className="p-2 text-right font-mono">{money(Number(l.scheduled_value))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/20 font-medium">
                      <tr className="border-t">
                        <td colSpan={2} className="p-2 text-right">Total</td>
                        <td className="p-2 text-right font-mono">{money(sovTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invoices submitted</CardTitle>
              <Button size="sm" onClick={() => navigate(`/sub-portal/commitments/${commitmentId}/invoices/new`)}>
                <Plus className="h-4 w-4 mr-1" /> New invoice
              </Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-muted-foreground">No invoices yet.</div>
              ) : (
                <div className="divide-y text-sm">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-mono mr-2">{inv.invoice_no}</span>
                        <span className="text-muted-foreground">period end {inv.period_end}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-mono">
                          {money(Number(inv.approved_amount ?? inv.submitted_amount ?? 0))}
                        </span>
                        <Badge
                          variant={inv.status === "rejected" ? "destructive" : "outline"}
                          className="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader><CardTitle>Payments received</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-muted-foreground">No payments recorded against this commitment yet.</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left font-medium">Date</th>
                        <th className="p-2 text-left font-medium">Method</th>
                        <th className="p-2 text-left font-medium">Reference</th>
                        <th className="w-32 p-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="whitespace-nowrap p-2">{paidOn(p.paid_date)}</td>
                          <td className="p-2 capitalize text-muted-foreground">{p.method ?? "—"}</td>
                          <td className="p-2">
                            <span className="font-mono text-xs text-muted-foreground">{p.reference || "—"}</span>
                            {p.notes && <div className="text-xs italic text-muted-foreground">{p.notes}</div>}
                          </td>
                          <td className="whitespace-nowrap p-2 text-right font-mono">{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/20 font-medium">
                      <tr className="border-t">
                        <td colSpan={3} className="p-2 text-right">Total paid to date</td>
                        <td className="p-2 text-right font-mono text-emerald-600">{money(paidToDate)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Each payment carries the bank reference it was sent under. If something here doesn't match your records,
                quote the reference when you raise it.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
