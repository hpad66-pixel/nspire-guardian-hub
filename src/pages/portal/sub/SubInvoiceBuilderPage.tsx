/**
 * F1 · Sub portal — build a new invoice on a commitment.
 *
 * Flow:
 *   1. Create a provenance-backed draft through the vendor-portal RPC
 *   2. Open InvoiceBuilder for per-line % complete + materials
 *   3. Click Submit → status=submitted, routes Ball-in-Court back to GC accountant
 *
 * The RPC validates that the vendor belongs to the commitment and creates the
 * structured source evidence needed by the invoice-first payment controls.
 */
import { toDateOnly } from "@/lib/date";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

  const [draftId, setDraftId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [periodEnd, setPeriodEnd] = useState(toDateOnly(new Date()));

  const { detail, submit, revise } = useInvoice(draftId);
  const create = useMutation({
    mutationFn: async (input: { invoiceNo: string; periodEnd: string }) => {
      if (!commitmentId) throw new Error("No commitment selected");
      const { data, error } = await (supabase as any).rpc(
        "create_vendor_portal_commitment_invoice",
        {
          p_commitment_id: commitmentId,
          p_invoice_no: input.invoiceNo,
          p_period_end: input.periodEnd,
        },
      );
      if (error) throw error;
      if (typeof data !== "string" || !data) {
        throw new Error("The vendor invoice draft was not created");
      }
      return data;
    },
  });

  async function handleCreate() {
    if (!invoiceNo.trim()) { toast.error("Invoice # required"); return; }
    try {
      const invoiceId = await create.mutateAsync({ invoiceNo: invoiceNo.trim(), periodEnd });
      setDraftId(invoiceId);
      toast.success(`Draft ${invoiceNo.trim()} created — fill in the line values below`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleSubmit() {
    try {
      await submit.mutateAsync();
      toast.success("Submitted for GC review");
      navigate(`/sub-portal/commitments/${commitmentId}`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleRevise() {
    try {
      await revise.mutateAsync();
      toast.success("Invoice reopened for revision");
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
                {inv?.status === "rejected" && inv?.source_kind !== "vendor_pay_app" && (
                  <Button variant="outline" onClick={handleRevise} disabled={revise.isPending}>
                    {revise.isPending ? "Reopening…" : "Revise"}
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
