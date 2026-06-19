import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useCommitments, useCommitmentInvoices, type CommitmentInvoice, type Commitment } from "@/hooks/useCommitments";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { InvoiceBuilder } from "@/components/financial/InvoiceBuilder";
import { InvoicePDFExport } from "@/components/financial/InvoicePDFExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Receipt } from "lucide-react";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<CommitmentInvoice["status"], string> = {
  draft:     "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800",
  approved:  "bg-green-100 text-green-800",
  paid:      "bg-blue-100 text-blue-800",
  rejected:  "bg-red-100 text-red-800",
};

function InvoiceRows({
  commitment, projectId, onOpen,
}: {
  commitment: Commitment;
  projectId: string;
  onOpen: (invoiceId: string, commitmentId: string) => void;
}) {
  const { data: invoices = [], isLoading } = useCommitmentInvoices(commitment.id);
  if (isLoading || invoices.length === 0) return null;
  return (
    <>
      {invoices.map((inv) => (
        <tr
          key={inv.id}
          className="border-t hover:bg-muted/30 cursor-pointer"
          onClick={() => onOpen(inv.id, commitment.id)}
        >
          <td className="p-3 font-mono text-sm">{inv.invoice_no}</td>
          <td className="p-3 text-sm">
            <Link
              to={`/projects/${projectId}/financials/commitments/${commitment.id}`}
              className="hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {commitment.commitment_no} · {commitment.title}
            </Link>
          </td>
          <td className="p-3 text-sm text-muted-foreground">{inv.period_end}</td>
          <td className="p-3 text-right font-mono text-sm">
            {inv.submitted_amount != null ? money(inv.submitted_amount) : "—"}
          </td>
          <td className="p-3 text-right font-mono text-sm">
            {inv.approved_amount != null ? money(inv.approved_amount) : "—"}
          </td>
          <td className="p-3">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLOR[inv.status]}`}>
              {inv.status}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: commitments = [], isLoading } = useCommitments(projectId ?? null);

  const [newOpen, setNewOpen] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0]);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);
  const [openCommitmentId, setOpenCommitmentId] = useState<string | null>(null);

  const selectedCommitment = commitments.find((c) => c.id === selectedCommitmentId) ?? null;
  const { create: createInvoice } = useCommitmentInvoices(selectedCommitmentId || null);

  async function handleCreate() {
    if (!selectedCommitmentId) { toast.error("Select a commitment"); return; }
    if (!invoiceNo.trim()) { toast.error("Invoice # required"); return; }
    try {
      const row = await createInvoice.mutateAsync({ invoice_no: invoiceNo.trim(), period_end: periodEnd });
      setNewOpen(false);
      setInvoiceNo(""); setSelectedCommitmentId(""); setPeriodEnd(new Date().toISOString().split("T")[0]);
      setOpenInvoiceId(row.id);
      setOpenCommitmentId(selectedCommitmentId);
      toast.success(`Invoice ${row.invoice_no} created`);
    } catch (e: any) { toast.error(e.message); }
  }

  const openInvoice = openInvoiceId
    ? commitments.find((c) => c.id === openCommitmentId)
    : null;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground text-sm">Prime contract pay applications and commitment invoices.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Commitment Invoice
        </Button>
      </div>

      {/* Commitment Sub-Invoices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Commitment Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : commitments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No commitments yet. Create a commitment first, then add invoices against it.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 text-left font-medium">Invoice #</th>
                  <th className="p-3 text-left font-medium">Commitment</th>
                  <th className="p-3 text-left font-medium">Period End</th>
                  <th className="p-3 text-right font-medium">Submitted</th>
                  <th className="p-3 text-right font-medium">Approved</th>
                  <th className="p-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {commitments.map((c) => (
                  <InvoiceRows
                    key={c.id}
                    commitment={c}
                    projectId={projectId!}
                    onOpen={(invId, comId) => {
                      setOpenInvoiceId(invId);
                      setOpenCommitmentId(comId);
                    }}
                  />
                ))}
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs border-t">
                    Click any row to open the invoice builder ·{" "}
                    <button className="underline" onClick={() => setNewOpen(true)}>New Invoice</button>
                    {" "}to create one
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* New Invoice Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Commitment Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Commitment</Label>
              <Select value={selectedCommitmentId} onValueChange={setSelectedCommitmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select commitment…" />
                </SelectTrigger>
                <SelectContent>
                  {commitments.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.commitment_no} · {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Invoice #</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="INV-001" />
            </div>
            <div className="space-y-1">
              <Label>Period End</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Builder Drawer */}
      <Dialog
        open={Boolean(openInvoiceId)}
        onOpenChange={(open) => { if (!open) { setOpenInvoiceId(null); setOpenCommitmentId(null); } }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice Builder
              {openInvoice && (
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  · {openInvoice.commitment_no} {openInvoice.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {openInvoiceId && openCommitmentId && (
            <div className="space-y-4">
              <InvoiceBuilder invoiceId={openInvoiceId} commitmentId={openCommitmentId} />
              <div className="flex justify-end pt-2 border-t">
                <InvoicePDFExport
                  invoiceId={openInvoiceId}
                  commitmentId={openCommitmentId}
                  commitmentNo={openInvoice?.commitment_no ?? ""}
                  commitmentTitle={openInvoice?.title ?? ""}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
