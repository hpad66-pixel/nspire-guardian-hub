import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCommitments, useCommitmentInvoices, type CommitmentInvoice, type Commitment } from "@/hooks/useCommitments";
import { usePrimeContract, usePayApps } from "@/hooks/usePrimeContract";
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

/** Clean vendor name from a commitment title like "Eco Tech — Field Services". */
function vendorName(c: Commitment) {
  const t = (c.title ?? "").split("—")[0].trim();
  return t || c.commitment_no;
}

/** One vendor block: header + that vendor's pay apps numbered #1..N chronologically. */
function VendorInvoiceGroup({
  commitment, projectId, onOpen,
}: {
  commitment: Commitment;
  projectId: string;
  onOpen: (invoiceId: string, commitmentId: string) => void;
}) {
  const { data: invoices = [], isLoading } = useCommitmentInvoices(commitment.id);
  if (isLoading) return null;

  // Subcontractor invoices keep the vendor's OWN invoice number — they are NOT
  // pay applications (those belong to the prime contract). Order chronologically
  // only for display.
  const ordered = [...invoices].sort((a, b) =>
    (a.period_end ?? a.created_at ?? "").localeCompare(b.period_end ?? b.created_at ?? ""));
  const total = ordered.reduce((s, i) => s + (Number(i.approved_amount ?? i.submitted_amount) || 0), 0);

  return (
    <div className="border-b last:border-0">
      {/* Subcontractor header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
        <Link
          to={`/projects/${projectId}/financials/commitments/${commitment.id}`}
          className="text-sm font-semibold hover:underline text-primary flex items-center gap-2"
        >
          {vendorName(commitment)}
          <span className="text-xs font-normal text-muted-foreground">Subcontractor · {commitment.commitment_no}</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          {ordered.length} invoice{ordered.length !== 1 ? "s" : ""} · {fmt(total)}
        </span>
      </div>
      {ordered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">No invoices submitted yet.</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {ordered.map((inv) => (
              <tr key={inv.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => onOpen(inv.id, commitment.id)}>
                <td className="p-3 w-28">
                  <span className="font-bold text-foreground">Invoice #{inv.invoice_no}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground font-mono">{vendorName(commitment)}</td>
                <td className="p-3 text-sm text-muted-foreground">{fmtDate(inv.period_end)}</td>
                <td className="p-3 text-right font-mono text-sm">{inv.submitted_amount != null ? money(inv.submitted_amount) : "—"}</td>
                <td className="p-3 text-right font-mono text-sm">{inv.approved_amount != null ? money(inv.approved_amount) : "—"}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLOR[inv.status]}`}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Prime contract pay apps (the GC's billings to the owner) as a vendor group. */
function PrimePayAppGroup({ projectId, primeContractId, label }: { projectId: string; primeContractId: string; label: string }) {
  const navigate = useNavigate();
  const { data: payApps = [], isLoading } = usePayApps(primeContractId);
  if (isLoading) return null;
  const ordered = [...payApps].sort((a: any, b: any) => (a.pay_app_no ?? 0) - (b.pay_app_no ?? 0));
  const total = ordered.reduce((s: number, p: any) => s + (Number(p.approved_amount ?? p.submitted_amount) || 0), 0);
  return (
    <div className="border-b last:border-0">
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--apas-sapphire)]/5">
        <Link to={`/projects/${projectId}/financials/prime-contract`} className="text-sm font-semibold hover:underline text-primary flex items-center gap-2">
          {label}
          <span className="text-xs font-normal text-muted-foreground">Prime Contract</span>
        </Link>
        <span className="text-xs text-muted-foreground">
          {ordered.length} pay app{ordered.length !== 1 ? "s" : ""} · {fmt(total)}
        </span>
      </div>
      {ordered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground italic">No pay applications yet.</div>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {ordered.map((pa: any) => (
              <tr key={pa.id} className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate(`/projects/${projectId}/financials/prime-contract/pay-apps/${pa.id}`)}>
                <td className="p-3 w-24"><span className="font-bold text-[var(--apas-sapphire)]">Pay App #{pa.pay_app_no}</span></td>
                <td className="p-3 text-xs text-muted-foreground font-mono">{pa.invoice_no ? `Ref ${pa.invoice_no}` : ""}</td>
                <td className="p-3 text-sm text-muted-foreground">{fmtDate(pa.period_end)}</td>
                <td className="p-3 text-right font-mono text-sm">{pa.submitted_amount != null ? money(pa.submitted_amount) : "—"}</td>
                <td className="p-3 text-right font-mono text-sm">{pa.approved_amount != null ? money(pa.approved_amount) : "—"}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_COLOR[pa.status as CommitmentInvoice["status"]] ?? "bg-muted text-muted-foreground"}`}>{pa.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: commitments = [], isLoading } = useCommitments(projectId ?? null);
  const { data: primeContract } = usePrimeContract(projectId ?? null);
  const primeLabel = (primeContract as any)?.contractor_name || (primeContract as any)?.contract_no || "Prime Contract";

  const [newOpen, setNewOpen] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split("T")[0]);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);
  const [openCommitmentId, setOpenCommitmentId] = useState<string | null>(null);
  const [vendorFilter, setVendorFilter] = useState<string>("all");

  const visibleCommitments = vendorFilter === "all"
    ? commitments
    : commitments.filter((c) => c.id === vendorFilter);

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
          <p className="text-muted-foreground text-sm">Your pay applications to the owner, and subcontractor invoices to you.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Record Sub Invoice
        </Button>
      </div>

      {/* Vendor Invoices — grouped by vendor, numbered per vendor, filterable */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pay Applications & Invoices
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Prime contract = <span className="font-medium text-foreground">Pay Apps</span> you submit to the owner ·
              subcontractors = <span className="font-medium text-foreground">Invoices</span> they submit to you
            </p>
          </div>
          {(commitments.length > 0 || primeContract) && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">Filter:</span>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="h-8 w-[200px] text-sm">
                  <SelectValue placeholder="All parties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All parties</SelectItem>
                  {primeContract && <SelectItem value="prime">{primeLabel} (Prime · Pay Apps)</SelectItem>}
                  {commitments.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{vendorName(c)} (Sub · Invoices)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : commitments.length === 0 && !primeContract ? (
            <p className="p-4 text-sm text-muted-foreground">
              No commitments yet. Create a commitment first, then add invoices against it.
            </p>
          ) : (
            <>
              {primeContract && (vendorFilter === "all" || vendorFilter === "prime") && (
                <PrimePayAppGroup projectId={projectId!} primeContractId={(primeContract as any).id} label={primeLabel} />
              )}
              {(vendorFilter === "all" || (vendorFilter !== "prime")) && visibleCommitments.map((c) => (
                <VendorInvoiceGroup
                  key={c.id}
                  commitment={c}
                  projectId={projectId!}
                  onOpen={(invId, comId) => { setOpenInvoiceId(invId); setOpenCommitmentId(comId); }}
                />
              ))}
              <div className="p-3 text-center text-muted-foreground text-xs border-t">
                Prime pay apps auto-number #1, #2, #3… · subcontractor invoices keep the sub's own number ·{" "}
                <button className="underline" onClick={() => setNewOpen(true)}>Record a sub invoice</button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* New Invoice Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Subcontractor Invoice</DialogTitle>
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
              <Label>Sub's Invoice # (use their number)</Label>
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
