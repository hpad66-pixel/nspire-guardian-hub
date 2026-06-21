import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useChangeOrdersByProject } from "@/hooks/useChangeOrders";
import { useProject } from "@/hooks/useProjects";
import { useCoWorkflow } from "@/hooks/useCoWorkflow";
import { useCoSettings } from "@/hooks/useCoSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChangeOrderDocument } from "@/lib/changeOrder/ChangeOrderDocument";
import { CoSpecEditor } from "@/components/financial/CoSpecEditor";
import { buildCoPdfBlob } from "@/lib/changeOrder/coPdf";
import { recomputePricing } from "@/lib/changeOrder/pricing";
import {
  partiesFromContract, signatoriesFromContract, blankSpec, fmtLongDate, money,
} from "@/lib/changeOrder/defaults";
import type { CoSpec, CoMarkup } from "@/lib/changeOrder/types";
import { FileText, ChevronRight, LayoutDashboard, Sparkles, Loader2, Paperclip, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const todayLong = () => fmtLongDate(new Date().toISOString().slice(0, 10));

// Max background-document size we'll send to the draft function (base64 inflates ~33%).
const MAX_BG_BYTES = 20 * 1024 * 1024;
const BG_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type BgDoc = { kind: "pdf" | "image" | "text"; mediaType: string; data: string };

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

// Turn an uploaded background file into the payload the draft-change-order
// function understands. Returns null (with a toast) for unsupported types.
async function toBgDoc(file: File): Promise<BgDoc | null> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return { kind: "pdf", mediaType: "application/pdf", data: await readAsBase64(file) };
  }
  if (BG_IMAGE_TYPES.has(file.type)) {
    return { kind: "image", mediaType: file.type, data: await readAsBase64(file) };
  }
  if (file.type.startsWith("text/") || /\.(txt|md|csv|log)$/.test(name)) {
    return { kind: "text", mediaType: "text/plain", data: await readAsText(file) };
  }
  toast.error("Unsupported file — upload a PDF, image, or text file (Word docs: export to PDF first).");
  return null;
}

