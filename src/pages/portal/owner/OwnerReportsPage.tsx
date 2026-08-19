/**
 * Owner portal — branded financial reports. Serves the OWNER-SAFE subset of the
 * financial reports center (Project Financial Summary, Billing/Pay-App History,
 * Change Order Log) as branded, chart-rich views the client can export to PDF.
 * Deliberately excludes cash-flow and subcontractor reports (our costs/margins).
 */
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileBarChart, ReceiptText, FileDiff, Download, ArrowLeft, Loader2 } from "lucide-react";
import { useClientPortalContext, useOwnerPortalData } from "@/hooks/usePortals";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { OWNER_REPORTS, type ReportBrand } from "@/components/reports/financial/FinancialReportViews";
import { downloadReportPdf } from "@/lib/reports/reportPdf";
import { useClientPortalProject } from "@/components/portal/ClientPortalProjectContext";

const ICONS: Record<string, typeof FileBarChart> = {
  summary: FileBarChart, billing: ReceiptText, "change-orders": FileDiff,
};

export default function OwnerReportsPage() {
  const { isLoading: portalLoading } = useOwnerPortalData();
  const { selectedProjectId: projectId } = useClientPortalProject();

  const { contract, data, isLoading } = useFinancialReportData(projectId, { ownerSafe: true });
  const { data: portalContext } = useClientPortalContext();
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const brand: ReportBrand | null = contract
    ? {
        wordmark: portalContext?.client_name || portalContext?.portal_name || "APAS CONSULTING",
        projectName: contract.title,
        contractTitle: contract.title,
        contractNo: contract.contract_no,
        asOf: new Date().toISOString().slice(0, 10),
      }
    : null;

  const def = useMemo(() => OWNER_REPORTS.find((r) => r.key === selected) ?? null, [selected]);

  async function exportPdf() {
    if (!reportRef.current || !def) return;
    setExporting(true);
    const t = toast.loading("Building PDF…");
    try {
      await downloadReportPdf(reportRef.current, `${def.key}-${brand?.contractNo || "report"}.pdf`);
      toast.success(`${def.title} downloaded.`, { id: t });
    } catch (e: any) {
      toast.error(`PDF failed: ${e.message}`, { id: t });
    } finally { setExporting(false); }
  }

  const loading = portalLoading || isLoading;

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">← Portal overview</Link>
        <h1 className="text-3xl font-bold mt-2">Financial Reports</h1>
        <p className="text-muted-foreground">Branded reports on your contract, billings and change orders — view or download as PDF.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && !contract && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No contract financials are available yet.
        </CardContent></Card>
      )}

      {!loading && contract && !selected && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {OWNER_REPORTS.map((r) => {
            const Icon = ICONS[r.key] ?? FileBarChart;
            return (
              <Card key={r.key} className="cursor-pointer hover:border-[var(--apas-sapphire)] hover:shadow-md transition-all"
                onClick={() => setSelected(r.key)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-md bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)] flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{r.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{r.description}</CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && contract && data && brand && def && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> All reports
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" />{exporting ? "Exporting…" : "Download PDF"}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-muted/30 p-4">
            <div ref={reportRef} style={{ width: 780, background: "#fff", padding: 24, margin: "0 auto", borderRadius: 8 }}>
              <def.Component data={data} brand={brand} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
