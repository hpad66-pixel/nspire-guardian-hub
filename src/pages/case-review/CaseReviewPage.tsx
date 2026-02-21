import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, Upload, X, AlertCircle, CheckCircle2, Loader2,
  Download, RefreshCw, Gavel, Sparkles, Info, FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

// ─── Types ───
type FileStatus = "pending" | "reading" | "ready" | "error";
type ReportStyle = "aurum" | "whitepaper";
type AnalysisStage = "idle" | "preparing" | "analyzing" | "formatting" | "complete" | "error";

interface PreparedFile {
  id: string;
  file: File;
  name: string;
  mimeType: string;
  size: number;
  sizeMB: number;
  status: FileStatus;
  content?: string;
  isBase64?: boolean;
  error?: string;
}

// ─── Constants ───
const MAX_FILES = 40;
const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_MB = 80;

const BINARY_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp",
]);
const TEXT_TYPES = new Set(["text/plain", "text/csv"]);

const ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/octet-stream": [".msg", ".eml"],
};

// ─── Helpers ───
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsText(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      resolve(result.split(",")[1]);
    };
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function getMimeType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "msg" || ext === "eml") return "application/vnd.ms-outlook";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return file.type || "application/octet-stream";
}

function getMimeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "text/plain") return "Text";
  if (mime === "text/csv") return "CSV";
  if (mime.startsWith("image/")) return "Image";
  if (mime.includes("msword") || mime.includes("wordprocessing")) return "Word";
  if (mime.includes("outlook") || mime === "application/octet-stream") return "Email";
  return "File";
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const STAGE_CONFIG: Record<AnalysisStage, { icon: React.ReactNode; label: string; description: string; color: string }> = {
  idle: { icon: null, label: "", description: "", color: "" },
  preparing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: "Reading files...",
    description: "Extracting content from uploaded documents",
    color: "bg-primary/5 border-primary/20",
  },
  analyzing: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: "Analyzing case...",
    description: "AI is reading every document and building the regulatory analysis",
    color: "bg-primary/5 border-primary/20",
  },
  formatting: {
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    label: "Formatting report...",
    description: "Converting analysis into your selected report format",
    color: "bg-primary/5 border-primary/20",
  },
  complete: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    label: "Analysis complete",
    description: "Your regulatory case review is ready",
    color: "bg-green-500/5 border-green-500/20",
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-destructive" />,
    label: "Analysis failed",
    description: "",
    color: "bg-destructive/5 border-destructive/20",
  },
};

