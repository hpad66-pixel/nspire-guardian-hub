/**
 * Vendor-invoice PDF export. Unlike the owner-facing G702/G703 export, this uses
 * a dedicated AP document with the commitment, invoice lines, paid seal, and
 * complete payment register.
 */
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileCheck2 } from "lucide-react";
import { useCommitmentSov, useCommitmentTotals } from "@/hooks/useCommitments";
import { useCommitmentPayments } from "@/hooks/useCommitmentPayments";
import { useInvoice } from "@/hooks/useInvoices";
import { useCoSettings } from "@/hooks/useCoSettings";
import { useProjectArtifacts } from "@/hooks/useProjectArtifacts";
import { VendorInvoiceDocument, type VendorInvoiceSpec } from "@/lib/vendorInvoice/VendorInvoiceDocument";
import {
  downloadVendorInvoiceBlob,
  downloadVendorInvoicePdf,
  vendorInvoicePdfBlob,
} from "@/lib/vendorInvoice/vendorInvoicePdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function InvoicePDFExport({
  invoiceId,
  projectId,
  commitmentId,
  commitmentNo,
  commitmentTitle,
  commitmentRetainagePct = 0,
  tenantName,
}: {
  invoiceId: string;
  projectId: string;
  commitmentId: string;
  commitmentNo: string;
  commitmentTitle: string;
  commitmentRetainagePct?: number;
  tenantName?: string;
}) {
  const { data: sov = [], isLoading: sovLoading, isFetching: sovFetching, isError: sovError } = useCommitmentSov(commitmentId);
  const { data: totals, isLoading: totalsLoading, isFetching: totalsFetching, isError: totalsError } = useCommitmentTotals(commitmentId);
  const { detail, lines, balance } = useInvoice(invoiceId);
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
    isError: paymentsError,
  } = useCommitmentPayments(invoiceId);
  const { data: coSettings, isLoading: coSettingsLoading } = useCoSettings();
  const { upload, remove } = useProjectArtifacts(projectId);
  const queryClient = useQueryClient();
  const docRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const spec = useMemo<VendorInvoiceSpec | null>(() => {
    const inv = detail.data as any;
    if (!inv) return null;
    const linesByS = new Map((lines.data ?? []).map((l) => [l.sov_line_id, l]));
    const orderedPayments = [...payments].sort((a, b) =>
      `${a.paid_date}|${a.created_at ?? ""}`.localeCompare(`${b.paid_date}|${b.created_at ?? ""}`),
    );
    const totalPaid = orderedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const ceiling = Number(inv.approved_amount ?? inv.submitted_amount ?? 0);
    const netPayable = Math.max(0, ceiling - Number(inv.retainage_held ?? 0));
    const recordedBalance = Number((balance.data as any)?.balance_due ?? netPayable - totalPaid);
    const fullyPaid = inv.status === "paid" && orderedPayments.length > 0 && recordedBalance <= 0.005;
    const vendor = (commitmentTitle ?? "").split("—")[0].trim() || commitmentTitle || "Vendor";
    const s: any = coSettings ?? {};

    return {
      wordmark: tenantName || s.wordmark || s.company_name || "APAS CONSULTING",
      invoiceNo: String(inv.invoice_no ?? "—"),
      periodEnd: inv.period_end,
      status: inv.status,
      vendorName: vendor,
      commitmentNo,
      commitmentTitle,
      originalValue: Number((totals as any)?.original_value ?? 0),
      revisedValue: Number((totals as any)?.revised_commitment_value ?? (totals as any)?.original_value ?? 0),
      submittedAmount: Number(inv.submitted_amount ?? 0),
      approvedAmount: Number(inv.approved_amount ?? inv.submitted_amount ?? 0),
      retainageHeld: Number(inv.retainage_held ?? 0),
      retainagePct: Number(commitmentRetainagePct ?? 0),
      processedDate: inv.processed_at ?? inv.updated_at ?? inv.created_at ?? orderedPayments[orderedPayments.length - 1]?.paid_date ?? null,
      // paid_at is a timestamp synthesized from the bank's date-only value.
      // Prefer the canonical date-only payment so timezone formatting can never
      // shift the paid stamp back a calendar day.
      paidDate: orderedPayments[orderedPayments.length - 1]?.paid_date ?? null,
      fullyPaid,
      payments: orderedPayments.map((p) => ({
        id: p.id,
        paidDate: p.paid_date,
        method: p.method,
        reference: p.reference,
        amount: Number(p.amount),
      })),
      lines: sov.map((line: any) => {
        const invoiceLine = linesByS.get(line.id);
        return {
          lineNo: String(line.line_no),
          description: line.description,
          scheduledValue: Number(line.scheduled_value ?? 0),
          workThisPeriod: Number(invoiceLine?.work_this_period ?? 0),
          materialsStored: Number(invoiceLine?.materials_stored ?? 0),
        };
      }),
    };
  }, [balance.data, coSettings, commitmentNo, commitmentRetainagePct, commitmentTitle, detail.data, lines.data, payments, sov, tenantName, totals]);

  // A paid PDF is permanent accounting evidence. Do not let a fast click
  // rasterize a partially loaded document before its lines/payments/balance are
  // present (which could otherwise download a paid invoice without its seal).
  const documentLoadFailed = detail.isError
    || lines.isError
    || balance.isError
    || paymentsError
    || sovError
    || totalsError;
  const documentReady = Boolean(spec)
    && !documentLoadFailed
    && !detail.isLoading
    && !detail.isFetching
    && !lines.isLoading
    && !lines.isFetching
    && !balance.isLoading
    && !balance.isFetching
    && !paymentsLoading
    && !paymentsFetching
    && !sovLoading
    && !sovFetching
    && !totalsLoading
    && !totalsFetching
    && !coSettingsLoading;
  const hasFinalizedArtifact = Boolean((detail.data as any)?.finalized_artifact_id);
  const finalizedDownloadReady = Boolean(spec)
    && hasFinalizedArtifact
    && !detail.isLoading
    && !detail.isFetching
    && !detail.isError;
  const actionReady = finalizedDownloadReady || documentReady;

  async function handleExport() {
    if (!spec || !actionReady) {
      toast.error(documentLoadFailed ? "Invoice evidence could not be loaded" : "Invoice is still loading");
      return;
    }
    const invoice = detail.data as any;
    const filename = `Invoice-${spec.invoiceNo}-${commitmentNo || "vendor"}.pdf`;
    setBusy(true);
    try {
      if (invoice?.finalized_artifact_id) {
        const { data: artifact, error: artifactError } = await (supabase as any)
          .from("project_artifacts")
          .select("file_path, file_name")
          .eq("id", invoice.finalized_artifact_id)
          .single();
        if (artifactError) throw artifactError;
        const { data: signed, error: signedError } = await supabase.storage
          .from("project-artifacts")
          .createSignedUrl(artifact.file_path, 60);
        if (signedError) throw signedError;
        const anchor = document.createElement("a");
        anchor.href = signed.signedUrl;
        anchor.download = artifact.file_name || filename;
        anchor.click();
        toast.success(`Downloaded finalized invoice ${spec.invoiceNo}`);
        return;
      }

      const documentNode = docRef.current;
      if (!documentNode) throw new Error("Invoice document is not ready");

      if (!spec.fullyPaid) {
        await downloadVendorInvoicePdf(documentNode, filename);
        toast.success(`Invoice ${spec.invoiceNo} exported with its payment register`);
        return;
      }

      const blob = await vendorInvoicePdfBlob(documentNode);
      const file = new File([blob], filename, { type: "application/pdf" });
      let artifact: Awaited<ReturnType<typeof upload.mutateAsync>> | null = null;
      try {
        artifact = await upload.mutateAsync({
          file,
          projectId,
          input: {
            artifact_type: "invoice",
            source_system: "builtos",
            title: `Final paid invoice ${spec.invoiceNo}`,
            description: `Immutable processed-and-paid invoice for ${commitmentNo} with complete payment register.`,
            period_date: spec.periodEnd,
            reference_no: spec.invoiceNo,
            amount: spec.approvedAmount,
            tags: ["vendor-invoice", "processed", "paid", "final"],
          },
        });
        const { error } = await (supabase as any).rpc("finalize_paid_commitment_invoice_artifact", {
          p_invoice_id: invoiceId,
          p_artifact_id: artifact.id,
        });
        if (error) throw error;
      } catch (error) {
        if (artifact) await remove.mutateAsync(artifact).catch(() => undefined);
        throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      await queryClient.invalidateQueries({ queryKey: ["project-financials"] });
      downloadVendorInvoiceBlob(blob, filename);
      toast.success(`Finalized and archived paid invoice ${spec.invoiceNo}`);
    } catch (e: any) {
      toast.error(`PDF failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleExport} disabled={busy || !actionReady}>
        {(detail.data as any)?.finalized_artifact_id || spec?.fullyPaid
          ? <FileCheck2 className="h-4 w-4 mr-1" />
          : <Download className="h-4 w-4 mr-1" />}
        {busy
          ? ((detail.data as any)?.finalized_artifact_id ? "Downloading…" : spec?.fullyPaid ? "Finalizing…" : "Exporting…")
          : ((detail.data as any)?.finalized_artifact_id ? "Download finalized PDF" : spec?.fullyPaid ? "Finalize paid PDF" : "Export invoice PDF")}
      </Button>
      <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
        {spec && <VendorInvoiceDocument ref={docRef} spec={spec} />}
      </div>
    </>
  );
}
