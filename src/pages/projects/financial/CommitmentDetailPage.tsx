import { toDateOnly } from "@/lib/date";
import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import {
  useCommitments, useCommitmentTotals, useCommitmentInvoices,
} from "@/hooks/useCommitments";
import { useChangeOrdersByType } from "@/hooks/useProcoreChangeOrders";
import { useInvoice } from "@/hooks/useInvoices";
import { useCommitmentPayments } from "@/hooks/useCommitmentPayments";
import { CommitmentSovTable } from "@/components/financial/CommitmentSovTable";
import { InvoiceBuilder } from "@/components/financial/InvoiceBuilder";
import { InvoicePDFExport } from "@/components/financial/InvoicePDFExport";
import { RecordCommitmentPaymentDialog } from "@/components/financial/RecordCommitmentPaymentDialog";
import { LienReleasePanel } from "@/components/financial/LienReleasePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, ChevronRight, LayoutDashboard } from "lucide-react";
import { money } from "@/lib/pdf";
import { useProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function CommitmentDetailPage() {
  const { projectId, commitmentId } = useParams<{ projectId: string; commitmentId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { data: commitments = [] } = useCommitments(projectId ?? null);
  const commitment = commitments.find((c) => c.id === commitmentId);
  const { data: totals } = useCommitmentTotals(commitmentId ?? null);
  const { data: invoices = [], create: createInvoice } = useCommitmentInvoices(commitmentId ?? null);
  const { data: ccos = [] } = useChangeOrdersByType(projectId ?? null, "CCO");
  const filteredCcos = ccos.filter((co) => co.commitment_id === commitmentId);

  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [periodEnd, setPeriodEnd] = useState(toDateOnly(new Date()));
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  if (!commitment) return <div className="p-6 text-muted-foreground">Loading commitment…</div>;

  async function handleCreateInvoice() {
    if (!invoiceNo.trim()) { toast.error("Invoice # required"); return; }
    try {
      const row = await createInvoice.mutateAsync({ invoice_no: invoiceNo.trim(), period_end: periodEnd });
      setNewInvoiceOpen(false);
      setInvoiceNo(""); setPeriodEnd(toDateOnly(new Date()));
      setOpenInvoiceId(row.id);
      toast.success(`Invoice ${row.invoice_no} created`);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap mb-4">
          <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}`} className="hover:text-foreground">
            {project?.name ?? 'Project'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/prime-contract`} className="hover:text-foreground">
            Financials
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/projects/${projectId}/financials/commitments`} className="hover:text-foreground">
            Commitments
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{commitment.title}</span>
        </nav>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">{commitment.commitment_no}</span>
              {commitment.title}
            </h1>
            <div className="text-muted-foreground capitalize">
              {commitment.commitment_type.replace("_", " ")} · {commitment.status.replace("_", " ")}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">{commitment.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Original</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number((totals as any)?.original_value ?? commitment.original_value))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">CCOs</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number((totals as any)?.executed_cco_value ?? 0))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Revised</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{money(Number((totals as any)?.revised_commitment_value ?? commitment.original_value))}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Billed to date</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{money(Number((totals as any)?.billed_to_date ?? 0))}</CardContent></Card>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sov">SOV</TabsTrigger>
          <TabsTrigger value="invoices">Invoices · {invoices.length}</TabsTrigger>
          <TabsTrigger value="cos">Change orders · {filteredCcos.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Vendor:</span> {commitment.vendor_org_id ?? "—"}</div>
              <div><span className="text-muted-foreground">Executed:</span> {commitment.executed_date ?? "—"}</div>
              <div><span className="text-muted-foreground">Retainage %:</span> {commitment.retainage_pct}%</div>
              <div><span className="text-muted-foreground">Created:</span> {new Date(commitment.created_at).toLocaleDateString()}</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sov">
          <Card>
            <CardHeader><CardTitle>Schedule of Values</CardTitle></CardHeader>
            <CardContent>
              <CommitmentSovTable
                commitmentId={commitment.id}
                originalValue={Number(commitment.original_value)}
                readOnly={commitment.status === "executed" || commitment.status === "closed"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invoices</CardTitle>
              <Button size="sm" onClick={() => setNewInvoiceOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New invoice
              </Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-muted-foreground">No invoices yet.</div>
              ) : (
                <div className="divide-y text-sm">
                  {invoices.map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => setOpenInvoiceId(inv.id)}
                      className="w-full flex items-center justify-between py-2 hover:bg-muted px-2 rounded -mx-2 text-left"
                    >
                      <div>
                        <span className="font-mono mr-2">{inv.invoice_no}</span>
                        <span className="text-muted-foreground">period end {inv.period_end}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-mono">{money(Number(inv.approved_amount ?? inv.submitted_amount ?? 0))}</span>
                        <Badge variant="outline" className="capitalize">{inv.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cos">
          <Card>
            <CardHeader><CardTitle>Commitment Change Orders (CCOs)</CardTitle></CardHeader>
            <CardContent>
              {filteredCcos.length === 0 ? (
                <div className="text-muted-foreground">No CCOs on this commitment.</div>
              ) : (
                <div className="divide-y text-sm">
                  {filteredCcos.map((co) => (
                    <div key={co.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-mono mr-2">CCO-{co.co_no}</span>
                        {co.title}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-mono">{money(Number(co.amount))}</span>
                        <Badge variant="outline" className="capitalize">{co.status.replace("_", " ")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New invoice dialog */}
      <Dialog open={newInvoiceOpen} onOpenChange={setNewInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Invoice #</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
            </div>
            <div>
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice detail dialog */}
      {openInvoiceId && (
        <InvoiceDetailDialog
          invoiceId={openInvoiceId}
          projectId={projectId!}
          commitmentId={commitment.id}
          commitmentNo={commitment.commitment_no}
          commitmentTitle={commitment.title}
          open={!!openInvoiceId}
          onOpenChange={(o) => !o && setOpenInvoiceId(null)}
        />
      )}
    </div>
  );
}

function InvoiceDetailDialog({
  invoiceId, projectId, commitmentId, commitmentNo, commitmentTitle, open, onOpenChange,
}: {
  invoiceId: string; projectId: string; commitmentId: string; commitmentNo: string; commitmentTitle: string;
  open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const { detail, submit, approve, reject } = useInvoice(invoiceId);
  const { data: payments = [] } = useCommitmentPayments(invoiceId);
  const [approveAmt, setApproveAmt] = useState<number | "">("");
  const [payOpen, setPayOpen] = useState(false);
  const qc = useQueryClient();
  const inv = detail.data as any;

  async function doSubmit() {
    try { await submit.mutateAsync(); toast.success("Submitted"); } catch (e: any) { toast.error(e.message); }
  }
  async function doApprove() {
    const amt = typeof approveAmt === "number" ? approveAmt : Number(inv?.submitted_amount ?? 0);
    try { await approve.mutateAsync(amt); toast.success("Approved"); } catch (e: any) { toast.error(e.message); }
  }
  async function doReject() {
    const reason = prompt("Rejection reason?") ?? "";
    if (!reason) return;
    try { await reject.mutateAsync(reason); toast.success("Rejected"); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Invoice {inv?.invoice_no ?? "…"}</span>
            <div className="flex items-center gap-2">
              {inv && <Badge variant="outline" className="capitalize">{inv.status}</Badge>}
              <InvoicePDFExport
                invoiceId={invoiceId}
                commitmentId={commitmentId}
                commitmentNo={commitmentNo}
                commitmentTitle={commitmentTitle}
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <InvoiceBuilder invoiceId={invoiceId} commitmentId={commitmentId} />

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {inv?.status === "draft" && (
              <Button onClick={doSubmit} disabled={submit.isPending}>Submit</Button>
            )}
            {inv?.status === "submitted" && (
              <>
                <Input
                  type="number" inputMode="decimal" step="0.01"
                  placeholder="Approved amount"
                  value={approveAmt}
                  onChange={(e) => setApproveAmt(e.target.value ? Number(e.target.value) : "")}
                  className="w-48 font-mono"
                />
                <Button onClick={doApprove} disabled={approve.isPending}>Approve</Button>
                <Button variant="destructive" onClick={doReject} disabled={reject.isPending}>Reject</Button>
              </>
            )}
            {inv?.rejection_comment && (
              <div className="text-sm text-destructive">
                Rejection reason: {inv.rejection_comment}
              </div>
            )}
          </div>

          {/* AP payments against this invoice */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Payments to Vendor</h4>
              {(inv?.status === "approved" || inv?.status === "paid") && (
                <Button size="sm" onClick={() => setPayOpen(true)}>Record payment</Button>
              )}
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {inv?.status === "approved" || inv?.status === "paid"
                  ? "No payments yet. A payment requires an approved lien release."
                  : "Approve the invoice to record payments."}
              </p>
            ) : (
              <div className="divide-y text-sm">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <span className="font-mono">{p.paid_date} · {p.method ?? ""} {p.reference ?? ""}</span>
                    <span className="font-mono">{money(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inbound lien releases gate the payment above */}
          <LienReleasePanel projectId={projectId} direction="inbound" commitmentInvoiceId={invoiceId} />
        </div>

        <RecordCommitmentPaymentDialog open={payOpen} onOpenChange={setPayOpen} invoiceId={invoiceId} />
      </DialogContent>
    </Dialog>
  );
}