export default function ChangeOrderGeneratorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project } = useProject(projectId ?? null);
  const { data: contract } = usePrimeContract(projectId ?? null);
  const { data: existingCos = [] } = useChangeOrdersByProject(projectId ?? null);
  const { data: coSettings } = useCoSettings();
  const { create } = useCoWorkflow(projectId ?? null);
  const docRef = useRef<HTMLDivElement>(null);
  const company = (coSettings ?? null) as any;

  const nextNo = useMemo(() => {
    const nums = existingCos.filter((c: any) => c.co_type === "PCO" && !c.commitment_id).map((c: any) => Number(c.co_no) || 0);
    return (nums.length ? Math.max(...nums) : 0) + 1;
  }, [existingCos]);

  const [spec, setSpec] = useState<CoSpec>(() => {
    const parties = partiesFromContract(contract as any, (project as any)?.name, company);
    const sigs = signatoriesFromContract(contract as any, company);
    const s = blankSpec(parties, sigs, { company });
    s.doc.date = todayLong();
    s.signatures.submitted.date = todayLong();
    return s;
  });

  // Re-seed parties/branding/markups once the contract + workspace settings load.
  const seeded = useRef(false);
  if (!seeded.current && (contract || coSettings)) {
    seeded.current = true;
    const fresh = blankSpec(
      partiesFromContract(contract as any, (project as any)?.name, company),
      signatoriesFromContract(contract as any, company),
      { company, overheadPct: Number(company?.default_overhead_pct ?? 10), profitPct: Number(company?.default_profit_pct ?? 5) },
    );
    setSpec((prev) => ({
      ...fresh,
      doc: { ...fresh.doc, date: prev.doc.date || todayLong() },
      parties: { ...fresh.parties, subject: prev.parties.subject, basis: prev.parties.basis },
      signatures: { ...fresh.signatures, submitted: { ...fresh.signatures.submitted, date: prev.signatures.submitted.date || todayLong() } },
    }));
  }

  const coNo = spec.doc.co_number || String(nextNo);
  const livePricing = useMemo(() => recomputePricing(spec.pricing), [spec.pricing]);
  const [saving, setSaving] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [bgFile, setBgFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function pickBgFile(file: File | null | undefined) {
    if (!file) return;
    if (file.size > MAX_BG_BYTES) {
      return toast.error(`File is too large (max ${Math.round(MAX_BG_BYTES / 1024 / 1024)} MB).`);
    }
    setBgFile(file);
  }

  // Direction + uploaded background document → structured draft. The user reviews/edits everything after.
  async function draftWithAI() {
    if (aiText.trim().length < 5 && !bgFile) {
      return toast.error("Attach a background file or describe the change order first.");
    }
    setAiBusy(true);
    try {
      const oh = Number(pctOf(spec.pricing.markups[0])) || 10;
      const pf = Number(pctOf(spec.pricing.markups[1])) || 5;
      let document: BgDoc | null = null;
      if (bgFile) {
        document = await toBgDoc(bgFile);
        if (!document) { setAiBusy(false); return; }
      }
      const { data, error } = await supabase.functions.invoke("draft-change-order", {
        body: {
          description: aiText,
          projectId,
          overheadPct: oh,
          profitPct: pf,
          ...(document ? { document, documentName: bgFile?.name } : {}),
        },
      });
      if (error) throw error;
      const d = (data as any)?.draft;
      if (!d) throw new Error("No draft returned");
      patch((s) => {
        if (d.title) s.doc.title = d.title;
        if (d.subject) s.parties.subject = d.subject;
        if (d.basis) s.parties.basis = d.basis;
        s.sections[0] = { heading: "1. BACKGROUND", blocks: [{ p: d.background ?? "" }] };
        s.sections[1] = { heading: "2. SCOPE OF WORK", blocks: [{ p: d.scope_intro ?? "" }, { bullets: (d.scope_bullets ?? []).filter(Boolean) }] };
        s.pricing.groups[0].rows = (d.line_items ?? []).map((li: any, i: number) => ({
          n: String(i + 1), desc: li.desc ?? "", unit: li.unit ?? "LS", qty: String(li.qty ?? "1"),
          unit_cost: String(li.unit_cost ?? ""), extended: "", basis: li.basis ?? "Firm",
        }));
        if (s.pricing.markups[0]) s.pricing.markups[0].amount = `${d.overhead_pct ?? oh}%`;
        if (s.pricing.markups[1]) s.pricing.markups[1].amount = `${d.profit_pct ?? pf}%`;
        if (d.justification) {
          const idx = s.sections_after_pricing.findIndex((x) => /justification/i.test(x.heading));
          const sec = { heading: "JUSTIFICATION", blocks: [{ p: d.justification } as any] };
          if (idx >= 0) s.sections_after_pricing[idx] = { ...s.sections_after_pricing[idx], blocks: [{ p: d.justification } as any] };
          else s.sections_after_pricing.unshift(sec);
        }
      });
      toast.success("Draft ready — review and edit below.");
    } catch (e) {
      toast.error(`Draft failed: ${(e as Error).message}`);
    } finally {
      setAiBusy(false);
    }
  }

  function patch(updater: (s: CoSpec) => void) {
    setSpec((prev) => { const next = structuredClone(prev); updater(next); return next; });
  }

  // Overhead / Profit markups are stored as "<n>%"; pctOf reads just the number
  // (used to seed the AI defaults). The editor itself handles writing markups.
  const pctOf = (m: CoMarkup | undefined) => (m?.amount ?? "").toString().replace("%", "").trim();

  async function handleSave(thenSign: boolean) {
    if (!projectId) return;
    const finalSpec = structuredClone(spec);
    if (!finalSpec.doc.co_number) finalSpec.doc.co_number = String(nextNo);
    if (!finalSpec.doc.co_label) finalSpec.doc.co_label = `PCO-${String(finalSpec.doc.co_number).padStart(3, "0")}`;
    finalSpec.pricing = recomputePricing(finalSpec.pricing);
    if (!finalSpec.doc.title.trim()) return toast.error("Add a title for the change order.");
    setSaving(true);
    try {
      // Crisp vector preview PDF (best-effort — must never block creating the CO).
      let previewPdf: Blob | null = null;
      try {
        previewPdf = await buildCoPdfBlob(finalSpec);
      } catch (pdfErr) {
        console.warn("CO preview PDF generation failed (continuing):", pdfErr);
      }
      const row = await create.mutateAsync({ projectId, primeContractId: (contract as any)?.id ?? null, spec: finalSpec, previewPdf });
      toast.success(`Change order ${finalSpec.doc.co_label} created`);
      navigate(`/projects/${projectId}/financials/cos/${row.id}${thenSign ? "?sign=1" : ""}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-4">
      <FinancialSubNav projectId={projectId ?? ""} />
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <Link to="/dashboard" className="hover:text-foreground flex items-center gap-1"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to={`/projects/${projectId}/financials/change-orders`} className="hover:text-foreground">Change Orders</Link>
        <ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground font-medium">New (PCO-{String(coNo).padStart(3, "0")})</span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Generate Change Order</h1>
          <p className="text-muted-foreground text-sm">Parties auto-fill from the prime contract · edit anything · live preview on the right.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings/change-orders")} title="Set your company identity & defaults">Company defaults</Button>
          <Button variant="outline" disabled={saving} onClick={() => handleSave(false)}><FileText className="h-4 w-4 mr-1.5" />Save draft</Button>
          <Button disabled={saving} onClick={() => handleSave(true)}>{saving ? "Saving…" : "Save & sign"}</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Editor ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Describe it in plain language → AI drafts the scope + pricing */}
          <Card className="border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-[var(--apas-sapphire)]" /> Describe the change order</CardTitle>
              <p className="text-xs text-muted-foreground">Upload a background document (an RFI, field report, vendor quote, email, or marked-up sketch) and/or tell it what changed — Claude reads both and drafts the scope and pricing for you to review. You can also dictate with your keyboard's mic.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                rows={4}
                placeholder="e.g. Use the attached D'Shin quote for Line 3 concrete demo, but cap the disposal allowance at $1,800 and add 10% overhead, 5% profit. — or — Six manhole rims on Line 2 ended up below the new asphalt grade after paving and need adjusting at about $1,450 each."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
              />

              {/* Background document — sent to Claude as the source material for the draft */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.csv,application/pdf,image/*,text/plain"
                className="hidden"
                onChange={(e) => { pickBgFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
              />
              {bgFile ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--apas-sapphire)]/30 bg-background px-3 py-2 text-sm">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--apas-sapphire)]" />
                    <span className="truncate">{bgFile.name}</span>
                    <span className="text-muted-foreground shrink-0">· {(bgFile.size / 1024).toFixed(0)} KB</span>
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setBgFile(null)} title="Remove background file">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pickBgFile(e.dataTransfer.files?.[0]); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-[var(--apas-sapphire)]/50 hover:text-foreground"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach background file — drop or click (PDF, image, or text)
                </button>
              )}

              <div className="flex justify-end">
                <Button onClick={draftWithAI} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {aiBusy ? "Drafting…" : "Draft with AI"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <CoSpecEditor spec={spec} onPatch={patch} coNumberPlaceholder={String(nextNo)} />
        </div>

        {/* ── Live preview ───────────────────────────────────── */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="text-xs text-muted-foreground mb-2">Live preview · {money(Number(livePricing.grand_total.amount.replace(/[^0-9.-]/g, "")))}</div>
          <div className="border rounded-lg overflow-auto max-h-[calc(100vh-140px)] bg-muted/30 p-3">
            <div style={{ transform: "scale(0.92)", transformOrigin: "top left" }}>
              <ChangeOrderDocument ref={docRef} spec={{ ...spec, doc: { ...spec.doc, co_number: coNo, co_label: spec.doc.co_label || `PCO-${String(coNo).padStart(3, "0")}` } }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
