/**
 * ClientUpdatesPage — GC-side composer for the client briefings shown in the
 * owner portal. Create/edit a weekly update (health, summary, accomplishments,
 * risks, decisions, action items, next steps + a financial statement), preview
 * it, then publish it to the client.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2, Send, Eye, Save } from "lucide-react";
import { toast } from "sonner";
import { AttachmentField } from "@/components/common/AttachmentField";
import { ClientUpdateView } from "@/components/portal/ClientUpdateView";
import {
  useClientUpdates, type ClientUpdate, type RiskItem, type DecisionItem, type ActionItem,
} from "@/hooks/useClientUpdates";

type Draft = Pick<ClientUpdate,
  "title" | "period_label" | "health" | "summary" | "accomplishments" | "risks" | "decisions" | "action_items" | "next_steps" | "statement_pdf_path">;

const EMPTY: Draft = {
  title: "Project update", period_label: "", health: "on_track", summary: "",
  accomplishments: [], risks: [], decisions: [], action_items: [], next_steps: [], statement_pdf_path: null,
};

function fromUpdate(u: ClientUpdate): Draft {
  return {
    title: u.title, period_label: u.period_label ?? "", health: u.health, summary: u.summary ?? "",
    accomplishments: u.accomplishments ?? [], risks: u.risks ?? [], decisions: u.decisions ?? [],
    action_items: u.action_items ?? [], next_steps: u.next_steps ?? [], statement_pdf_path: u.statement_pdf_path ?? null,
  };
}

function StringList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input value={it} placeholder={placeholder} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? e.target.value : x)))} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, xi) => xi !== i))}><X className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
    </div>
  );
}

export default function ClientUpdatesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: updates = [], create, save, setStatus, remove } = useClientUpdates(projectId ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [preview, setPreview] = useState(false);

  const selected = useMemo(() => updates.find((u) => u.id === selectedId) ?? null, [updates, selectedId]);
  useEffect(() => { if (selected) setDraft(fromUpdate(selected)); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!selectedId && updates.length) setSelectedId(updates[0].id); }, [updates, selectedId]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  async function newUpdate() {
    try {
      const u = await create.mutateAsync({ title: "Project update", period_label: weekLabel() });
      setSelectedId(u.id);
      toast.success("Draft update created.");
    } catch (e: any) { toast.error(e.message); }
  }
  async function doSave() {
    if (!selected) return;
    const patch: Draft = {
      ...draft,
      accomplishments: draft.accomplishments.filter(Boolean),
      next_steps: draft.next_steps.filter(Boolean),
      risks: draft.risks.filter((r) => r.text.trim()),
      decisions: draft.decisions.filter((d) => d.text.trim()),
      action_items: draft.action_items.filter((a) => a.text.trim()),
    };
    try { await save.mutateAsync({ id: selected.id, patch }); toast.success("Saved."); }
    catch (e: any) { toast.error(e.message); }
  }
  async function togglePublish() {
    if (!selected) return;
    const status = selected.status === "published" ? "draft" : "published";
    try {
      await doSave();
      await setStatus.mutateAsync({ id: selected.id, status });
      toast.success(status === "published" ? "Published to the client." : "Unpublished.");
    } catch (e: any) { toast.error(e.message); }
  }
  async function doDelete() {
    if (!selected || !confirm("Delete this update?")) return;
    try { await remove.mutateAsync(selected.id); setSelectedId(null); setDraft(EMPTY); toast.success("Deleted."); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-4">
      <FinancialSubNav />
      <div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold">Client Updates</h1>
            <p className="text-muted-foreground">Compose the briefings your client sees in their portal.</p>
          </div>
          <Button onClick={newUpdate} disabled={create.isPending}><Plus className="h-4 w-4 mr-1" />New update</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* List */}
        <div className="space-y-2">
          {updates.length === 0 && <p className="text-sm text-muted-foreground">No updates yet. Create your first.</p>}
          {updates.map((u) => (
            <button key={u.id} onClick={() => setSelectedId(u.id)}
              className={`w-full text-left rounded-md border p-3 transition-colors ${selectedId === u.id ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/5" : "hover:bg-muted"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{u.title}</span>
                <Badge variant="outline" className={u.status === "published" ? "text-[var(--apas-emerald)]" : "text-muted-foreground"}>{u.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{u.period_label || new Date(u.created_at).toLocaleDateString()}</div>
            </button>
          ))}
        </div>

        {/* Editor / preview */}
        {!selected ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Select an update or create a new one.</CardContent></Card>
        ) : preview ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Preview — what the client sees</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Back to edit</Button>
            </CardHeader>
            <CardContent><ClientUpdateView update={{ ...selected, ...draft } as ClientUpdate} /></CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Edit update</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4 mr-1" />Preview</Button>
                <Button variant="ghost" size="icon" className="text-[var(--apas-rose)]" onClick={doDelete}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Title</Label><Input value={draft.title} onChange={(e) => set({ title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Period</Label><Input value={draft.period_label ?? ""} placeholder="Week of Jun 16–22" onChange={(e) => set({ period_label: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Overall health</Label>
                <div className="flex gap-2">
                  {(["on_track", "at_risk", "delayed"] as const).map((h) => (
                    <button key={h} type="button" onClick={() => set({ health: h })}
                      className={`px-3 py-1.5 rounded-md text-sm border ${draft.health === h ? "border-[var(--apas-sapphire)] bg-[var(--apas-sapphire)]/10 font-medium" : "text-muted-foreground"}`}>
                      {h === "on_track" ? "On track" : h === "at_risk" ? "At risk" : "Delayed"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5"><Label>Summary</Label><Textarea rows={3} value={draft.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} placeholder="A short narrative for the client…" /></div>

              <StringList label="Accomplishments" items={draft.accomplishments} onChange={(v) => set({ accomplishments: v })} placeholder="What got done" />

              {/* Risks */}
              <div className="space-y-1.5">
                <Label>Risks & issues</Label>
                {draft.risks.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="flex-1" value={r.text} placeholder="Risk / issue" onChange={(e) => set({ risks: draft.risks.map((x, xi) => (xi === i ? { ...x, text: e.target.value } : x)) })} />
                    <select className="h-10 rounded-md border bg-background px-2 text-sm" value={r.severity}
                      onChange={(e) => set({ risks: draft.risks.map((x, xi) => (xi === i ? { ...x, severity: e.target.value as RiskItem["severity"] } : x)) })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => set({ risks: draft.risks.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => set({ risks: [...draft.risks, { text: "", severity: "medium" } as RiskItem] })}><Plus className="h-3.5 w-3.5 mr-1" />Add risk</Button>
              </div>

              {/* Decisions */}
              <div className="space-y-1.5">
                <Label>Decisions</Label>
                {draft.decisions.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="flex-1" value={d.text} placeholder="Decision" onChange={(e) => set({ decisions: draft.decisions.map((x, xi) => (xi === i ? { ...x, text: e.target.value } : x)) })} />
                    <select className="h-10 rounded-md border bg-background px-2 text-sm" value={d.status}
                      onChange={(e) => set({ decisions: draft.decisions.map((x, xi) => (xi === i ? { ...x, status: e.target.value as DecisionItem["status"] } : x)) })}>
                      <option value="needed">Needed</option><option value="made">Made</option>
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => set({ decisions: draft.decisions.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => set({ decisions: [...draft.decisions, { text: "", status: "needed" } as DecisionItem] })}><Plus className="h-3.5 w-3.5 mr-1" />Add decision</Button>
              </div>

              {/* Action items */}
              <div className="space-y-1.5">
                <Label>Action items</Label>
                {draft.action_items.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="checkbox" checked={a.done} onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => (xi === i ? { ...x, done: e.target.checked } : x)) })} />
                    <Input className="flex-1" value={a.text} placeholder="Action" onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => (xi === i ? { ...x, text: e.target.value } : x)) })} />
                    <Input className="w-28" value={a.owner} placeholder="Owner" onChange={(e) => set({ action_items: draft.action_items.map((x, xi) => (xi === i ? { ...x, owner: e.target.value } : x)) })} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => set({ action_items: draft.action_items.filter((_, xi) => xi !== i) })}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => set({ action_items: [...draft.action_items, { text: "", owner: "Client", done: false } as ActionItem] })}><Plus className="h-3.5 w-3.5 mr-1" />Add action</Button>
              </div>

              <StringList label="Next steps" items={draft.next_steps} onChange={(v) => set({ next_steps: v })} placeholder="What's coming up" />

              <div className="space-y-1.5">
                <Label>Weekly financial statement (optional)</Label>
                <AttachmentField url={draft.statement_pdf_path} onChange={(url) => set({ statement_pdf_path: url })} projectId={projectId ?? ""} folder="client-updates" label="Financial statement" />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <Button variant="outline" onClick={doSave} disabled={save.isPending}><Save className="h-4 w-4 mr-1" />Save draft</Button>
                <Button onClick={togglePublish} disabled={setStatus.isPending}>
                  <Send className="h-4 w-4 mr-1" />{selected.status === "published" ? "Unpublish" : "Save & publish to client"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function weekLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now); monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${f(monday)}–${f(sunday)}, ${sunday.getFullYear()}`;
}
