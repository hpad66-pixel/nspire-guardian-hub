/**
 * FinancialReportsPage — the Financial Reports center. A grid of canned report
 * cards; pick one to render a branded, chart-rich report you can export to a
 * branded PDF. Read-only; all data comes from useFinancialReportData.
 */
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileBarChart, ReceiptText, FileDiff, TrendingUp, Users, ShieldCheck,
  Download, ArrowLeft, Loader2,
} from "lucide-react";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { useCoSettings } from "@/hooks/useCoSettings";
import { FINANCIAL_REPORTS, type ReportBrand } from "@/components/reports/financial/FinancialReportViews";
import { downloadReportPdf } from "@/lib/reports/reportPdf";

const ICONS: Record<string, typeof FileBarChart> = {
  summary: FileBarChart, billing: ReceiptText, "change-orders": FileDiff,
  "cash-flow": TrendingUp, commitments: Users, liens: ShieldCheck,
};

export default function FinancialReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { contract, data, isLoading } = useFinancialReportData(projectId ?? null);
  const { data: coSettings } = useCoSettings();
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const s: any = coSettings ?? {};
  const brand: ReportBrand | null = contract
    ? {
        wordmark: s.wordmark || s.company_name || "APAS CONSULTING",
        projectName: contract.title,
        contractTitle: contract.title,
        contractNo: contract.contract_no,
        asOf: new Date().toISOString().slice(0, 10),
      }
    : null;

  const def = useMemo(() => FINANCIAL_REPORTS.find((r) => r.key === selected) ?? null, [selected]);

  async function exportPdf() {
    if (!reportRef.current || !def) return;
    setExporting(true);
    const t = toast.loading("Building branded PDF…");
    try {
      await downloadReportPdf(reportRef.current, `${def.key}-report-${brand?.contractNo || "financial"}.pdf`);
      toast.success(`${def.title} exported.`, { id: t });
    } catch (e: any) {
      toast.error(`PDF failed: ${e.message}`, { id: t });
    } finally { setExporting(false); }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">Financial Reports</h1>
            <p className="text-muted-foreground">
              Branded, on-demand reports across contract, billings, change orders, cash flow and subcontractors.
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading financial data…
        </div>
      )}

      {!isLoading && !contract && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No prime contract found for this project — reports need a contract to summarize.
        </CardContent></Card>
      )}

      {/* Report picker grid */}
      {!isLoading && contract && !selected && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FINANCIAL_REPORTS.map((r) => {
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

      {/* Selected report */}
      {!isLoading && contract && data && brand && def && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> All reports
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" />{exporting ? "Exporting…" : "Export branded PDF"}
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
