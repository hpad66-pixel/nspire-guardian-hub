import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useCommitments, useCommitmentInvoices, type CommitmentInvoice, type Commitment } from "@/hooks/useCommitments";
import { useProjectContracts } from "@/hooks/useProjectContracts";
import { useContractInvoices } from "@/hooks/useContractFinancials";
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

// ── Prime Contract Pay Applications ───────────────────────────────────────────
function PrimeContractPayApps({ projectId }: { projectId: string }) {
  const { data: contracts = [], isLoading: loadingContracts } = useProjectContracts(projectId);
  const contract = contracts.find(c => c.status === "executed") ?? contracts[0] ?? null;
  const { data: invoices = [], isLoading: loadingInvoices } = useContractInvoices(contract?.id ?? "");

  if (loadingContracts || loadingInvoices) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  if (!contract || invoices.length === 0) return null;

  const totalBilled = invoices.reduce((s, i) => s + i.amount, 0);
  const totalNet    = invoices.reduce((s, i) => s + (i.net_due ?? (i.amount - i.retainage)), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-[var(--apas-sapphire)]" />
          Prime Contract Pay Applications
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {contract.contract_number} — {contract.contract_title}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left p-3">Pay App #</th>
                <th className="text-left p-3">Period</th>
                <th className="text-left p-3">Invoice Date</th>
                <th className="text-right p-3">Gross Amount</th>
                <th className="text-right p-3">Retainage</th>
                <th className="text-right p-3">Net Due</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-mono font-medium">{inv.invoice_number ?? "—"}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                  <td className="p-3 text-right font-mono">{fmt(inv.amount)}</td>
                  <td className="p-3 text-right font-mono text-amber-600">{fmt(inv.retainage)}</td>
                  <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">
                    {fmt(inv.net_due ?? (inv.amount - inv.retainage))}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inv.status === "paid"      ? "bg-blue-100 text-blue-800" :
                      inv.status === "approved"  ? "bg-green-100 text-green-800" :
                      inv.status === "submitted" ? "bg-amber-100 text-amber-800" :
                      inv.status === "rejected"  ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/60 font-bold text-sm border-t">
                <td colSpan={3} className="p-3 text-right">Total</td>
                <td className="p-3 text-right font-mono">{fmt(totalBilled)}</td>
                <td className="p-3 text-right font-mono text-amber-600">
                  {fmt(invoices.reduce((s, i) => s + i.retainage, 0))}
                </td>
                <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totalNet)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
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

      {/* Prime Contract Pay Applications */}
      {projectId && <PrimeContractPayApps projectId={projectId} />}

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
