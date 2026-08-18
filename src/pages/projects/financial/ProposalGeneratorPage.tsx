import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/hooks/useProjects";
import { useClient } from "@/hooks/useClients";
import { useFinancialProposals, type FinancialProposal, type FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { FinancialProposalDocument } from "@/components/financial/FinancialProposalDocument";
import { fileToBackgroundDoc } from "@/lib/ai/backgroundDoc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { ChevronRight, FileText, LayoutDashboard, Loader2, Paperclip, Sparkles, X } from "lucide-react";

interface DraftLine {
  category: FinancialProposalLine["category"];
  description: string;
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
  markup_pct: number;
  valid_until: string;
  lines: DraftLine[];
}

const EMPTY: GeneratorDraft = {
  title: "",
  overview: "",
  scope_bullets: [],
  deliverables: [],
  terms: "Net 30. All work per applicable codes and standards.",
  markup_pct: 10,
  valid_until: "",
  lines: [],
};

const toLines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);
const fromLines = (values: string[] | undefined) => (values ?? []).join("\n");

export default function ProposalGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(project?.client_id ?? undefined);
  const proposalQuery = useFinancialProposals(projectId ?? null);
  const existing = proposalQuery.data ?? [];
  const nextNo = `PROP-${String(existing.reduce((max, proposal) => {
    const match = proposal.proposal_no.match(/(\d+)(?!.*\d)/);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1).padStart(3, "0")}`;

  const [aiText, setAiText] = useState("");
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<GeneratorDraft>(EMPTY);

  const patch = <K extends keyof GeneratorDraft>(key: K, value: GeneratorDraft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  async function draftWithAI() {
    if (aiText.trim().length < 5 && !bgFile) {
      toast.error("Dictate the proposal story, or attach a subconsultant document.");
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
        body: { description: aiText.trim() || undefined, projectId, markupPct: draft.markup_pct, document, documentName: bgFile?.name },
      });
      if (error) throw error;
      const d = (data as { draft?: Partial<GeneratorDraft> & { lines?: DraftLine[] } })?.draft;
      if (!d) throw new Error("No draft returned");
      setDraft(current => ({
        ...current,
        title: d.title || current.title,
        overview: d.overview ?? current.overview,
        scope_bullets: Array.isArray(d.scope_bullets) ? d.scope_bullets : current.scope_bullets,
        deliverables: Array.isArray(d.deliverables) ? d.deliverables : current.deliverables,
        terms: d.terms || current.terms,
        markup_pct: typeof d.markup_pct === "number" ? d.markup_pct : current.markup_pct,
        lines: Array.isArray(d.lines) ? d.lines : current.lines,
      }));
      toast.success("Proposal drafted — review and edit, then create it.");
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
    setSaving(true);
    try {
      const created = await proposalQuery.create.mutateAsync({
        project_id: projectId,
        proposal_no: nextNo,
        title: draft.title.trim(),
        client_name: client?.name ?? null,
        client_email: client?.contact_email ?? null,
        valid_until: draft.valid_until || null,
        markup_pct: draft.markup_pct,
        notes: draft.overview || null,
        terms: draft.terms || null,
        scope_bullets: draft.scope_bullets,
        deliverables: draft.deliverables,
      });
      if (draft.lines.length > 0) {
        const rows = draft.lines.map((line, index) => ({
          tenant_id: created.tenant_id,
          proposal_id: created.id,
          line_no: index + 1,
          category: line.category ?? "other",
          description: line.description ?? "",
          quantity: Number(line.quantity) || 0,
          unit: line.unit || "ls",
          unit_cost: Number(line.unit_cost) || 0,
          markup_pct: Number(line.markup_pct) || draft.markup_pct,
        }));
        const { error } = await supabase.from("proposal_lines" as any).insert(rows as any);
        if (error) throw error;
      }
      toast.success("Proposal created");
      navigate(`/projects/${projectId}/financials/proposals/${created.id}${thenSign ? "?sign=1" : ""}`);
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
    markup_pct: draft.markup_pct,
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
    pdf_path: null,
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
  }) as FinancialProposal, [draft, client, nextNo, projectId]);

  const previewLines = useMemo(
    () => draft.lines.map((line, index) => ({
      id: `preview-${index}`,
      tenant_id: "",
      proposal_id: "preview",
      line_no: index + 1,
      category: line.category ?? "other",
      description: line.description ?? "",
      quantity: Number(line.quantity) || 0,
      unit: line.unit || "ls",
      unit_cost: Number(line.unit_cost) || 0,
      markup_pct: Number(line.markup_pct) || draft.markup_pct,
      created_at: new Date().toISOString(),
    }) as FinancialProposalLine),
    [draft.lines, draft.markup_pct],
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
          <h1 className="text-2xl font-bold">Generate Proposal</h1>
          <p className="text-sm text-muted-foreground">
            Dictate the story{client ? <> for <span className="font-medium text-foreground">{client.name}</span></> : null} · Claude writes it up · edit anything · live preview on the right.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/financials/proposals`)}>Cancel</Button>
          <Button variant="outline" disabled={saving} onClick={() => createProposal(false)}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
            {saving ? "Creating…" : "Save draft"}
          </Button>
          <Button disabled={saving} onClick={() => createProposal(true)}>{saving ? "Creating…" : "Save & sign"}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Author ─────────────────────────────── */}
        <div className="space-y-4">
          <Card className="border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-base"><Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" /> Describe the proposal</CardTitle>
              <p className="text-xs text-muted-foreground">Tell the story — what the client needs, your approach, the fee. Attach a subconsultant quote or RFP and Claude reads both. You can dictate with your mic.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <VoiceDictationTextareaWithAI
                value={aiText}
                onValueChange={setAiText}
                rows={5}
                context="notes"
                placeholder="e.g. Larkin Hospital needs a Phase I environmental assessment ahead of the east-wing expansion. We'll do the records review, site reconnaissance, and a written report with recommendations. Fee is a lump sum of $18,500. Turn the attached subconsultant lab quote into a pass-through line."
              />
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
                  <Paperclip className="h-3.5 w-3.5" /> Attach subconsultant doc — click (PDF, image, or text)
                </button>
              )}
              <div className="flex justify-end">
                <Button onClick={draftWithAI} disabled={busy}>
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  {busy ? "Writing…" : "Draft with AI"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Proposal content</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Title</Label><Input value={draft.title} onChange={e => patch("title", e.target.value)} placeholder="Phase I Environmental Assessment" /></div>
                <div><Label>Valid until</Label><Input type="date" value={draft.valid_until} onChange={e => patch("valid_until", e.target.value)} /></div>
                <div><Label>Default markup %</Label><Input type="number" step="0.1" value={draft.markup_pct} onChange={e => patch("markup_pct", Number(e.target.value) || 0)} /></div>
              </div>
              <div><Label>Overview</Label><VoiceDictationTextareaWithAI rows={6} context="notes" value={draft.overview} onValueChange={v => patch("overview", v)} placeholder="Our understanding of the need and our approach…" /></div>
              <div><Label>Scope of services <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={4} context="notes" value={fromLines(draft.scope_bullets)} onValueChange={v => patch("scope_bullets", toLines(v))} placeholder={"Records review\nSite reconnaissance\nWritten report"} /></div>
              <div><Label>Deliverables <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={fromLines(draft.deliverables)} onValueChange={v => patch("deliverables", toLines(v))} placeholder={"Phase I ESA report (PDF)\nExecutive summary"} /></div>
              <div><Label>Terms &amp; assumptions</Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={draft.terms} onValueChange={v => patch("terms", v)} /></div>
              {draft.lines.length > 0 && (
                <div className="rounded-md border bg-muted/20 p-3 text-sm">
                  <p className="mb-1 font-medium">{draft.lines.length} fee line item{draft.lines.length === 1 ? "" : "s"} drafted</p>
                  <p className="text-xs text-muted-foreground">Fine-tune pricing in the builder after you create the proposal.</p>
                </div>
              )}
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
