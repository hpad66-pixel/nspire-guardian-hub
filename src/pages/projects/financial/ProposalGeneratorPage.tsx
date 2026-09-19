import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import { useClient } from "@/hooks/useClients";
import { useCoSettings } from "@/hooks/useCoSettings";
import { useFinancialProposals, type FinancialProposal, type FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { useProjectDirectory, type DirectoryEntry } from "@/hooks/useProjectDirectory";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { FinancialProposalDocument } from "@/components/financial/FinancialProposalDocument";
import { AttachmentField } from "@/components/common/AttachmentField";
import { fileToBackgroundDoc } from "@/lib/ai/backgroundDoc";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { ChevronRight, FileText, LayoutDashboard, Loader2, Paperclip, Plus, Sparkles, Trash2, UploadCloud, Wand2, X } from "lucide-react";

interface DraftLine {
  category: FinancialProposalLine["category"];
  description: string;
  lead_type: FinancialProposalLine["lead_type"];
  lead_directory_entry_id: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  markup_pct: number;
}

interface GeneratorDraft {
  title: string;
  overview: string;
  scope_bullets: string[];
  deliverables: string[];
  terms: string;
  overhead_pct: number;
  profit_pct: number;
  valid_until: string;
  lines: DraftLine[];
}

const EMPTY: GeneratorDraft = {
  title: "",
  overview: "",
  scope_bullets: [],
  deliverables: [],
  terms: "Net 30. All work per applicable codes and standards.",
  overhead_pct: 10,
  profit_pct: 5,
  valid_until: "",
  lines: [],
};

const toLines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);
const fromLines = (values: string[] | undefined) => (values ?? []).join("\n");
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const directoryLabel = (entry: DirectoryEntry) =>
  entry.external_display_name || entry.external_company_name || entry.role_label || "Project directory entry";

