import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useFinancialProposals, useFinancialProposalLines, type FinancialProposal, type FinancialProposalLine,
} from "@/hooks/useFinancialProposals";
import { useProject } from "@/hooks/useProjects";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { FinancialProposalDocument, proposalTotals } from "@/components/financial/FinancialProposalDocument";
import { FinancialProposalSignDialog } from "@/components/financial/FinancialProposalSignDialog";
import { SendFinancialProposalDialog } from "@/components/financial/SendFinancialProposalDialog";
import { AmendFinancialProposalDialog } from "@/components/financial/AmendFinancialProposalDialog";
import { ProposalAiDraftCard, type ProposalAiDraft } from "@/components/financial/ProposalAiDraftCard";
import { useClient } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateProposalPdf } from "@/lib/pdf/proposalPdf";
import {
  CheckCircle2, ChevronLeft, Download, FileText, Lock, Pencil, PenLine, Plus, RotateCcw, Save, Send, Trash2,
} from "lucide-react";

const CATEGORIES: FinancialProposalLine["category"][] = ["labor", "material", "equipment", "subcontract", "other"];
const fmt = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);

function statusClass(status: FinancialProposal["status"]) {
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  if (status === "sent") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function EditableProposalLine({ line, editable, onSave, onRemove }: {
  line: FinancialProposalLine;
  editable: boolean;
  onSave: (line: FinancialProposalLine) => Promise<void>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(line);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(line), [line]);
  const total = Number(draft.quantity) * Number(draft.unit_cost) * (1 + Number(draft.markup_pct) / 100);
  const changed = JSON.stringify(draft) !== JSON.stringify(line);
  const patch = <K extends keyof FinancialProposalLine>(key: K, value: FinancialProposalLine[K]) => setDraft(current => ({ ...current, [key]: value }));
  async function save() { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }

  if (!editable) return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="p-3 font-mono text-muted-foreground">{line.line_no}</td><td className="p-3 capitalize">{line.category}</td><td className="p-3">{line.description}</td>
      <td className="p-3 text-right font-mono">{line.quantity}</td><td className="p-3">{line.unit}</td><td className="p-3 text-right font-mono">{fmt(Number(line.unit_cost))}</td>
      <td className="p-3 text-right font-mono text-amber-600">{line.markup_pct}%</td><td className="p-3 text-right font-mono font-semibold">{fmt(total)}</td><td />
    </tr>
  );

  return (
    <tr className="border-b last:border-0 bg-muted/5">
      <td className="p-2 font-mono text-xs text-muted-foreground">{line.line_no}</td>
      <td className="p-2"><Select value={draft.category} onValueChange={value => patch("category", value as FinancialProposalLine["category"])}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(category => <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>)}</SelectContent></Select></td>
      <td className="p-2"><Input className="h-8 min-w-48 text-xs" value={draft.description} onChange={event => patch("description", event.target.value)} /></td>
      <td className="p-2"><Input className="h-8 w-16 text-right text-xs" type="number" step="any" value={draft.quantity} onChange={event => patch("quantity", Number(event.target.value) as any)} /></td>
      <td className="p-2"><Input className="h-8 w-16 text-xs" value={draft.unit} onChange={event => patch("unit", event.target.value)} /></td>
      <td className="p-2"><Input className="h-8 w-24 text-right text-xs" type="number" step="any" value={draft.unit_cost} onChange={event => patch("unit_cost", Number(event.target.value) as any)} /></td>
      <td className="p-2"><Input className="h-8 w-16 text-right text-xs" type="number" step=".1" value={draft.markup_pct} onChange={event => patch("markup_pct", Number(event.target.value) as any)} /></td>
      <td className="p-2 text-right font-mono text-xs">{fmt(total)}</td>
      <td className="p-2"><div className="flex"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={!changed || saving} onClick={save}><Save className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
    </tr>
  );
}

