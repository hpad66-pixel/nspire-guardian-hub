/**
 * D2 · InvoicePDFExport — commitment-side invoice PDF (vendor remittance style).
 * Reuses the Pay App PDF generator because the schema is isomorphic:
 * header + SOV lines with this-period + materials.
 */
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useCommitmentSov, useCommitmentTotals } from "@/hooks/useCommitments";
import { useInvoice } from "@/hooks/useInvoices";
import { downloadPayAppPdf } from "@/lib/pdf/payApp";
import { toast } from "sonner";

export function InvoicePDFExport({
  invoiceId, commitmentId, commitmentNo, commitmentTitle, tenantName,
}: {
  invoiceId: string;
  commitmentId: string;
  commitmentNo: string;
  commitmentTitle: string;
  tenantName?: string;
}) {
  const { data: sov = [] } = useCommitmentSov(commitmentId);
  const { data: totals } = useCommitmentTotals(commitmentId);
  const { detail, lines } = useInvoice(invoiceId);

  async function handleExport() {
    const inv = detail.data as any;
    if (!inv) { toast.error("Invoice not loaded"); return; }

    const linesByS = new Map((lines.data ?? []).map((l) => [l.sov_line_id, l]));
    const merged = sov.map((s: any) => {
      const l = linesByS.get(s.id);
      return {
        line_no: s.line_no,
        cost_code: "",
        description: s.description,
        scheduled_value: Number(s.scheduled_value ?? 0),
        work_this_period: Number(l?.work_this_period ?? 0),
        materials_stored: Number(l?.materials_stored ?? 0),
        pct_complete: l?.pct_complete ?? null,
      };
    });

    try {
      await downloadPayAppPdf({
        tenantName,
        contract: {
          contract_no: commitmentNo,
          title: commitmentTitle,
          original_value: Number((totals as any)?.original_value ?? 0),
          executed_co_value: Number((totals as any)?.executed_cco_value ?? 0),
          revised_contract_value: Number((totals as any)?.revised_commitment_value ?? 0),
          retainage_pct: 10,
        },
        payApp: {
          pay_app_no: 0,
          period_end: inv.period_end,
          status: inv.status,
          submitted_amount: inv.submitted_amount,
          approved_amount: inv.approved_amount,
          retainage_held: inv.retainage_held,
        },
        lines: merged,
      }, `Invoice-${inv.invoice_no}.pdf`);
      toast.success(`Invoice ${inv.invoice_no} exported`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1" /> Export invoice PDF
    </Button>
  );
}
