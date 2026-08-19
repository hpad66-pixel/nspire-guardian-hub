/**
 * Admin-side client update studio. A project administrator can paste rough,
 * verified notes, organize them into a client-ready briefing, preview the exact
 * portal rendering, and explicitly publish when approved.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Check, ChevronDown, Eye, FileCheck2, Loader2, Plus,
  Save, Send, ShieldCheck, Sparkles, Trash2, TrendingUp, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AttachmentField } from "@/components/common/AttachmentField";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import { UPDATE_TYPES } from "@/lib/clientUpdates/presentation";
import { InviteClientDialog } from "@/components/portal/InviteClientDialog";
import { useFinancialReportData } from "@/hooks/useFinancialReportData";
import { financialSummary } from "@/lib/reports/financialReports";
import {
  useClientUpdates, type ActionItem, type ClientUpdate, type ClientUpdateType,
  type DecisionItem, type RiskItem,
} from "@/hooks/useClientUpdates";

const m0 = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

type Draft = Pick<ClientUpdate,
  "title" | "update_type" | "period_label" | "health" | "summary" | "accomplishments" |
  "risks" | "decisions" | "action_items" | "next_steps" | "statement_pdf_path">;

function weekLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${f(monday)}–${f(sunday)}, ${sunday.getFullYear()}`;
}

function emptyDraft(): Draft {
  return {
    title: "Project update", update_type: "progress", period_label: weekLabel(), health: "on_track", summary: "",
    accomplishments: [], risks: [], decisions: [], action_items: [], next_steps: [], statement_pdf_path: null,
  };
}

function fromUpdate(u: ClientUpdate): Draft {
  return {
    title: u.title, update_type: u.update_type ?? "general", period_label: u.period_label ?? "", health: u.health,
    summary: u.summary ?? "", accomplishments: u.accomplishments ?? [], risks: u.risks ?? [],
    decisions: u.decisions ?? [], action_items: u.action_items ?? [], next_steps: u.next_steps ?? [],
    statement_pdf_path: u.statement_pdf_path ?? null,
  };
}

const TYPE_HELP: Record<ClientUpdateType, string> = {
  general: "A simple note or announcement",
  progress: "Work completed and coming next",
  milestone: "A key achievement worth celebrating",
  decision: "A clear decision or approval needed",
  risk: "An issue, impact, and response",
};

function StringList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} placeholder={placeholder} onChange={(e) => onChange(items.map((x, xi) => xi === i ? e.target.value : x))} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${label.toLowerCase()} item`} onClick={() => onChange(items.filter((_, xi) => xi !== i))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>
    </div>
  );
}

export default function ClientUpdatesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const startInComposer = searchParams.get("compose") === "1";
  const { data: updates = [], create, save, setStatus, remove } = useClientUpdates(projectId ?? null);
  const { data: finData } = useFinancialReportData(projectId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(startInComposer);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [sourceNotes, setSourceNotes] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState<"notes" | "project" | null>(null);

  const selected = useMemo(() => updates.find((u) => u.id === selectedId) ?? null, [updates, selectedId]);
  const currentStatus = selected?.status ?? "draft";
  const hasClientContent = Boolean(draft.summary?.trim() || draft.accomplishments.some(Boolean) || draft.decisions.some((d) => d.text.trim()) || draft.risks.some((r) => r.text.trim()) || draft.next_steps.some(Boolean));
  const previewUpdate = { ...selected, ...draft, id: selected?.id ?? "preview", tenant_id: selected?.tenant_id ?? "", project_id: projectId ?? "", status: currentStatus, published_at: selected?.published_at ?? null, created_at: selected?.created_at ?? new Date().toISOString(), updated_at: selected?.updated_at ?? new Date().toISOString() } as ClientUpdate;

  useEffect(() => {
    if (selected) {
      setDraft(fromUpdate(selected));
      setSourceNotes("");
      setIsNew(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!selectedId && !isNew && updates.length) setSelectedId(updates[0].id);
  }, [updates, selectedId, isNew]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  function startNew() {
    setSelectedId(null);
    setDraft(emptyDraft());
    setSourceNotes("");
    setIsNew(true);
  }

  function pullFinancials() {
    if (!finData) { toast.error("No financial data is available for this project yet."); return; }
    const s = financialSummary(finData);
    const snapshot = `Financial snapshot: revised contract ${m0(s.revisedValue)}; billed to date ${m0(s.billedToDate)} (${s.pctComplete.toFixed(0)}% complete); paid to date ${m0(s.paidToDate)}; retainage held ${m0(s.retainageHeld)}; balance to finish ${m0(s.balanceToFinish)}.`;
    set({ summary: draft.summary?.trim() ? `${draft.summary.trim()}\n\n${snapshot}` : snapshot });
    toast.success("Verified financial totals added to the draft.");
  }

  async function formatDraft(mode: "notes" | "project") {
    if (!projectId) return;
    if (mode === "notes" && !sourceNotes.trim()) { toast.error("Write or paste your notes first."); return; }
    setAiBusy(mode);
    try {
      const { data, error } = await supabase.functions.invoke("generate-client-update", {
        body: {
          projectId,
          periodLabel: draft.period_label,
          rawNotes: mode === "notes" ? sourceNotes.trim() : "",
          updateType: draft.update_type,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error || "Could not format the update.");
      const d = data.draft;
      set({
        title: d.title || draft.title,
        update_type: d.update_type || draft.update_type,
        health: d.health,
        summary: d.summary,
        accomplishments: d.accomplishments,
        risks: d.risks,
        decisions: d.decisions,
        action_items: d.action_items,
        next_steps: d.next_steps,
      });
      toast.success(mode === "notes" ? "Your notes are organized. Review the preview before publishing." : "Project activity is organized into a draft. Review every fact before publishing.");
    } catch (error) {
      if (mode === "notes" && sourceNotes.trim()) {
        const firstSentence = (sourceNotes.trim().match(/^[^.!?]+[.!?]?/)?.[0] ?? sourceNotes.trim()).replace(/[.!?]+$/, "");
        const fallbackTitle = firstSentence.length > 88 ? `${firstSentence.slice(0, 85).trim()}…` : firstSentence;
        set({ summary: sourceNotes.trim(), title: draft.title === "Project update" ? (fallbackTitle || UPDATE_TYPES[draft.update_type].label) : draft.title });
        toast.warning("AI formatting is unavailable, so your notes were placed in the draft unchanged.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create the draft.");
      }
    } finally {
      setAiBusy(null);
    }
  }

  function cleanDraft(): Draft {
    return {
      ...draft,
      title: draft.title.trim() || "Project update",
      accomplishments: draft.accomplishments.map((x) => x.trim()).filter(Boolean),
      next_steps: draft.next_steps.map((x) => x.trim()).filter(Boolean),
      risks: draft.risks.filter((r) => r.text.trim()),
      decisions: draft.decisions.filter((d) => d.text.trim()),
      action_items: draft.action_items.filter((a) => a.text.trim()),
    };
  }

  async function doSave(): Promise<string> {
    const patch = cleanDraft();
    if (selected) {
      // Never save edits directly into a live client-facing row. A published
      // briefing returns to a private draft before any changed content is saved.
      if (selected.status === "published") await setStatus.mutateAsync({ id: selected.id, status: "draft" });
      await save.mutateAsync({ id: selected.id, patch });
      setDraft(patch);
      return selected.id;
    }
    const created = await create.mutateAsync(patch);
    setDraft(patch);
    setSelectedId(created.id);
    setIsNew(false);
    return created.id;
  }

  async function saveDraft() {
    const wasPublished = currentStatus === "published";
    try { await doSave(); toast.success(wasPublished ? "Update returned to a private draft and saved." : "Draft saved privately."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the draft."); }
  }

  async function togglePublish() {
    if (!hasClientContent) { toast.error("Add a summary or at least one update item before publishing."); return; }
    try {
      const id = await doSave();
      const status = currentStatus === "published" ? "draft" : "published";
      await setStatus.mutateAsync({ id, status });
      toast.success(status === "published" ? "Published. Your client can see this update now." : "Update removed from the client portal and returned to drafts.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update publication status."); }
  }

  async function doDelete() {
    if (!selected) { startNew(); return; }
    if (!confirm("Delete this update? This cannot be undone.")) return;
    try {
      await remove.mutateAsync(selected.id);
      setSelectedId(null);
      setDraft(emptyDraft());
      setIsNew(false);
      toast.success("Update deleted.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete the update."); }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-5 p-4 sm:p-6">
      <FinancialSubNav />

      <header className="overflow-hidden rounded-[24px] border border-[#173c33]/10 bg-[#082b23] px-5 py-6 text-white shadow-[0_20px_60px_rgba(8,43,35,0.12)] sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#d9b45b]"><Sparkles className="h-4 w-4" />Client communication studio</div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Write once. Publish beautifully.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">Paste your working notes, let the system organize them, verify the client preview, and publish only when you approve it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Invite client</Button>
            <Button className="bg-[#d9b45b] text-[#082b23] hover:bg-[#e4c36f]" onClick={startNew}><Plus className="mr-2 h-4 w-4" />New client update</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-2 text-xs sm:grid-cols-3">
          {["Write rough notes", "Review formatted preview", "Approve & publish"].map((label, i) => <div key={label} className="flex items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2.5"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] text-[#d9b45b]">{i + 1}</span>{label}</div>)}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between px-1"><h2 className="text-sm font-semibold">Update history</h2><Badge variant="outline">{updates.length}</Badge></div>
          <button onClick={startNew} className={`w-full rounded-2xl border border-dashed p-3 text-left transition ${isNew ? "border-[#0d6b57] bg-emerald-50" : "border-slate-300 bg-white hover:border-[#0d6b57]"}`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-[#082b23]"><Plus className="h-4 w-4" />New draft</span>
            <span className="mt-1 block text-xs text-slate-500">Start with any kind of note</span>
          </button>
          <div className="grid max-h-[680px] gap-2 overflow-auto pr-1">
            {updates.map((update) => {
              const meta = UPDATE_TYPES[update.update_type ?? "general"] ?? UPDATE_TYPES.general;
              const Icon = meta.icon;
              return (
                <button key={update.id} onClick={() => setSelectedId(update.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === update.id ? "border-[#0d6b57] bg-emerald-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg bg-slate-100"><Icon className={`h-3.5 w-3.5 ${meta.accent}`} /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{update.title}</strong><small className="mt-0.5 block truncate text-slate-500">{update.period_label || new Date(update.created_at).toLocaleDateString()}</small></span>
                  </div>
                  <Badge variant="outline" className={`mt-2 text-[10px] ${update.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>{update.status === "published" ? "Live in portal" : "Private draft"}</Badge>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(430px,0.95fr)_minmax(400px,1.05fr)]">
          <section className="min-w-0 space-y-4">
            <Card className="overflow-hidden rounded-[22px] border-slate-200 shadow-sm">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a7646]">Quick composer</p><h2 className="mt-1 text-xl font-semibold text-[#082b23]">What do you want the client to know?</h2></div>
                  <Badge variant="outline" className={currentStatus === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"}>{currentStatus === "published" ? "Published" : "Private draft"}</Badge>
                </div>

                <div className="space-y-2">
                  <Label>Choose the message type</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.entries(UPDATE_TYPES) as [ClientUpdateType, typeof UPDATE_TYPES[ClientUpdateType]][]).map(([key, meta]) => {
                      const Icon = meta.icon;
                      const active = draft.update_type === key;
                      return (
                        <button key={key} type="button" onClick={() => set({ update_type: key })} className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-[#0d6b57] bg-emerald-50 ring-1 ring-[#0d6b57]/10" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                          <span className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl ${active ? "bg-[#082b23] text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="h-4 w-4" /></span>
                          <span><strong className="block text-sm">{meta.label}</strong><small className="mt-0.5 block leading-4 text-slate-500">{TYPE_HELP[key]}</small></span>
                          {active && <Check className="ml-auto h-4 w-4 text-emerald-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between gap-3"><Label htmlFor="client-source-notes">Your verified notes</Label><span className="text-[11px] text-slate-400">No word limit</span></div>
                  <Textarea id="client-source-notes" rows={9} value={sourceNotes} onChange={(e) => setSourceNotes(e.target.value)} className="resize-y rounded-2xl border-slate-200 bg-slate-50/50 p-4 text-[15px] leading-6" placeholder={draft.update_type === "milestone" ? "Example: Today we completed the final sewer main connection. Inspection passed at 2:30 PM. Restoration begins Thursday..." : "Write naturally or paste field notes. Include dates, quantities, accomplishments, upcoming work, decisions, responsible parties, risks, or anything else the client should know..."} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => formatDraft("notes")} disabled={aiBusy !== null || !sourceNotes.trim()} className="bg-[#0d6b57] hover:bg-[#095847]">{aiBusy === "notes" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Format my notes</Button>
                    <Button variant="outline" onClick={() => formatDraft("project")} disabled={aiBusy !== null}>{aiBusy === "project" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Build from project activity</Button>
                  </div>
                </div>

                <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-blue-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p><strong>Formatting does not publish.</strong> AI organizes only the facts you provide and project records it can access. You review and approve the exact client view before it becomes visible.</p>
                </div>
              </CardContent>
            </Card>

            <details className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-sm font-semibold text-[#082b23]">
                Fine-tune details <span className="flex items-center gap-2 text-xs font-normal text-slate-500">Optional structured editing <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></span>
              </summary>
              <div className="space-y-5 border-t border-slate-100 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label>Title</Label><Input value={draft.title} onChange={(e) => set({ title: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Period or date</Label><Input value={draft.period_label ?? ""} onChange={(e) => set({ period_label: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Overall health</Label><div className="flex flex-wrap gap-2">{(["on_track", "at_risk", "delayed"] as const).map((health) => <button key={health} type="button" onClick={() => set({ health })} className={`rounded-xl border px-3 py-2 text-sm ${draft.health === health ? "border-[#0d6b57] bg-emerald-50 font-medium text-[#082b23]" : "text-slate-500"}`}>{health === "on_track" ? "On track" : health === "at_risk" ? "At risk" : "Delayed"}</button>)}</div></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><Label>Client summary</Label><Button type="button" variant="ghost" size="sm" onClick={pullFinancials}><TrendingUp className="mr-1 h-3.5 w-3.5" />Add financial snapshot</Button></div><Textarea rows={5} value={draft.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} /></div>
                <StringList label="Completed & accomplished" items={draft.accomplishments} onChange={(accomplishments) => set({ accomplishments })} placeholder="What was completed" />

                <div className="space-y-2"><Label>Risks & issues</Label>{draft.risks.map((risk, i) => <div key={i} className="flex gap-2"><Input className="flex-1" value={risk.text} placeholder="Issue and impact" onChange={(e) => set({ risks: draft.risks.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x) })} /><select className="h-10 rounded-md border bg-background px-2 text-sm" value={risk.severity} onChange={(e) => set({ risks: draft.risks.map((x, xi) => xi === i ? { ...x, severity: e.target.value as RiskItem["severity"] } : x) })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><Button type="button" variant="ghost" size="icon" onClick={() => set({ risks: draft.risks.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => set({ risks: [...draft.risks, { text: "", severity: "medium" } as RiskItem] })}><Plus className="mr-1 h-3.5 w-3.5" />Add risk</Button></div>

                <div className="space-y-2"><Label>Decisions</Label>{draft.decisions.map((decision, i) => <div key={i} className="flex gap-2"><Input className="flex-1" value={decision.text} placeholder="Decision needed or made" onChange={(e) => set({ decisions: draft.decisions.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x) })} /><select className="h-10 rounded-md border bg-background px-2 text-sm" value={decision.status} onChange={(e) => set({ decisions: draft.decisions.map((x, xi) => xi === i ? { ...x, status: e.target.value as DecisionItem["status"] } : x) })}><option value="needed">Needed</option><option value="made">Made</option></select><Button type="button" variant="ghost" size="icon" onClick={() => set({ decisions: draft.decisions.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => set({ decisions: [...draft.decisions, { text: "", status: "needed" } as DecisionItem] })}><Plus className="mr-1 h-3.5 w-3.5" />Add decision</Button></div>

                <div className="space-y-2"><Label>Responsible parties & actions</Label>{draft.action_items.map((action, i) => <div key={i} className="flex items-center gap-2"><input type="checkbox" checked={action.done} onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => xi === i ? { ...x, done: e.target.checked } : x) })} /><Input className="flex-1" value={action.text} placeholder="Action" onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => xi === i ? { ...x, text: e.target.value } : x) })} /><Input className="w-28" value={action.owner} placeholder="Owner" onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => xi === i ? { ...x, owner: e.target.value } : x) })} /><Button type="button" variant="ghost" size="icon" onClick={() => set({ action_items: draft.action_items.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button></div>)}<Button type="button" variant="outline" size="sm" onClick={() => set({ action_items: [...draft.action_items, { text: "", owner: "", done: false } as ActionItem] })}><Plus className="mr-1 h-3.5 w-3.5" />Add action</Button></div>

                <StringList label="Coming next" items={draft.next_steps} onChange={(next_steps) => set({ next_steps })} placeholder="What happens next" />
                <div className="space-y-2"><Label>Supporting financial statement (optional)</Label><AttachmentField url={draft.statement_pdf_path} onChange={(statement_pdf_path) => set({ statement_pdf_path })} projectId={projectId ?? ""} folder="client-updates" label="Financial statement" /></div>
              </div>
            </details>
          </section>

          <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a7646]"><Eye className="h-3.5 w-3.5" />Exact client preview</p><p className="mt-1 text-xs text-slate-500">This is what appears in the client portal.</p></div>
              <div className="flex gap-2"><Button variant="outline" size="sm" onClick={saveDraft} disabled={save.isPending || create.isPending}><Save className="mr-1.5 h-4 w-4" />{currentStatus === "published" ? "Save as draft" : "Save draft"}</Button><Button size="sm" onClick={togglePublish} disabled={setStatus.isPending || save.isPending || create.isPending || !hasClientContent} className={currentStatus === "published" ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50" : "bg-[#0d6b57] hover:bg-[#095847]"}>{currentStatus === "published" ? <><X className="mr-1.5 h-4 w-4" />Unpublish</> : <><Send className="mr-1.5 h-4 w-4" />Publish to portal</>}</Button></div>
            </div>
            {!hasClientContent ? <div className="grid min-h-[420px] place-items-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm"><Sparkles className="h-5 w-5 text-[#0d6b57]" /></span><h3 className="mt-4 font-semibold text-[#082b23]">Your preview will appear here</h3><p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">Write rough notes and choose “Format my notes,” or open the structured editor to build it manually.</p></div></div> : <ClientUpdateView update={previewUpdate} />}
            <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" />Drafts remain private.</span>{selected && <Button variant="ghost" size="sm" className="h-auto p-0 text-rose-600 hover:bg-transparent hover:text-rose-700" onClick={doDelete}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>}</div>
          </aside>
        </div>
      </div>

      {projectId && <InviteClientDialog open={inviteOpen} onOpenChange={setInviteOpen} projectId={projectId} />}
    </div>
  );
}
