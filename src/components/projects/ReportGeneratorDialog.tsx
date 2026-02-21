import { useState, useRef, useCallback } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";
import {
  useProgressReports,
  useGenerateProgressReport,
  useSaveProgressReport,
  useDeleteProgressReport,
  type ProgressReport,
} from "@/hooks/useProgressReports";
import { useSendEmail } from "@/hooks/useSendEmail";
import { generatePDF } from "@/lib/generatePDF";
import { SendExternalEmailDialog } from "./SendExternalEmailDialog";
import {
  FileText,
  BarChart3,
  DollarSign,
  Calendar,
  Loader2,
  Sparkles,
  Download,
  Mail,
  Printer,
  CheckCircle,
  Pencil,
  Eye,
  Trash2,
  Clock,
  FileDown,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
// docx is loaded dynamically when needed to keep the initial bundle small
type DocxModule = typeof import("docx");
let _docx: DocxModule | null = null;
async function getDocx(): Promise<DocxModule> {
  if (!_docx) _docx = await import("docx");
  return _docx;
}


// ── Types ─────────────────────────────────────────────────────────────────────
type ReportType = "weekly" | "monthly_invoice";
type Step = "configure" | "generating" | "review" | "history";

interface ReportConfig {
  reportType: ReportType;
  periodStart: string;
  periodEnd: string;
  userNotes: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function buildBrandedHtml(
  content: string,
  config: ReportConfig,
  projectName: string,
  branding: { company_name?: string; logo_url?: string | null; address_line1?: string | null; phone?: string | null; email?: string | null; website?: string | null; footer_text?: string | null } | null,
  preparedBy: string
): string {
  const company = branding?.company_name || "APAS Consulting";
  const primaryColor = "#1e3a5f";
  const accentColor = "#2563eb";

  return `
<div id="report-branded-output" style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 900px; margin: 0 auto; background: #fff; color: #1a1a1a;">
  <!-- Header / Letterhead -->
  <div style="background: linear-gradient(135deg, ${primaryColor} 0%, #2d5a9e 100%); padding: 40px 48px 32px; color: #fff;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
      <div>
        ${branding?.logo_url ? `<img src="${branding.logo_url}" alt="${company} logo" style="height: 60px; margin-bottom: 12px; display: block;" />` : ""}
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #fff;">${company}</h1>
        ${branding?.address_line1 ? `<p style="margin: 4px 0 0; font-size: 12px; opacity: 0.8;">${branding.address_line1}</p>` : ""}
        <div style="margin-top: 4px; font-size: 12px; opacity: 0.8;">
          ${branding?.phone ? `📞 ${branding.phone}` : ""}
          ${branding?.phone && branding?.email ? " &nbsp;|&nbsp; " : ""}
          ${branding?.email ? `✉ ${branding.email}` : ""}
          ${branding?.website ? ` &nbsp;|&nbsp; 🌐 ${branding.website}` : ""}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 12px 20px; display: inline-block;">
          <p style="margin: 0; font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Report Type</p>
          <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700;">
            ${config.reportType === "weekly" ? "Weekly Progress Summary" : "Monthly Invoice Report"}
          </p>
        </div>
      </div>
    </div>

    <!-- Report meta strip -->
    <div style="background: rgba(255,255,255,0.12); border-radius: 8px; padding: 16px 24px; display: flex; gap: 32px; flex-wrap: wrap;">
      <div>
        <p style="margin: 0; font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Project</p>
        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${projectName}</p>
      </div>
      <div>
        <p style="margin: 0; font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Reporting Period</p>
        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">
          ${format(new Date(config.periodStart), "MMM d, yyyy")} — ${format(new Date(config.periodEnd), "MMM d, yyyy")}
        </p>
      </div>
      <div>
        <p style="margin: 0; font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Date Prepared</p>
        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${format(new Date(), "MMMM d, yyyy")}</p>
      </div>
      <div>
        <p style="margin: 0; font-size: 10px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Prepared By</p>
        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 600;">${preparedBy}</p>
      </div>
    </div>
  </div>

  <!-- Divider line -->
  <div style="height: 4px; background: linear-gradient(90deg, ${accentColor}, #60a5fa, transparent);"></div>

  <!-- Content area -->
  <div style="padding: 40px 48px; line-height: 1.7;">
    <style>
      #report-branded-output h2 { color: ${primaryColor}; font-size: 20px; font-weight: 700; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
      #report-branded-output h3 { color: #1e3a5f; font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
      #report-branded-output h4 { color: #374151; font-size: 14px; font-weight: 600; margin: 16px 0 6px; }
      #report-branded-output p { margin: 0 0 12px; }
      #report-branded-output ul, #report-branded-output ol { margin: 8px 0 16px; padding-left: 24px; }
      #report-branded-output li { margin-bottom: 6px; }
      #report-branded-output table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
      #report-branded-output th { background: ${primaryColor}; color: #fff; padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      #report-branded-output td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
      #report-branded-output tr:nth-child(even) td { background: #f8fafc; }
      #report-branded-output strong { color: ${primaryColor}; }
    </style>
    ${content}
  </div>

  <!-- Footer -->
  <div style="background: #f1f5f9; padding: 24px 48px; border-top: 1px solid #e2e8f0; margin-top: 40px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 12px; color: #64748b;">
        <strong style="color: ${primaryColor};">${company}</strong>
        ${branding?.footer_text ? ` — ${branding.footer_text}` : " — Professional Project Management Services"}
      </div>
      <div style="font-size: 11px; color: #94a3b8;">
        Confidential &bull; Generated ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}
      </div>
    </div>
  </div>
</div>`;
}

// ── Word export helper ────────────────────────────────────────────────────────
async function exportToWord(content: string, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await getDocx();
  const lines = stripHtml(content).split("\n").filter(Boolean);

  const children = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return new Paragraph({});

    const isH2 = /^#+/.test(trimmed) || trimmed.endsWith(":");
    return new Paragraph({
      heading: isH2 ? HeadingLevel.HEADING_2 : undefined,
      children: [new TextRun({ text: trimmed.replace(/^#+\s*/, ""), size: isH2 ? 28 : 22 })],
      spacing: { after: 200 },
    });
  });

  const doc = new Document({
    sections: [{ children }],
    creator: "APAS Consulting",
    title,
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Dialog ───────────────────────────────────────────────────────────────
interface ReportGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

export function ReportGeneratorDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ReportGeneratorDialogProps) {
  const [step, setStep] = useState<Step>("configure");
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");

  const [config, setConfig] = useState<ReportConfig>({
    reportType: "weekly",
    periodStart: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    periodEnd: format(new Date(), "yyyy-MM-dd"),
    userNotes: "",
  });

  const [generatedHtml, setGeneratedHtml] = useState("");
  const [streamedHtml, setStreamedHtml] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedHtml, setEditedHtml] = useState("");
  const [savedReportId, setSavedReportId] = useState<string | undefined>();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [externalEmailOpen, setExternalEmailOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isWordExporting, setIsWordExporting] = useState(false);

  const { data: branding } = useCompanyBranding();
  const { data: savedReports } = useProgressReports(projectId);
  const { generate, isGenerating } = useGenerateProgressReport();
  const saveReport = useSaveProgressReport();
  const deleteReport = useDeleteProgressReport();
  const sendEmail = useSendEmail();

  const brandedHtmlRef = useRef<HTMLDivElement>(null);

  const reportTitle = `${config.reportType === "weekly" ? "Weekly Progress Summary" : "Monthly Invoice Report"} — ${projectName} — ${format(new Date(config.periodStart), "MMM d")} to ${format(new Date(config.periodEnd), "MMM d, yyyy")}`;

  const currentHtml = editMode ? editedHtml : generatedHtml;
  const brandedFull = buildBrandedHtml(currentHtml, config, projectName, branding || null, branding?.company_name || "APAS Consulting");

  // ── Apply date presets ─────────────────────────────────────────────────────
  const applyPreset = (preset: "week" | "month" | "prev_month") => {
    if (preset === "week") {
      setConfig((c) => ({
        ...c,
        periodStart: format(subDays(new Date(), 7), "yyyy-MM-dd"),
        periodEnd: format(new Date(), "yyyy-MM-dd"),
      }));
    } else if (preset === "month") {
      setConfig((c) => ({
        ...c,
        periodStart: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        periodEnd: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      }));
    } else {
      const prev = subMonths(new Date(), 1);
      setConfig((c) => ({
        ...c,
        periodStart: format(startOfMonth(prev), "yyyy-MM-dd"),
        periodEnd: format(endOfMonth(prev), "yyyy-MM-dd"),
      }));
    }
  };

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setStreamedHtml("");
    setGeneratedHtml("");
    setSavedReportId(undefined);
    setStep("generating");

    let accumulated = "";
    try {
      await generate(
        {
          projectId,
          reportType: config.reportType,
          periodStart: config.periodStart,
          periodEnd: config.periodEnd,
          userNotes: config.userNotes,
        },
        (chunk) => {
          accumulated += chunk;
          setStreamedHtml(accumulated);
        },
        () => {
          setGeneratedHtml(accumulated);
          setEditedHtml(accumulated);
          setStep("review");
          setEditMode(false);
        }
      );
    } catch {
      setStep("configure");
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (status: "draft" | "finalized") => {
    setIsSaving(true);
    try {
      const result = await saveReport.mutateAsync({
        id: savedReportId,
        project_id: projectId,
        report_type: config.reportType,
        report_period_start: config.periodStart,
        report_period_end: config.periodEnd,
        title: reportTitle,
        content_html: currentHtml,
        status,
      });
      setSavedReportId(result.id);
    } finally {
      setIsSaving(false);
    }
  };

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handlePdfExport = async () => {
    setIsPdfExporting(true);
    try {
      await generatePDF({
        filename: `${reportTitle}.pdf`,
        elementId: "report-branded-output",
        scale: 2,
        margin: 10,
      });
    } catch {
      toast.error("PDF export failed. Try the print option instead.");
    } finally {
      setIsPdfExporting(false);
    }
  };

  // ── Word export ────────────────────────────────────────────────────────────
  const handleWordExport = async () => {
    setIsWordExporting(true);
    try {
      await exportToWord(currentHtml, reportTitle);
    } finally {
      setIsWordExporting(false);
    }
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${reportTitle}</title>
      <style>body{margin:0;padding:0;} @media print{@page{margin:0.5in;}}</style>
    </head><body>${brandedFull}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  };

  // ── Email ──────────────────────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!emailTo.trim()) { toast.error("Please enter a recipient email address"); return; }
    await sendEmail.mutateAsync({
      recipients: emailTo.split(",").map((e) => e.trim()).filter(Boolean),
      subject: reportTitle,
      bodyHtml: brandedFull,
    });
    setEmailDialogOpen(false);
    setEmailTo("");
  };

  // ── Load saved report ──────────────────────────────────────────────────────
  const loadSavedReport = (report: ProgressReport) => {
    setConfig({
      reportType: report.report_type,
      periodStart: report.report_period_start,
      periodEnd: report.report_period_end,
      userNotes: "",
    });
    setGeneratedHtml(report.content_html || "");
    setEditedHtml(report.content_html || "");
    setSavedReportId(report.id);
    setEditMode(false);
    setStep("review");
    setActiveTab("generate");
  };

  const handleReset = () => {
    setStep("configure");
    setGeneratedHtml("");
    setStreamedHtml("");
    setSavedReportId(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 gap-0">
        {/* ── Dialog Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg">Progress Report Generator</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI-powered branded reports for <strong>{projectName}</strong>
                </p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="generate" className="text-xs px-3">Generate New</TabsTrigger>
                <TabsTrigger value="history" className="text-xs px-3 gap-1.5">
                  History
                  {savedReports && savedReports.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">{savedReports.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* ── Main body ── */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "history" ? (
            <HistoryTab
              reports={savedReports || []}
              onLoad={loadSavedReport}
              onDelete={(id) => deleteReport.mutate({ id, projectId })}
            />
          ) : (
            <>
              {/* ── Step: Configure ── */}
              {step === "configure" && (
                <ConfigureStep
                  config={config}
                  onChange={(c) => setConfig(c)}
                  onPreset={applyPreset}
                  onGenerate={handleGenerate}
                />
              )}

              {/* ── Step: Generating ── */}
              {step === "generating" && (
                <GeneratingStep streamedHtml={streamedHtml} />
              )}

              {/* ── Step: Review ── */}
              {step === "review" && (
                <>
                  <ReviewStep
                    config={config}
                    projectName={projectName}
                    branding={branding || null}
                    currentHtml={currentHtml}
                    brandedFull={brandedFull}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onEditedHtmlChange={setEditedHtml}
                    isSaving={isSaving}
                    isPdfExporting={isPdfExporting}
                    isWordExporting={isWordExporting}
                    isSendingEmail={sendEmail.isPending}
                    emailDialogOpen={emailDialogOpen}
                    setEmailDialogOpen={setEmailDialogOpen}
                    emailTo={emailTo}
                    setEmailTo={setEmailTo}
                    onSaveDraft={() => handleSave("draft")}
                    onFinalize={() => handleSave("finalized")}
                    onPdfExport={handlePdfExport}
                    onWordExport={handleWordExport}
                    onPrint={handlePrint}
                    onSendEmail={handleSendEmail}
                    onReset={handleReset}
                    savedReportId={savedReportId}
                    onEmailExternally={() => setExternalEmailOpen(true)}
                  />
                  <SendExternalEmailDialog
                    open={externalEmailOpen}
                    onOpenChange={setExternalEmailOpen}
                    documentType="progress_report"
                    documentTitle={reportTitle}
                    documentId={savedReportId || "unsaved"}
                    projectName={projectName}
                    contentHtml={brandedFull}
                  />
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Configure Step ────────────────────────────────────────────────────────────
function ConfigureStep({
  config,
  onChange,
  onPreset,
  onGenerate,
}: {
  config: ReportConfig;
  onChange: (c: ReportConfig) => void;
  onPreset: (p: "week" | "month" | "prev_month") => void;
  onGenerate: () => void;
}) {
  const set = (patch: Partial<ReportConfig>) => onChange({ ...config, ...patch });

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Report Type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Report Type</Label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  type: "weekly" as const,
                  icon: BarChart3,
                  label: "Weekly Progress Summary",
                  desc: "Accountability report for internal teams & stakeholders covering the past 7 days.",
                },
                {
                  type: "monthly_invoice" as const,
                  icon: DollarSign,
                  label: "Monthly Invoice Report",
                  desc: "Professional billing backup document with earned value analysis for client invoicing.",
                },
              ] as const
            ).map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => set({ reportType: type })}
                className={cn(
                  "text-left rounded-xl border-2 p-4 transition-all duration-200 space-y-2",
                  config.reportType === type
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                )}
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
                  config.reportType === type ? "bg-primary/10" : "bg-muted"
                )}>
                  <Icon className={cn("h-5 w-5", config.reportType === type ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
                {config.reportType === type && (
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <CheckCircle className="h-3.5 w-3.5" /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Date Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Reporting Period</Label>
            <div className="flex gap-1.5">
              {(
                [
                  { label: "Last 7 days", preset: "week" as const },
                  { label: "This month", preset: "month" as const },
                  { label: "Prev month", preset: "prev_month" as const },
                ] as const
              ).map(({ label, preset }) => (
                <button
                  key={preset}
                  onClick={() => onPreset(preset)}
                  className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={config.periodStart}
                onChange={(e) => set({ periodStart: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={config.periodEnd}
                onChange={(e) => set({ periodEnd: e.target.value })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* User notes */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Additional Context (Optional)</Label>
          <p className="text-xs text-muted-foreground">
            Tell the AI what to emphasize — e.g. "focus on roof delays", "we invoiced $X last month"
          </p>
          <Textarea
            placeholder="E.g. Highlight the roofing milestone delay and emphasize the approved change order for waterproofing..."
            value={config.userNotes}
            onChange={(e) => set({ userNotes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Generate button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={onGenerate}
          disabled={!config.periodStart || !config.periodEnd}
        >
          <Sparkles className="h-4 w-4" />
          Generate {config.reportType === "weekly" ? "Weekly Summary" : "Invoice Report"} with AI
        </Button>

        <p className="text-xs text-muted-foreground text-center pb-4">
          The AI will aggregate all project activity data and generate a professionally formatted, branded report.
        </p>
      </div>
    </ScrollArea>
  );
}

// ── Generating Step ───────────────────────────────────────────────────────────
function GeneratingStep({ streamedHtml }: { streamedHtml: string }) {
  return (
    <div className="h-full flex flex-col">
      {/* Status bar */}
      <div className="shrink-0 px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div>
            <p className="text-sm font-medium">AI is writing your report…</p>
            <p className="text-xs text-muted-foreground">Analyzing all project data and generating a professional document</p>
          </div>
        </div>
      </div>

      {/* Live stream preview */}
      <ScrollArea className="flex-1 p-6">
        {streamedHtml ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: streamedHtml }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Gathering project data…</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Review Step ───────────────────────────────────────────────────────────────
function ReviewStep({
  config, projectName, branding, currentHtml, brandedFull, editMode, setEditMode,
  onEditedHtmlChange, isSaving, isPdfExporting, isWordExporting, isSendingEmail,
  emailDialogOpen, setEmailDialogOpen, emailTo, setEmailTo, onSaveDraft, onFinalize,
  onPdfExport, onWordExport, onPrint, onSendEmail, onReset, savedReportId, onEmailExternally,
}: {
  config: ReportConfig; projectName: string; branding: any; currentHtml: string;
  brandedFull: string; editMode: boolean; setEditMode: (v: boolean) => void;
  onEditedHtmlChange: (html: string) => void; isSaving: boolean; isPdfExporting: boolean;
  isWordExporting: boolean; isSendingEmail: boolean; emailDialogOpen: boolean;
  setEmailDialogOpen: (v: boolean) => void; emailTo: string; setEmailTo: (v: string) => void;
  onSaveDraft: () => void; onFinalize: () => void; onPdfExport: () => void;
  onWordExport: () => void; onPrint: () => void; onSendEmail: () => void;
  onReset: () => void; savedReportId?: string; onEmailExternally: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-3 border-b bg-muted/20 flex items-center gap-2 flex-wrap">
        {/* Left: nav + edit toggle */}
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> New Report
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant={editMode ? "secondary" : "outline"}
          size="sm"
          onClick={() => setEditMode(!editMode)}
          className="gap-1.5 h-8 text-xs"
        >
          {editMode ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editMode ? "Preview" : "Edit"}
        </Button>

        <div className="flex-1" />

        {/* Right: actions */}
        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isSaving} className="gap-1.5 h-8 text-xs">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
          Save Draft
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5 h-8 text-xs">
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={onWordExport} disabled={isWordExporting} className="gap-1.5 h-8 text-xs">
          {isWordExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Word
        </Button>
        <Button variant="outline" size="sm" onClick={onPdfExport} disabled={isPdfExporting} className="gap-1.5 h-8 text-xs">
          {isPdfExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onEmailExternally} className="gap-1.5 h-8 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Email Externally
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="gap-1.5 h-8 text-xs">
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
        <Button size="sm" onClick={onFinalize} disabled={isSaving} className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90">
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Finalize
        </Button>
      </div>

      {/* Email dialog */}
      {emailDialogOpen && (
        <div className="shrink-0 px-4 py-3 border-b bg-accent/5 flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="recipient@example.com, another@example.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            className="h-8 text-sm flex-1"
          />
          <Button size="sm" onClick={onSendEmail} disabled={isSendingEmail} className="h-8 text-xs gap-1.5 shrink-0">
            {isSendingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Send
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEmailDialogOpen(false)} className="h-8 text-xs text-muted-foreground">
            Cancel
          </Button>
        </div>
      )}

      {/* Content: edit or preview */}
      <div className="flex-1 overflow-hidden">
        {editMode ? (
          <ScrollArea className="h-full">
            <div className="p-4">
              <RichTextEditor
                content={currentHtml}
                onChange={onEditedHtmlChange}
                placeholder="Edit your report content here..."
                className="min-h-[500px]"
              />
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6">
              {/* The branded output — this is the element we render to PDF */}
              <div
                dangerouslySetInnerHTML={{ __html: brandedFull }}
                className="shadow-sm rounded-xl overflow-hidden border"
              />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Status bar */}
      {savedReportId && (
        <div className="shrink-0 px-4 py-2 border-t bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="h-3.5 w-3.5 text-success" />
          Report saved to history — you can re-download or re-email it anytime.
        </div>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({
  reports,
  onLoad,
  onDelete,
}: {
  reports: ProgressReport[];
  onLoad: (r: ProgressReport) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "weekly" | "monthly_invoice">("all");

  const filtered = reports.filter((r) => filter === "all" || r.report_type === filter);

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="shrink-0 px-4 py-3 border-b flex items-center gap-2">
        {(["all", "weekly", "monthly_invoice"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All Reports" : f === "weekly" ? "Weekly" : "Monthly Invoice"}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} reports</span>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="text-sm">No saved reports yet. Generate your first report!</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((report) => (
              <div key={report.id} className="px-4 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  report.report_type === "weekly" ? "bg-primary/10" : "bg-accent/10"
                )}>
                  {report.report_type === "weekly" ? (
                    <BarChart3 className="h-4 w-4 text-primary" />
                  ) : (
                    <DollarSign className="h-4 w-4 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug line-clamp-2">{report.title}</p>
                    <Badge
                      variant={report.status === "finalized" ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(report.report_period_start), "MMM d")} — {format(new Date(report.report_period_end), "MMM d, yyyy")}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => onLoad(report)} className="h-8 text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(report.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