// ─── Component ───
export default function CaseReviewPage() {
  const [preparedFiles, setPreparedFiles] = useState<PreparedFile[]>([]);
  const [caseName, setCaseName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [reportStyle, setReportStyle] = useState<ReportStyle>("aurum");
  const [stage, setStage] = useState<AnalysisStage>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [reportHtml, setReportHtml] = useState("");
  const [reportMeta, setReportMeta] = useState<{
    caseName: string; filesAnalyzed: number; analysisDate: string; regulatoryDomain: string;
  } | null>(null);
  const reportRef = useRef<HTMLIFrameElement>(null);

  const isRunning = stage === "preparing" || stage === "analyzing" || stage === "formatting";
  const totalMB = preparedFiles.reduce((s, f) => s + f.sizeMB, 0);

  // ─── Dropzone ───
  const onDrop = useCallback((accepted: File[]) => {
    const remaining = MAX_FILES - preparedFiles.length;
    const toAdd = accepted.slice(0, remaining);
    if (accepted.length > remaining) {
      toast.warning(`Only ${remaining} more file(s) allowed (max ${MAX_FILES})`);
    }

    const newFiles: PreparedFile[] = toAdd
      .filter((f) => {
        const mb = f.size / (1024 * 1024);
        if (mb > MAX_FILE_SIZE_MB) {
          toast.error(`${f.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`);
          return false;
        }
        return true;
      })
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        mimeType: getMimeType(f),
        size: f.size,
        sizeMB: f.size / (1024 * 1024),
        status: "pending" as FileStatus,
      }));

    setPreparedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      const totalMB = combined.reduce((s, f) => s + f.sizeMB, 0);
      if (totalMB > MAX_TOTAL_MB) {
        toast.error(`Total size exceeds ${MAX_TOTAL_MB}MB`);
        return prev;
      }
      return combined;
    });
  }, [preparedFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    disabled: isRunning,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setPreparedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ─── Run Analysis ───
  const runAnalysis = async () => {
    if (preparedFiles.length === 0) return;

    setStage("preparing");
    setErrorMessage("");
    setReportHtml("");
    setReportMeta(null);

    try {
      // Read all files
      const readFiles = await Promise.all(
        preparedFiles.map(async (pf) => {
          try {
            const isBinary = BINARY_TYPES.has(pf.mimeType);
            const content = isBinary
              ? await readFileAsBase64(pf.file)
              : await readFileAsText(pf.file);
            return { ...pf, content, isBase64: isBinary, status: "ready" as FileStatus };
          } catch {
            return { ...pf, status: "error" as FileStatus, error: "Failed to read" };
          }
        })
      );

      setPreparedFiles(readFiles);
      const validFiles = readFiles.filter((f) => f.status === "ready" && f.content);

      if (validFiles.length === 0) {
        throw new Error("No files could be read");
      }

      setStage("analyzing");

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regulatory-case-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            files: validFiles.map((f) => ({
              name: f.name,
              mimeType: f.mimeType,
              content: f.content,
              isBase64: f.isBase64,
              sizeMB: f.sizeMB,
            })),
            caseName: caseName || undefined,
            additionalContext: additionalContext || undefined,
            reportStyle,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
        throw new Error(errData.error || "Analysis failed");
      }

      setStage("formatting");
      const result = await response.json();

      if (!result.success) throw new Error(result.error || "Analysis failed");

      setReportHtml(result.report);
      setReportMeta({
        caseName: result.caseName,
        filesAnalyzed: result.filesAnalyzed,
        analysisDate: result.analysisDate,
        regulatoryDomain: result.regulatoryDomain,
      });
      setStage("complete");
      toast.success("Regulatory case review complete");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setErrorMessage(msg);
      setStage("error");
      toast.error(msg);
    }
  };

  const resetAll = () => {
    setPreparedFiles([]);
    setCaseName("");
    setAdditionalContext("");
    setStage("idle");
    setErrorMessage("");
    setReportHtml("");
    setReportMeta(null);
  };

  const downloadReport = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CaseIQ-${reportMeta?.caseName?.replace(/\s+/g, "-") || "Report"}-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stageConf = STAGE_CONFIG[stage];

  // ─── Render ───
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Gavel className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">CaseIQ</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Sparkles className="h-3 w-3" /> AI-Powered
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload any regulatory case file — receive a professional compliance white paper in minutes
          </p>
        </div>
        {stage === "complete" && (
          <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> New Review
          </Button>
        )}
      </div>

      {/* How It Works Accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="how" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" /> How CaseIQ works
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <Upload className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-semibold text-sm text-foreground">Upload Files</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Any regulatory domain: environmental, building, fire, OSHA, HUD, FDA, stormwater, health inspections, zoning. Drop up to 40 files.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <FileSearch className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-semibold text-sm text-foreground">AI Reads Everything</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  The AI detects the regulatory domain automatically, reads every document, builds the full chronology, and identifies every open compliance item.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <Download className="h-5 w-5 text-primary mb-2" />
                <h4 className="font-semibold text-sm text-foreground">Choose Your Format</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  AURUM Dark for executive presentations. White Paper for regulatory submissions, PE filing, attorney use. Both are self-contained, downloadable HTML.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Upload Section */}
      {stage !== "complete" && (
        <div className="space-y-5">
          {/* Row 1: Name + Context */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="caseName">Case / Facility Name</Label>
              <Input
                id="caseName"
                value={caseName}
                onChange={(e) => setCaseName(e.target.value)}
                placeholder="e.g., Larkin Hospital, 1475 W 49th St, Hialeah"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="context">Additional Context (optional)</Label>
              <Input
                id="context"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g., Focus on NFAC closure path, deadline is March 2026"
                disabled={isRunning}
              />
            </div>
          </div>

          {/* Row 2: Report Style */}
          <div className="space-y-1.5">
            <Label>Report Format</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => !isRunning && setReportStyle("aurum")}
                disabled={isRunning}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                  reportStyle === "aurum"
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#0D0D1A] text-[#C8962E] font-bold text-sm">
                  Au
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">AURUM Dark</p>
                  <p className="text-xs text-muted-foreground">Executive & client presentation</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => !isRunning && setReportStyle("whitepaper")}
                disabled={isRunning}
                className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                  reportStyle === "whitepaper"
                    ? "ring-2 ring-primary border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border bg-white text-[#1E3A5F] font-bold text-sm">
                  WP
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">White Paper</p>
                  <p className="text-xs text-muted-foreground">Regulatory submission & PE filing</p>
                </div>
              </button>
            </div>
          </div>

          {/* Row 3: Dropzone */}
          <div
            {...getRootProps()}
            className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40"
            } ${isRunning ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Drop files here..." : "Drag & drop regulatory files, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Images, Text, Word, Email — up to {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each
            </p>
          </div>

          {/* Row 4: File List */}
          {preparedFiles.length > 0 && (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium text-foreground">
                  {preparedFiles.length} file{preparedFiles.length > 1 ? "s" : ""} selected
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalMB.toFixed(1)} MB / {MAX_TOTAL_MB} MB
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {preparedFiles.map((pf) => (
                  <div key={pf.id} className="flex items-center gap-3 px-4 py-2">
                    {pf.status === "error" ? (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : pf.status === "ready" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : pf.status === "reading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate text-sm text-foreground">{pf.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {getMimeLabel(pf.mimeType)}
                    </Badge>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {formatFileSize(pf.size)}
                    </span>
                    <button
                      onClick={() => removeFile(pf.id)}
                      disabled={isRunning}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 5: Stage Status */}
          {stage !== "idle" && (
            <div className={`flex items-center gap-3 rounded-lg border p-4 ${stageConf.color}`}>
              {stageConf.icon}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{stageConf.label}</p>
                <p className="text-xs text-muted-foreground">
                  {stage === "error" ? errorMessage : stageConf.description}
                </p>
              </div>
              {isRunning && (
                <div className="flex gap-1">
                  {["preparing", "analyzing", "formatting"].map((s) => (
                    <div
                      key={s}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        s === stage
                          ? "bg-primary animate-pulse"
                          : ["preparing", "analyzing", "formatting"].indexOf(s) <
                            ["preparing", "analyzing", "formatting"].indexOf(stage)
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Row 6: Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={runAnalysis}
              disabled={preparedFiles.length === 0 || isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {stage === "preparing"
                ? "Reading files..."
                : stage === "analyzing"
                ? "Analyzing case..."
                : stage === "formatting"
                ? "Formatting report..."
                : "Run Regulatory Analysis"}
            </Button>
            {preparedFiles.length > 0 && !isRunning && (
              <Button variant="outline" onClick={resetAll}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Report View */}
      {stage === "complete" && reportHtml && (
        <div className="space-y-4">
          {/* Report Meta Bar */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">{reportMeta?.caseName}</p>
              <p className="text-xs text-muted-foreground">
                {reportMeta?.regulatoryDomain} · {reportMeta?.filesAnalyzed} files analyzed ·{" "}
                {reportMeta?.analysisDate
                  ? new Date(reportMeta.analysisDate).toLocaleDateString()
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadReport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(reportHtml);
                    w.document.close();
                  }
                }}
                className="gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> Open in Tab
              </Button>
            </div>
          </div>

          {/* Report iframe */}
          <div className="rounded-lg border overflow-hidden" style={{ height: "80vh" }}>
            <iframe
              ref={reportRef}
              srcDoc={reportHtml}
              title="CaseIQ Report"
              className="h-full w-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
