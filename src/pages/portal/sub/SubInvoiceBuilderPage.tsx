/**
 * F1 · Sub portal — build a new invoice on a commitment.
 *
 * Flow:
 *   1. Create a draft commitment_invoices row (status=draft)
 *   2. Open InvoiceBuilder for per-line % complete + materials
 *   3. Click Submit → status=submitted, routes Ball-in-Court back to GC accountant
 *
 * RLS (ci_sub_portal_insert in F1 migration) enforces that the sub can only
 * insert rows on commitments belonging to orgs they're a member of.
 */
import { toDateOnly } from "@/lib/date";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useCommitmentInvoices } from "@/hooks/useCommitments";
import { useInvoice } from "@/hooks/useInvoices";
import { InvoiceBuilder } from "@/components/financial/InvoiceBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SubInvoiceBuilderPage() {
  const { commitmentId } = useParams<{ commitmentId: string }>();
  const navigate = useNavigate();
  const { create } = useCommitmentInvoices(commitmentId ?? null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [periodEnd, setPeriodEnd] = useState(toDateOnly(new Date()));

  const { detail, submit } = useInvoice(draftId);

  async function handleCreate() {
    if (!invoiceNo.trim()) { toast.error("Invoice # required"); return; }
    try {
      const row = await create.mutateAsync({ invoice_no: invoiceNo.trim(), period_end: periodEnd });
      setDraftId((row as any).id);
      toast.success(`Draft ${row.invoice_no} created — fill in the line values below`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSubmit() {
    try {
      await submit.mutateAsync();
      toast.success("Submitted for GC review");
      navigate(`/sub-portal/commitments/${commitmentId}`);
    } catch (e: any) { toast.error(e.message); }
  }

  const inv = detail.data as any;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <Link
          to={`/sub-portal/commitments/${commitmentId}`}
          className="text-sm text-muted-foreground hover:underline"
        >← Commitment</Link>
        <h1 className="text-3xl font-bold mt-2">New invoice</h1>
      </div>

      {!draftId ? (
        <Card>
          <CardHeader><CardTitle>Create draft</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Invoice #</Label>
                <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)}
                       placeholder="INV-001" />
              </div>
              <div>
                <Label>Period end</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create draft"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                Invoice {inv?.invoice_no ?? "…"}
                {inv && (
                  <Badge variant="outline" className="ml-2 capitalize">{inv.status}</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {inv?.status === "draft" && (
                  <Button onClick={handleSubmit} disabled={submit.isPending}>
                    {submit.isPending ? "Submitting…" : "Submit for review"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <InvoiceBuilder
                invoiceId={draftId}
                commitmentId={commitmentId!}
                readOnly={inv?.status !== "draft"}
              />
            </CardContent>
          </Card>
          {inv?.status === "submitted" && (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              Submitted. GC Project Accountant will review and approve or reject.
            </CardContent></Card>
          )}
          {inv?.status === "rejected" && inv?.rejection_comment && (
            <Card><CardContent className="p-6">
              <div className="text-sm font-medium text-destructive">Rejected</div>
              <div className="text-sm mt-1">{inv.rejection_comment}</div>
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