export default function ProposalGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(project?.client_id ?? undefined);
  const { data: coSettings } = useCoSettings();
  const { data: directoryEntries = [] } = useProjectDirectory(projectId ?? null);
  const proposalQuery = useFinancialProposals(projectId ?? null);
  const existing = proposalQuery.data ?? [];
  const nextNo = `PROP-${String(existing.reduce((max, proposal) => {
    const match = proposal.proposal_no.match(/(\d+)(?!.*\d)/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1).padStart(3, "0")}`;

  const [aiText, setAiText] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [intakeMode, setIntakeMode] = useState<"scratch" | "upload">(
    searchParams.get("mode") === "upload" ? "upload" : "scratch",
  );
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourcePdfPath, setSourcePdfPath] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratorDraft>(EMPTY);
  const pricingSeeded = useRef(false);

  useEffect(() => {
    if (!coSettings || pricingSeeded.current) return;
    pricingSeeded.current = true;
    setDraft(current => ({
      ...current,
      overhead_pct: Number(coSettings.default_overhead_pct ?? 10),
      profit_pct: Number(coSettings.default_profit_pct ?? 5),
    }));
  }, [coSettings]);

  const patch = <K extends keyof GeneratorDraft>(key: K, value: GeneratorDraft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));
  const patchLine = <K extends keyof DraftLine>(index: number, key: K, value: DraftLine[K]) =>
    setDraft(current => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line),
    }));
  const addDraftLine = () => setDraft(current => ({
    ...current,
    lines: [...current.lines, { category: "other", description: "", lead_type: "apas", lead_directory_entry_id: null, quantity: 1, unit: "ls", unit_cost: 0, markup_pct: 0 }],
  }));
  const removeDraftLine = (index: number) => setDraft(current => ({
    ...current,
    lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
  }));
  const setLineLeadType = (index: number, leadType: DraftLine["lead_type"]) => {
    setDraft(current => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => lineIndex === index
        ? {
            ...line,
            lead_type: leadType,
            lead_directory_entry_id: leadType === "apas" ? null : line.lead_directory_entry_id,
            category: leadType === "contractor" ? "subcontract" : leadType === "consultant" ? "other" : line.category,
          }
        : line),
    }));
  };
  const draftTotals = useMemo(() => proposalTotals(draft.lines, draft), [draft.lines, draft]);
  const needsDirectory = useMemo(
    () => draft.lines.some((line) => line.lead_type !== "apas" && !line.lead_directory_entry_id),
    [draft.lines],
  );
  const hasDirectoryOptions = directoryEntries.length > 0;

  async function draftWithAI() {
    if (intakeMode === "upload") {
      toast.info("Executed proposals are manual only. Upload the signed PDF and type the approved value lines.");
      return;
    }
    if (intakeMode === "scratch" && aiText.trim().length < 5 && !bgFile) {
      toast.error("Dictate the proposal story, or attach background material.");
      return;
    }
    setBusy(true);
    try {
      let document: Record<string, string> | undefined;
      if (bgFile) {
        try {
          document = { ...(await fileToBackgroundDoc(bgFile)) };
        } catch (error) {
          toast.error((error as Error).message);
          setBusy(false);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("draft-financial-proposal", {
        body: {
          description: aiText.trim() || undefined,
          projectId,
          overheadPct: draft.overhead_pct,
          profitPct: draft.profit_pct,
          document,
          documentName: bgFile?.name,
          mode: "scratch_draft",
        },
      });
      if (error) throw error;
      const d = (data as { draft?: Partial<GeneratorDraft> & { lines?: DraftLine[] } })?.draft;
      if (!d) throw new Error("No draft returned");
      setDraft(current => ({
        ...current,
        title: intakeMode === "scratch" ? (d.title || current.title) : current.title,
        overview: intakeMode === "scratch" ? (d.overview ?? current.overview) : current.overview,
        scope_bullets: intakeMode === "scratch" && Array.isArray(d.scope_bullets) ? d.scope_bullets : current.scope_bullets,
        deliverables: intakeMode === "scratch" && Array.isArray(d.deliverables) ? d.deliverables : current.deliverables,
        terms: intakeMode === "scratch" ? (d.terms || current.terms) : current.terms,
        overhead_pct: typeof d.overhead_pct === "number" ? d.overhead_pct : current.overhead_pct,
        profit_pct: typeof d.profit_pct === "number" ? d.profit_pct : current.profit_pct,
        lines: Array.isArray(d.lines)
          ? d.lines.map((line) => ({
              ...line,
              lead_type: "apas" as const,
              lead_directory_entry_id: null,
              markup_pct: Number(line.markup_pct) || 0,
            }))
          : current.lines,
      }));
      toast.success("Proposal drafted. Review and edit, then create it.");
    } catch (error) {
      toast.error(`Draft failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function createProposal(thenSign = false) {
    if (!projectId) return;
    if (!draft.title.trim()) {
      toast.error("Add a title (or draft with AI first).");
      return;
    }
    if (intakeMode === "upload" && !sourcePdfPath) {
      toast.error("Upload the signed proposal PDF first.");
      return;
    }
    if (intakeMode === "upload" && draft.lines.length === 0) {
      toast.error("Add at least one approved value line before saving.");
      return;
    }
    if (needsDirectory) {
      toast.error("Choose a project-directory contractor or consultant for every non-APAS line.");
      return;
    }
    setSaving(true);
    try {
      const lockUploadedProposal = intakeMode === "upload" && thenSign;
      const created = await proposalQuery.create.mutateAsync({
        project_id: projectId,
        proposal_no: nextNo,
        title: draft.title.trim(),
        client_name: client?.name ?? null,
        client_email: client?.contact_email ?? null,
        valid_until: draft.valid_until || null,
        overhead_pct: draft.overhead_pct,
        profit_pct: draft.profit_pct,
        markup_pct: draft.overhead_pct + draft.profit_pct,
        notes: draft.overview || null,
        terms: draft.terms || null,
        scope_bullets: draft.scope_bullets,
        deliverables: draft.deliverables,
        pdf_path: sourcePdfPath,
        ...(lockUploadedProposal ? {
          status: "approved" as const,
          locked: true,
          accepted_signed_at: new Date().toISOString(),
          accepted_signed_name: client?.name ?? "Client",
          acceptance_method: "offline" as const,
          signed_hardcopy_path: sourcePdfPath,
          signed_hardcopy_note: "Client-signed proposal uploaded during proposal intake and locked as the approved record.",
          signed_hardcopy_at: new Date().toISOString(),
        } : {}),
      });
      if (draft.lines.length > 0) {
        const rows = draft.lines.map((line, index) => ({
          tenant_id: created.tenant_id,
          proposal_id: created.id,
          line_no: index + 1,
          category: line.category ?? "other",
          description: line.description ?? "",
          lead_type: line.lead_type ?? "apas",
          lead_directory_entry_id: line.lead_type === "apas" ? null : line.lead_directory_entry_id,
          quantity: Number(line.quantity) || 0,
          unit: line.unit || "ls",
          unit_cost: Number(line.unit_cost) || 0,
          markup_pct: Number(line.markup_pct) || 0,
        }));
        const { error } = await supabase.from("proposal_lines").insert(rows);
        if (error) throw error;
      }
      toast.success("Proposal created");
      navigate(`/projects/${projectId}/financials/proposals/${created.id}${thenSign && intakeMode === "scratch" ? "?sign=1" : ""}`);
    } catch (error) {
      toast.error(`Could not create proposal: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  // Build a preview-only proposal object for the live branded document.
  const previewProposal = useMemo(() => ({
    id: "preview",
    tenant_id: "",
    project_id: projectId ?? "",
    proposal_no: nextNo,
    title: draft.title || "Untitled proposal",
    client_name: client?.name ?? null,
    client_email: client?.contact_email ?? null,
    valid_until: draft.valid_until || null,
    status: "draft" as const,
    notes: draft.overview || null,
    terms: draft.terms || null,
    scope_bullets: draft.scope_bullets,
    deliverables: draft.deliverables,
      markup_pct: draft.overhead_pct + draft.profit_pct,
    overhead_pct: draft.overhead_pct,
    profit_pct: draft.profit_pct,
    source_issue_id: null,
    sign_token: "",
    locked: false,
    submitted_signature_path: null,
    submitted_signed_at: null,
    submitted_signed_by: null,
    accepted_signature_path: null,
    accepted_signed_at: null,
    accepted_signed_name: null,
    sent_to_client_at: null,
    client_comments: null,
    pdf_path: sourcePdfPath,
    revision_no: 0,
    amendment_history: [],
    proposal_no_history: [],
    delivery_history: [],
    acceptance_method: null,
    signed_hardcopy_path: null,
    signed_hardcopy_note: null,
    signed_hardcopy_at: null,
    signed_hardcopy_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as FinancialProposal, [draft, client, nextNo, projectId, sourcePdfPath]);

  const previewLines = useMemo(
    () => draft.lines.map((line, index) => ({
      id: `preview-${index}`,
      tenant_id: "",
      proposal_id: "preview",
      line_no: index + 1,
      category: line.category ?? "other",
      description: line.description ?? "",
      lead_type: line.lead_type ?? "apas",
      lead_directory_entry_id: line.lead_type === "apas" ? null : line.lead_directory_entry_id,
      quantity: Number(line.quantity) || 0,
      unit: line.unit || "ls",
      unit_cost: Number(line.unit_cost) || 0,
      markup_pct: Number(line.markup_pct) || 0,
      created_at: new Date().toISOString(),
    }) as FinancialProposalLine),
    [draft.lines],
  );

  return (
    <div className="container mx-auto max-w-7xl space-y-4 p-6">
      <FinancialSubNav />
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/dashboard" className="flex items-center gap-1 hover:text-foreground"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/projects/${projectId}/financials/proposals`} className="hover:text-foreground">Proposals</Link>
        <ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-foreground">New ({nextNo})</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proposal Intake</h1>
          <p className="text-sm text-muted-foreground">
            Choose one path{client ? <> for <span className="font-medium text-foreground">{client.name}</span></> : null}. Write a new proposal with AI, or upload an already executed proposal and manually enter the approved value lines that invoices will bill against.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/financials/proposals`)}>Cancel</Button>
          <Button variant="outline" disabled={saving} onClick={() => createProposal(false)}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
            {saving ? "Creating…" : "Save draft"}
          </Button>
          <Button disabled={saving} onClick={() => createProposal(true)}>{saving ? "Creating…" : intakeMode === "upload" ? "Save & lock" : "Save & sign"}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Author ─────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Step 1 · How do you want to build this proposal?</CardTitle>
              <p className="text-sm text-muted-foreground">Choose one clear path. Use AI only when writing from scratch. If a proposal is already signed or client-approved, upload it as the source record and type the approved billing values by hand.</p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { setIntakeMode("scratch"); setBgFile(null); }}
                className={`rounded-xl border p-4 text-left transition ${intakeMode === "scratch" ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/[0.06] shadow-sm" : "bg-background hover:bg-muted/40"}`}
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--apas-sapphire)] text-white"><Wand2 className="h-4 w-4" /></span>
                <span className="block font-semibold">Create from scratch with AI</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">Dictate the scope, fee, deliverables, and terms. AI writes the proposal and creates editable fee rows.</span>
              </button>
              <button
                type="button"
                onClick={() => setIntakeMode("upload")}
                className={`rounded-xl border p-4 text-left transition ${intakeMode === "upload" ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/[0.06] shadow-sm" : "bg-background hover:bg-muted/40"}`}
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white"><UploadCloud className="h-4 w-4" /></span>
                <span className="block font-semibold">Upload executed proposal</span>
                <span className="mt-1 block text-sm leading-5 text-muted-foreground">Keep the signed PDF untouched. Type the approved line items, who leads each item, any markup, and the client-approved total.</span>
              </button>
            </CardContent>
          </Card>

          <Card className="border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-base">
                {intakeMode === "upload" ? <UploadCloud className="h-4 w-4 text-[var(--apas-sapphire)]" /> : <Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" />}
                {intakeMode === "upload" ? "Upload executed proposal" : "Describe the proposal"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {intakeMode === "upload"
                  ? "Attach the signed client proposal. No AI will read it, rewrite it, or extract from it. Your team types the approved value lines below."
                  : "Tell the story: what the client needs, your approach, the fee, subs, consultants, pass-throughs, terms, and deliverables. AI is allowed here because this path creates a new proposal from scratch."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {intakeMode === "upload" ? (
                <AttachmentField
                  url={sourcePdfPath}
                  onChange={setSourcePdfPath}
                  projectId={projectId!}
                  folder="proposals/source"
                  label="Signed proposal PDF"
                  preview={false}
                />
              ) : (
                <VoiceDictationTextareaWithAI
                  value={aiText}
                  onValueChange={setAiText}
                  rows={5}
                  context="notes"
                  placeholder="e.g. Larkin Hospital needs a Phase I environmental assessment ahead of the east-wing expansion. We'll do the records review, site reconnaissance, and a written report with recommendations. Fee is a lump sum of $18,500. Turn the attached subconsultant lab quote into a pass-through line."
                />
              )}
              {intakeMode === "scratch" && (
                <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,.tsv"
                onChange={(e) => { setBgFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }}
              />
              {bgFile ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--apas-sapphire)]/30 bg-background px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--apas-sapphire)]" /><span className="truncate">{bgFile.name}</span></span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setBgFile(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-[var(--apas-sapphire)]/50 hover:text-foreground">
                  <Paperclip className="h-3.5 w-3.5" /> Attach background material for scratch drafting
                </button>
              )}
              <div className="flex justify-end">
                <Button onClick={draftWithAI} disabled={busy}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {busy ? "Working…" : "Draft proposal"}
                </Button>
              </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{intakeMode === "upload" ? "Executed proposal setup" : "Proposal content"}</CardTitle>
              {intakeMode === "upload" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                  The signed upload is the legal proposal. Do not rewrite its scope or terms here. Add a simple title, upload the signed PDF, then type each approved value line below.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Title</Label><Input value={draft.title} onChange={e => patch("title", e.target.value)} placeholder="Phase I Environmental Assessment" /></div>
                <div><Label>Valid until</Label><Input type="date" value={draft.valid_until} onChange={e => patch("valid_until", e.target.value)} /></div>
                <div><Label>Overhead %</Label><Input type="number" min="0" step="any" value={draft.overhead_pct} onChange={e => patch("overhead_pct", Number(e.target.value) || 0)} /></div>
                <div><Label>Profit %</Label><Input type="number" min="0" step="any" value={draft.profit_pct} onChange={e => patch("profit_pct", Number(e.target.value) || 0)} /><p className="mt-1 text-[11px] text-muted-foreground">Both calculate automatically from the cost-of-work subtotal. They are not line items.</p></div>
              </div>
              {intakeMode === "scratch" ? (
                <>
                  <div><Label>Overview</Label><VoiceDictationTextareaWithAI rows={6} context="notes" value={draft.overview} onValueChange={v => patch("overview", v)} placeholder="Our understanding of the need and our approach…" /></div>
                  <div><Label>Scope of services <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={4} context="notes" value={fromLines(draft.scope_bullets)} onValueChange={v => patch("scope_bullets", toLines(v))} placeholder={"Records review\nSite reconnaissance\nWritten report"} /></div>
                  <div><Label>Deliverables <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={fromLines(draft.deliverables)} onValueChange={v => patch("deliverables", toLines(v))} placeholder={"Phase I ESA report (PDF)\nExecutive summary"} /></div>
                  <div><Label>Terms &amp; assumptions</Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={draft.terms} onValueChange={v => patch("terms", v)} /></div>
                </>
              ) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                  Uploaded proposal content is intentionally not edited here. The PDF remains the signed source record; only the approved value lines below are editable for billing setup.
                </div>
              )}
              {draft.lines.length > 0 && (
                <div className="rounded-md border bg-muted/20 p-3 text-sm">
                  <p className="mb-1 font-medium">{draft.lines.length} fee line item{draft.lines.length === 1 ? "" : "s"} drafted</p>
                  <p className="text-xs text-muted-foreground">Review these rows now. They become the approved value basis that client invoices and vendor bills are checked against.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Step 2 · Approved value lines</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{intakeMode === "upload" ? "Type the approved line items from the signed proposal. Choose who leads each item. Contractors and consultants must already be in the project directory." : "One row per approved billing bucket: consulting fee, subcontractor, consultant, material, labor, equipment, pass-through, overhead-bearing cost, or other scope item."}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDraftLine}><Plus className="mr-1.5 h-4 w-4" />Add row</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="p-2 text-left">Line</th><th className="p-2 text-left">Description</th><th className="p-2 text-left">Lead</th><th className="p-2 text-left">Project team</th><th className="p-2 text-right">Approved amount</th><th className="p-2 text-right">Markup</th><th className="p-2 text-right">Client value</th><th /></tr>
                  </thead>
                  <tbody>
                    {draft.lines.length === 0 ? (
                      <tr><td colSpan={8} className="p-5 text-center text-sm text-muted-foreground">{intakeMode === "upload" ? "No value lines yet. Upload the signed proposal, then add line 1, line 2, line 3 exactly as approved." : "No fee rows yet. Draft with AI, attach background material, or add a row manually."}</td></tr>
                    ) : draft.lines.map((line, index) => {
                      const source = (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0);
                      const rowMarkup = source * ((Number(line.markup_pct) || 0) / 100);
                      const clientValue = source + rowMarkup;
                      return (
                        <tr key={index} className="border-t bg-background">
                          <td className="p-2 font-mono text-xs text-muted-foreground">{index + 1}</td>
                          <td className="p-2"><Input className="h-9 min-w-64 text-xs" value={line.description} onChange={event => patchLine(index, "description", event.target.value)} placeholder="Line item description from the approved proposal" /></td>
                          <td className="p-2">
                            <select className="h-9 rounded-md border bg-background px-2 text-xs" value={line.lead_type} onChange={event => setLineLeadType(index, event.target.value as DraftLine["lead_type"])}>
                              <option value="apas">APAS</option>
                              <option value="contractor">Contractor</option>
                              <option value="consultant">Consultant</option>
                            </select>
                          </td>
                          <td className="p-2">
                            {line.lead_type === "apas" ? (
                              <span className="inline-flex h-9 items-center rounded-md border bg-muted/40 px-3 text-xs font-medium">APAS internal</span>
                            ) : (
                              <select
                                className="h-9 min-w-56 rounded-md border bg-background px-2 text-xs"
                                value={line.lead_directory_entry_id ?? ""}
                                onChange={event => patchLine(index, "lead_directory_entry_id", event.target.value || null)}
                              >
                                <option value="">Choose from project directory</option>
                                {directoryEntries.map((entry) => <option key={entry.id} value={entry.id}>{directoryLabel(entry)}</option>)}
                              </select>
                            )}
                          </td>
                          <td className="p-2"><Input className="h-9 w-28 text-right text-xs" type="number" step="any" value={line.unit_cost} onChange={event => patchLine(index, "unit_cost", Number(event.target.value) || 0)} /></td>
                          <td className="p-2"><Input className="h-9 w-20 text-right text-xs" type="number" step="any" value={line.markup_pct} onChange={event => patchLine(index, "markup_pct", Number(event.target.value) || 0)} /></td>
                          <td className="p-2 text-right font-mono text-xs"><div>{money(clientValue)}</div>{rowMarkup > 0 && <div className="text-[10px] text-emerald-700">profit {money(rowMarkup)}</div>}</td>
                          <td className="p-2"><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeDraftLine(index)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40"><td colSpan={6} className="p-2 text-right">Source cost subtotal</td><td className="p-2 text-right font-mono">{money(draftTotals.sourceSubtotal)}</td><td /></tr>
                    <tr className="bg-muted/40"><td colSpan={6} className="p-2 text-right">APAS row markup</td><td className="p-2 text-right font-mono text-emerald-700">{money(draftTotals.lineMarkup)}</td><td /></tr>
                    <tr className="bg-muted/40"><td colSpan={6} className="p-2 text-right">Overhead and profit</td><td className="p-2 text-right font-mono">{money(draftTotals.overhead + draftTotals.profit)}</td><td /></tr>
                    <tr className="border-t bg-muted/60 font-semibold"><td colSpan={6} className="p-2 text-right">Grand total</td><td className="p-2 text-right font-mono">{money(draftTotals.total)}</td><td /></tr>
                  </tfoot>
                </table>
              </div>
              {intakeMode === "upload" && !hasDirectoryOptions && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                  <p className="font-semibold">Add the project team before assigning contractor or consultant work.</p>
                  <p className="mt-1 text-xs leading-5">Open People &amp; Team / Project Directory, add the contractor or consultant once, then return here and choose them from the dropdown. This keeps billing and vendor payments tied to the correct company.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white text-amber-950 hover:bg-amber-100">
                    <Link to={`/projects/${projectId}/directory`}>Open project directory</Link>
                  </Button>
                </div>
              )}
              {needsDirectory && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  Contractor and consultant rows must be selected from the project directory before this proposal can be saved.
                </div>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Tip: use APAS for work performed by APAS. Use Contractor or Consultant only after that company is in the project directory. Zero markup means pass-through.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Live preview ───────────────────────── */}
        <div className="self-start lg:sticky lg:top-4">
          <div className="mb-2 text-xs text-muted-foreground">Live preview</div>
          <div className="max-h-[calc(100vh-140px)] overflow-auto rounded-lg border bg-muted/30 p-3">
            <div style={{ transform: "scale(0.92)", transformOrigin: "top left" }}>
              <FinancialProposalDocument proposal={previewProposal} lines={previewLines} projectName={project?.name ?? "Project"} client={client} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