export default function ProposalBuilderPage() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(project?.client_id ?? undefined);
  const proposalQuery = useFinancialProposals(projectId ?? null);
  const proposal = proposalQuery.data?.find(item => item.id === proposalId) ?? null;
  const lineQuery = useFinancialProposalLines(proposalId ?? null);
  const lines = lineQuery.data ?? [];
  const projectName = project?.name ?? "Project";
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState<Partial<FinancialProposal>>({});
  const [signOpen, setSignOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState("");
  const [newLine, setNewLine] = useState<Partial<FinancialProposalLine>>({ category: "labor", quantity: 1, unit: "ls", unit_cost: 0, markup_pct: 10 });

  useEffect(() => {
    if (proposal) setNewLine(current => ({ ...current, markup_pct: proposal.markup_pct ?? 10 }));
  }, [proposal]);

  // Auto-fill the client from the project's client record so the consultant
  // never types it. Only for editable drafts that don't already name a client.
  const clientFilledRef = useRef(false);
  useEffect(() => {
    if (!proposal || !client || clientFilledRef.current) return;
    if (proposal.client_name) return;
    if (proposal.locked || proposal.status !== "draft") return;
    clientFilledRef.current = true;
    proposalQuery.update.mutate({
      id: proposal.id,
      client_name: client.name,
      client_email: client.contact_email || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal, client]);

  const totals = useMemo(() => proposalTotals(lines), [lines]);
  const editable = Boolean(proposal && !proposal.locked && proposal.status === "draft");

  if (proposalQuery.isLoading) return <div className="p-6 text-muted-foreground">Loading proposal…</div>;
  if (!proposal) return <div className="container mx-auto max-w-6xl p-6"><FinancialSubNav /><p className="text-muted-foreground">Proposal not found.</p></div>;

  function startEditDetails() { setDraft({ ...proposal }); setEditingDetails(true); }
  async function saveDetails() {
    if (!draft.title?.trim() || !draft.proposal_no?.trim()) return toast.error("Proposal number and title are required.");
    try {
      await proposalQuery.update.mutateAsync({
        id: proposal.id, proposal_no: draft.proposal_no, title: draft.title, client_name: draft.client_name || null,
        client_email: draft.client_email || null, valid_until: draft.valid_until || null, markup_pct: Number(draft.markup_pct) || 0,
        notes: draft.notes || null, terms: draft.terms || null,
        scope_bullets: draft.scope_bullets ?? [], deliverables: draft.deliverables ?? [],
      });
      setEditingDetails(false); toast.success("Proposal details saved");
    } catch (error) { toast.error((error as Error).message); }
  }

  async function addLine() {
    if (!description.trim()) return toast.error("Description is required.");
    const nextNo = lines.length ? Math.max(...lines.map(line => line.line_no)) + 1 : 1;
    await lineQuery.create.mutateAsync({ proposal_id: proposal.id, description: description.trim(), line_no: nextNo, category: newLine.category ?? "labor", quantity: Number(newLine.quantity) || 1, unit: newLine.unit || "ls", unit_cost: Number(newLine.unit_cost) || 0, markup_pct: Number(newLine.markup_pct) || 0 });
    setDescription(""); setNewLine({ category: "labor", quantity: 1, unit: "ls", unit_cost: 0, markup_pct: proposal.markup_pct ?? 10 }); toast.success("Line added");
  }

  async function saveLine(line: FinancialProposalLine) {
    await lineQuery.update.mutateAsync({ id: line.id, category: line.category, description: line.description, quantity: Number(line.quantity), unit: line.unit, unit_cost: Number(line.unit_cost), markup_pct: Number(line.markup_pct) });
    toast.success("Line updated");
  }

  // Apply an AI draft: patch the scope/terms/markup and append the priced lines.
  // Existing lines are kept so re-drafting is additive; the author edits from there.
  async function applyDraft(draftResult: ProposalAiDraft) {
    if (!proposal) return;
    await proposalQuery.update.mutateAsync({
      id: proposal.id,
      title: proposal.title?.trim() ? proposal.title : (draftResult.title || proposal.title),
      notes: draftResult.overview || proposal.notes,
      terms: draftResult.terms || proposal.terms,
      scope_bullets: Array.isArray(draftResult.scope_bullets) && draftResult.scope_bullets.length ? draftResult.scope_bullets : proposal.scope_bullets,
      deliverables: Array.isArray(draftResult.deliverables) && draftResult.deliverables.length ? draftResult.deliverables : proposal.deliverables,
      markup_pct: typeof draftResult.markup_pct === "number" ? draftResult.markup_pct : proposal.markup_pct,
    });
    let no = lines.length ? Math.max(...lines.map(line => line.line_no)) : 0;
    for (const line of draftResult.lines ?? []) {
      no += 1;
      await lineQuery.create.mutateAsync({
        proposal_id: proposal.id,
        line_no: no,
        category: line.category,
        description: line.description,
        quantity: Number(line.quantity) || 0,
        unit: line.unit || "ls",
        unit_cost: Number(line.unit_cost) || 0,
        markup_pct: Number(line.markup_pct) || (proposal.markup_pct ?? 10),
      });
    }
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try { await generateProposalPdf(proposal, lines, projectName, "APAS Consulting", client); }
    catch (error) { toast.error(`PDF export failed: ${(error as Error).message}`); }
    finally { setPdfBusy(false); }
  }

  async function removeProposal() {
    const message = editable ? `Delete draft ${proposal.proposal_no}? This cannot be undone.` : `${proposal.proposal_no} is part of the proposal record. Delete it permanently?`;
    if (!window.confirm(message)) return;
    await proposalQuery.remove.mutateAsync(proposal.id);
    navigate(`/projects/${projectId}/financials/proposals`);
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["financial_proposals", projectId] });
    queryClient.invalidateQueries({ queryKey: ["financial_proposal_lines", proposalId] });
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <FinancialSubNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Link to={`/projects/${projectId}/financials/proposals`} className="mt-1"><ChevronLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <div><div className="flex flex-wrap items-center gap-2"><FileText className="h-6 w-6 text-[var(--apas-sapphire)]" /><h1 className="text-2xl font-bold"><span className="mr-2 font-mono text-muted-foreground">{proposal.proposal_no}</span>{proposal.title}</h1><Badge className={statusClass(proposal.status)}>{proposal.status}</Badge>{proposal.locked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}{proposal.accepted_signed_at && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" />Client accepted</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{proposal.client_name || "No client assigned"} · {fmt(totals.total)}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editable && <Button variant="outline" size="sm" onClick={startEditDetails}><Pencil className="mr-1.5 h-4 w-4" />Edit details</Button>}
          {editable && <Button size="sm" onClick={() => setSignOpen(true)} disabled={lines.length === 0}><PenLine className="mr-1.5 h-4 w-4" />Sign & lock</Button>}
          {proposal.locked && !proposal.accepted_signed_at && <Button size="sm" onClick={() => setSendOpen(true)}><Send className="mr-1.5 h-4 w-4" />{proposal.sent_to_client_at ? "Re-send" : "Send to client"}</Button>}
          {proposal.locked && <Button variant="outline" size="sm" onClick={() => setAmendOpen(true)}><RotateCcw className="mr-1.5 h-4 w-4" />Amend</Button>}
          <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfBusy}><Download className="mr-1.5 h-4 w-4" />{pdfBusy ? "Preparing…" : "Download PDF"}</Button>
        </div>
      </div>

      {proposal.status === "rejected" && proposal.client_comments && <div className="rounded-md border-l-2 border-red-500 bg-red-50 px-4 py-3"><p className="text-xs font-semibold text-red-700">Client requested a revision</p><p className="mt-1 text-sm">{proposal.client_comments}</p></div>}

      {editingDetails && (
        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Edit proposal details</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={() => setEditingDetails(false)}>Cancel</Button><Button onClick={saveDetails} disabled={proposalQuery.update.isPending}><Save className="mr-1.5 h-4 w-4" />Save</Button></div></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Proposal #</Label><Input value={draft.proposal_no || ""} onChange={event => setDraft(current => ({ ...current, proposal_no: event.target.value }))} /></div><div><Label>Title</Label><Input value={draft.title || ""} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></div>
          <div><Label>Client</Label><Input value={draft.client_name || ""} onChange={event => setDraft(current => ({ ...current, client_name: event.target.value }))} /></div><div><Label>Email</Label><Input type="email" value={draft.client_email || ""} onChange={event => setDraft(current => ({ ...current, client_email: event.target.value }))} /></div>
          <div><Label>Valid until</Label><Input type="date" value={draft.valid_until || ""} onChange={event => setDraft(current => ({ ...current, valid_until: event.target.value }))} /></div><div><Label>Default markup %</Label><Input type="number" step=".1" value={draft.markup_pct ?? 0} onChange={event => setDraft(current => ({ ...current, markup_pct: Number(event.target.value) }))} /></div>
          <div className="md:col-span-2"><Label>Overview</Label><VoiceDictationTextareaWithAI rows={5} context="notes" value={draft.notes || ""} onValueChange={value => setDraft(current => ({ ...current, notes: value }))} /></div>
          <div className="md:col-span-2"><Label>Scope of services <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={4} context="notes" value={(draft.scope_bullets ?? []).join("\n")} onValueChange={value => setDraft(current => ({ ...current, scope_bullets: value.split("\n").map(line => line.trim()).filter(Boolean) }))} /></div>
          <div className="md:col-span-2"><Label>Deliverables <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={(draft.deliverables ?? []).join("\n")} onValueChange={value => setDraft(current => ({ ...current, deliverables: value.split("\n").map(line => line.trim()).filter(Boolean) }))} /></div>
          <div className="md:col-span-2"><Label>Terms</Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={draft.terms || ""} onValueChange={value => setDraft(current => ({ ...current, terms: value }))} /></div>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
        ["Subtotal", fmt(totals.subtotal)], ["Markup", fmt(totals.markup)], ["Proposal total", fmt(totals.total)], ["Valid until", proposal.valid_until ? new Date(`${proposal.valid_until}T00:00:00`).toLocaleDateString() : "—"],
      ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></CardContent></Card>)}</div>

      {editable && (
        <ProposalAiDraftCard
          projectId={projectId!}
          defaultMarkup={proposal.markup_pct ?? 10}
          disabled={proposalQuery.update.isPending || lineQuery.create.isPending}
          onApply={applyDraft}
        />
      )}

      <Card><CardHeader><CardTitle className="text-base">Line items</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><th className="p-3 text-left">#</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-left">Unit</th><th className="p-3 text-right">Unit cost</th><th className="p-3 text-right">Markup</th><th className="p-3 text-right">Total</th><th /></tr></thead><tbody>
        {lines.map(line => <EditableProposalLine key={line.id} line={line} editable={editable} onSave={saveLine} onRemove={() => lineQuery.remove.mutate(line.id)} />)}
        {editable && <tr className="border-t-2 bg-muted/10"><td className="p-2 text-xs text-muted-foreground">{lines.length + 1}</td><td className="p-2"><Select value={newLine.category} onValueChange={value => setNewLine(current => ({ ...current, category: value as any }))}><SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(category => <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Input className="h-8 min-w-48 text-xs" value={description} onChange={event => setDescription(event.target.value)} placeholder="Description…" /></td><td className="p-2"><Input className="h-8 w-16 text-right text-xs" type="number" value={newLine.quantity} onChange={event => setNewLine(current => ({ ...current, quantity: Number(event.target.value) }))} /></td><td className="p-2"><Input className="h-8 w-16 text-xs" value={newLine.unit} onChange={event => setNewLine(current => ({ ...current, unit: event.target.value }))} /></td><td className="p-2"><Input className="h-8 w-24 text-right text-xs" type="number" value={newLine.unit_cost} onChange={event => setNewLine(current => ({ ...current, unit_cost: Number(event.target.value) }))} /></td><td className="p-2"><Input className="h-8 w-16 text-right text-xs" type="number" value={newLine.markup_pct} onChange={event => setNewLine(current => ({ ...current, markup_pct: Number(event.target.value) }))} /></td><td className="p-2 text-right text-xs text-muted-foreground">{fmt(Number(newLine.quantity) * Number(newLine.unit_cost) * (1 + Number(newLine.markup_pct) / 100))}</td><td className="p-2"><Button size="icon" className="h-8 w-8" onClick={addLine} disabled={lineQuery.create.isPending}><Plus className="h-4 w-4" /></Button></td></tr>}
      </tbody><tfoot><tr className="border-t bg-muted/50 font-bold"><td colSpan={7} className="p-3 text-right">Proposal total</td><td className="p-3 text-right font-mono text-base text-[var(--apas-sapphire)]">{fmt(totals.total)}</td><td /></tr></tfoot></table></div></CardContent></Card>

      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Proposal document</CardTitle><div className="flex gap-2">{proposal.locked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Signed version</Badge>}</div></div></CardHeader><CardContent><div className="max-h-[760px] overflow-auto rounded-md border bg-muted/30 p-3"><FinancialProposalDocument ref={previewRef} proposal={proposal} lines={lines} projectName={projectName} client={client} /></div></CardContent></Card>

      <Card><CardContent className="flex items-center justify-between p-4"><div><p className="font-medium">Record controls</p><p className="text-sm text-muted-foreground">Signed proposals remain locked. Amend creates an auditable editable version.</p></div><Button variant="ghost" className="text-destructive hover:text-destructive" onClick={removeProposal} disabled={proposalQuery.remove.isPending}><Trash2 className="mr-1.5 h-4 w-4" />Delete proposal</Button></CardContent></Card>

      <FinancialProposalSignDialog open={signOpen} onOpenChange={setSignOpen} proposal={proposal} lines={lines} projectName={projectName} client={client} onSigned={refresh} />
      <SendFinancialProposalDialog open={sendOpen} onOpenChange={setSendOpen} proposal={proposal} lines={lines} projectName={projectName} onSent={refresh} />
      <AmendFinancialProposalDialog open={amendOpen} onOpenChange={setAmendOpen} proposal={proposal} reopen={proposalQuery.reopen as any} onDone={refresh} />
    </div>
  );
}
