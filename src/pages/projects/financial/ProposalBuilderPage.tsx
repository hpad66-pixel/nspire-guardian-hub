import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useFinancialProposals, useFinancialProposalLines, type FinancialProposal, type FinancialProposalLine,
} from "@/hooks/useFinancialProposals";
import { useProject } from "@/hooks/useProjects";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { FinancialProposalDocument } from "@/components/financial/FinancialProposalDocument";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import { FinancialProposalSignDialog } from "@/components/financial/FinancialProposalSignDialog";
import { SendFinancialProposalDialog } from "@/components/financial/SendFinancialProposalDialog";
import { AmendFinancialProposalDialog } from "@/components/financial/AmendFinancialProposalDialog";
import { ProposalAiDraftCard, type ProposalAiDraft } from "@/components/financial/ProposalAiDraftCard";
import { FinancialProposalWorkflow } from "@/components/financial/FinancialProposalWorkflow";
import {
  RenumberFinancialProposalDialog,
  UploadFinancialProposalHardcopyDialog,
} from "@/components/financial/FinancialProposalRecordDialogs";
import { AttachmentField } from "@/components/common/AttachmentField";
import { ResizableWorkspace } from "@/components/layout/ResizableWorkspace";
import type { ExtractedProposalValueLine } from "@/lib/financial/proposalValueExtraction";
import { useClient } from "@/hooks/useClients";
import { useCurrentUserRole } from "@/hooks/useUserManagement";
import { useProjectDirectory, type DirectoryEntry } from "@/hooks/useProjectDirectory";
import { isAdminRole } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import { Badge } from "@/components/ui/badge";
import { generateProposalPdf } from "@/lib/pdf/proposalPdf";
import {
  CheckCircle2, ChevronLeft, Download, FileCheck, FileDown, FileText, Hash, Lock, Pencil, PenLine, Plus, Receipt, RotateCcw, Save, Send, Trash2,
} from "lucide-react";

const fmt = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);
const directoryLabel = (entry: DirectoryEntry) =>
  entry.external_display_name || entry.external_company_name || entry.role_label || "Project directory entry";
const rowSource = (line: Pick<FinancialProposalLine, "quantity" | "unit_cost">) => Number(line.quantity) * Number(line.unit_cost);
const rowMarkup = (line: Pick<FinancialProposalLine, "quantity" | "unit_cost" | "markup_pct">) => rowSource(line) * ((Number(line.markup_pct) || 0) / 100);
const rowClientValue = (line: Pick<FinancialProposalLine, "quantity" | "unit_cost" | "markup_pct">) => rowSource(line) + rowMarkup(line);

function statusClass(status: FinancialProposal["status"]) {
  if (status === "approved") return "bg-[var(--apas-sapphire)]/15 text-[var(--apas-sapphire)]";
  if (status === "sent") return "bg-blue-100 text-blue-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  if (status === "expired") return "bg-amber-100 text-amber-800";
  return "bg-gray-100 text-gray-700";
}

function EditableProposalLine({ line, editable, directoryEntries, onSave, onRemove }: {
  line: FinancialProposalLine;
  editable: boolean;
  directoryEntries: DirectoryEntry[];
  onSave: (line: FinancialProposalLine) => Promise<void>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(line);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(line), [line]);
  const source = rowSource(draft);
  const markup = rowMarkup(draft);
  const clientValue = source + markup;
  const changed = JSON.stringify(draft) !== JSON.stringify(line);
  const patch = <K extends keyof FinancialProposalLine>(key: K, value: FinancialProposalLine[K]) => setDraft(current => ({ ...current, [key]: value }));
  const setLeadType = (leadType: FinancialProposalLine["lead_type"]) => setDraft(current => ({
    ...current,
    lead_type: leadType,
    lead_directory_entry_id: leadType === "apas" ? null : current.lead_directory_entry_id,
    category: leadType === "contractor" ? "subcontract" : leadType === "consultant" ? "other" : current.category,
  }));
  async function save() { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }

  if (!editable) return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="p-3 font-mono text-muted-foreground">{line.line_no}</td><td className="p-3">{line.description}</td>
      <td className="p-3 capitalize">{line.lead_type === "apas" ? "APAS" : line.lead_type}</td>
      <td className="p-3">
        {line.lead_type === "apas"
          ? "APAS internal"
          : (directoryEntries.find((entry) => entry.id === line.lead_directory_entry_id)
              ? directoryLabel(directoryEntries.find((entry) => entry.id === line.lead_directory_entry_id)!)
              : "Missing project directory entry")}
      </td>
      <td className="p-3 text-right font-mono">{fmt(Number(line.unit_cost))}</td>
      <td className="p-3 text-right font-mono">{Number(line.markup_pct || 0)}%</td>
      <td className="p-3 text-right font-mono font-semibold">{fmt(rowClientValue(line))}</td><td />
    </tr>
  );

  return (
    <tr className="border-b last:border-0 bg-muted/5">
      <td className="p-2 font-mono text-xs text-muted-foreground">{line.line_no}</td>
      <td className="p-2"><Input className="h-8 w-full min-w-0 text-xs" value={draft.description} onChange={event => patch("description", event.target.value)} /></td>
      <td className="p-2">
        <select className="h-8 w-full rounded-md border bg-background px-2 text-xs" value={draft.lead_type} onChange={event => setLeadType(event.target.value as FinancialProposalLine["lead_type"])}>
          <option value="apas">APAS</option>
          <option value="contractor">Contractor</option>
          <option value="consultant">Consultant</option>
        </select>
      </td>
      <td className="p-2">
        {draft.lead_type === "apas" ? (
          <span className="inline-flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs font-medium">APAS internal</span>
        ) : (
          <select className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs" value={draft.lead_directory_entry_id ?? ""} onChange={event => patch("lead_directory_entry_id", event.target.value || null)}>
            <option value="">Choose from project directory</option>
            {directoryEntries.map((entry) => <option key={entry.id} value={entry.id}>{directoryLabel(entry)}</option>)}
          </select>
        )}
      </td>
      <td className="p-2"><Input className="h-8 w-full min-w-0 text-right text-xs" type="number" step="any" value={draft.unit_cost} onChange={event => patch("unit_cost", Number(event.target.value))} /></td>
      <td className="p-2"><Input className="h-8 w-full min-w-0 text-right text-xs" type="number" step="any" value={draft.markup_pct} onChange={event => patch("markup_pct", Number(event.target.value))} /></td>
      <td className="p-2 text-right font-mono text-xs"><div>{fmt(clientValue)}</div>{markup > 0 && <div className="text-[10px] text-[var(--apas-sapphire)]">profit {fmt(markup)}</div>}</td>
      <td className="p-2"><div className="flex"><Button variant="ghost" size="icon" className="h-8 w-8" disabled={!changed || saving} onClick={save}><Save className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button></div></td>
    </tr>
  );
}

function MobileProposalLineCard({ line, editable, directoryEntries, onSave, onRemove }: {
  line: FinancialProposalLine;
  editable: boolean;
  directoryEntries: DirectoryEntry[];
  onSave: (line: FinancialProposalLine) => Promise<void>;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(line);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(line), [line]);
  const source = rowSource(draft);
  const markup = rowMarkup(draft);
  const clientValue = source + markup;
  const changed = JSON.stringify(draft) !== JSON.stringify(line);
  const patch = <K extends keyof FinancialProposalLine>(key: K, value: FinancialProposalLine[K]) => setDraft(current => ({ ...current, [key]: value }));
  const setLeadType = (leadType: FinancialProposalLine["lead_type"]) => setDraft(current => ({
    ...current,
    lead_type: leadType,
    lead_directory_entry_id: leadType === "apas" ? null : current.lead_directory_entry_id,
    category: leadType === "contractor" ? "subcontract" : leadType === "consultant" ? "other" : current.category,
  }));
  async function save() { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }

  const leadName = line.lead_type === "apas"
    ? "APAS internal"
    : (directoryEntries.find((entry) => entry.id === line.lead_directory_entry_id)
        ? directoryLabel(directoryEntries.find((entry) => entry.id === line.lead_directory_entry_id)!)
        : "Missing project directory entry");

  if (!editable) {
    return (
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">Line {line.line_no}</p>
            <p className="mt-1 text-sm font-semibold leading-snug">{line.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">{line.lead_type === "apas" ? "APAS" : line.lead_type} · {leadName}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold">{fmt(rowClientValue(line))}</p>
            <p className="text-[11px] text-muted-foreground">Markup {Number(line.markup_pct || 0)}%</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">Line {line.line_no}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!changed || saving} onClick={save} aria-label="Save proposal line"><Save className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remove proposal line"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="grid gap-3">
        <div><Label>Description</Label><Input className="mt-1 h-10 text-sm" value={draft.description} onChange={event => patch("description", event.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Lead</Label>
            <select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.lead_type} onChange={event => setLeadType(event.target.value as FinancialProposalLine["lead_type"])}>
              <option value="apas">APAS</option>
              <option value="contractor">Contractor</option>
              <option value="consultant">Consultant</option>
            </select>
          </div>
          <div>
            <Label>Markup</Label>
            <Input className="mt-1 h-10 text-right text-sm" type="number" step="any" value={draft.markup_pct} onChange={event => patch("markup_pct", Number(event.target.value))} />
          </div>
        </div>
        {draft.lead_type !== "apas" && (
          <div>
            <Label>Project team</Label>
            <select className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={draft.lead_directory_entry_id ?? ""} onChange={event => patch("lead_directory_entry_id", event.target.value || null)}>
              <option value="">Choose from project directory</option>
              {directoryEntries.map((entry) => <option key={entry.id} value={entry.id}>{directoryLabel(entry)}</option>)}
            </select>
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div><Label>Approved amount</Label><Input className="mt-1 h-10 text-right text-sm" type="number" step="any" value={draft.unit_cost} onChange={event => patch("unit_cost", Number(event.target.value))} /></div>
          <div className="rounded-md bg-muted/40 px-3 py-2 text-right">
            <p className="text-[11px] text-muted-foreground">Client value</p>
            <p className="font-mono text-sm font-semibold">{fmt(clientValue)}</p>
            {markup > 0 && <p className="text-[10px] text-[var(--apas-sapphire)]">profit {fmt(markup)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProposalBuilderPage() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(project?.client_id ?? undefined);
  const { data: directoryEntries = [] } = useProjectDirectory(projectId ?? null);
  const proposalQuery = useFinancialProposals(projectId ?? null);
  const proposal = proposalQuery.data?.find(item => item.id === proposalId) ?? null;
  const lineQuery = useFinancialProposalLines(proposalId ?? null);
  const lines = useMemo(() => lineQuery.data ?? [], [lineQuery.data]);
  const projectName = project?.name ?? "Project";
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState<Partial<FinancialProposal>>({});
  const [signOpen, setSignOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [renumberOpen, setRenumberOpen] = useState(false);
  const [hardcopyOpen, setHardcopyOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState("");
  const [newLine, setNewLine] = useState<Partial<FinancialProposalLine>>({
    category: "other",
    lead_type: "apas",
    lead_directory_entry_id: null,
    quantity: 1,
    unit: "ls",
    unit_cost: 0,
    markup_pct: 0,
  });
  const [pricingDraft, setPricingDraft] = useState({ overhead_pct: 10, profit_pct: 5 });
  const { data: role } = useCurrentUserRole();
  const canRenumber = isAdminRole(role);

  useEffect(() => {
    if (!proposal) return;
    setPricingDraft({
      overhead_pct: Number(proposal.overhead_pct ?? 10),
      profit_pct: Number(proposal.profit_pct ?? 5),
    });
  }, [proposal]);

  useEffect(() => {
    if (searchParams.get("sign") === "1" && proposal && !proposal.locked && lines.length > 0) {
      setSignOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("sign");
      setSearchParams(next, { replace: true });
    }
  }, [lines.length, proposal, searchParams, setSearchParams]);

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

  const totals = useMemo(() => proposalTotals(lines, pricingDraft), [lines, pricingDraft]);
  const editable = Boolean(proposal && !proposal.locked && proposal.status === "draft");
  const executed = proposal?.status === "approved" && Boolean(proposal.accepted_signed_at);
  const pricingChanged = Boolean(proposal && (
    Number(proposal.overhead_pct ?? 0) !== Number(pricingDraft.overhead_pct)
    || Number(proposal.profit_pct ?? 0) !== Number(pricingDraft.profit_pct)
  ));

  if (proposalQuery.isLoading) return <div className="p-6 text-muted-foreground">Loading proposal…</div>;
  if (!proposal) return <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-6 lg:px-8"><FinancialSubNav /><p className="text-muted-foreground">Proposal not found.</p></div>;

  function startEditDetails() { setDraft({ ...proposal }); setEditingDetails(true); }
  async function saveDetails() {
    if (!draft.title?.trim() || !draft.proposal_no?.trim()) return toast.error("Proposal number and title are required.");
    const nextNo = draft.proposal_no.trim();
    const duplicate = proposalQuery.data?.find(item => item.id !== proposal.id && item.proposal_no.trim().toLowerCase() === nextNo.toLowerCase());
    if (duplicate) return toast.error(`${nextNo} already exists on this project. Proposal numbers can be edited, but each displayed number must stay unique.`);
    try {
      await proposalQuery.update.mutateAsync({
        id: proposal.id, proposal_no: nextNo, title: draft.title, client_name: draft.client_name || null,
        client_email: draft.client_email || null, valid_until: draft.valid_until || null,
        notes: draft.notes || null, terms: draft.terms || null,
        scope_bullets: draft.scope_bullets ?? [], deliverables: draft.deliverables ?? [],
      });
      setEditingDetails(false); toast.success("Proposal details saved");
    } catch (error) { toast.error((error as Error).message); }
  }

  async function addLine() {
    if (!description.trim()) return toast.error("Description is required.");
    if (newLine.lead_type !== "apas" && !newLine.lead_directory_entry_id) {
      return toast.error("Choose the contractor or consultant from the project directory.");
    }
    const nextNo = lines.length ? Math.max(...lines.map(line => line.line_no)) + 1 : 1;
    await lineQuery.create.mutateAsync({
      proposal_id: proposal.id,
      description: description.trim(),
      line_no: nextNo,
      category: newLine.lead_type === "contractor" ? "subcontract" : newLine.category ?? "other",
      lead_type: newLine.lead_type ?? "apas",
      lead_directory_entry_id: newLine.lead_type === "apas" ? null : newLine.lead_directory_entry_id ?? null,
      quantity: 1,
      unit: "ls",
      unit_cost: Number(newLine.unit_cost) || 0,
      markup_pct: Number(newLine.markup_pct) || 0,
    });
    setDescription("");
    setNewLine({ category: "other", lead_type: "apas", lead_directory_entry_id: null, quantity: 1, unit: "ls", unit_cost: 0, markup_pct: 0 });
    toast.success("Line added");
  }

  async function applyExtractedValueRows(rows: ExtractedProposalValueLine[], mode: "replace" | "append") {
    if (!proposal) return;
    const cleaned = rows
      .map((row, index) => ({
        line_no: mode === "append" ? lines.length + index + 1 : index + 1,
        category: "other" as const,
        description: row.description.trim() || `Approved proposal value ${index + 1}`,
        quantity: 1,
        unit: "ls",
        unit_cost: Number(row.unit_cost) || 0,
        markup_pct: Number(row.markup_pct) || 0,
        lead_type: "apas" as const,
        lead_directory_entry_id: null,
      }))
      .filter((row) => row.unit_cost > 0);
    if (!cleaned.length) {
      toast.error("No usable dollar rows were found in the upload.");
      return;
    }

    if (mode === "replace") {
      await lineQuery.replaceAll.mutateAsync(cleaned);
      return;
    }

    for (const row of cleaned) {
      await lineQuery.create.mutateAsync({ ...row, proposal_id: proposal.id });
    }
  }

  async function saveLine(line: FinancialProposalLine) {
    if (line.lead_type !== "apas" && !line.lead_directory_entry_id) {
      toast.error("Choose the contractor or consultant from the project directory.");
      return;
    }
    await lineQuery.update.mutateAsync({
      id: line.id,
      category: line.lead_type === "contractor" ? "subcontract" : line.category,
      description: line.description,
      lead_type: line.lead_type,
      lead_directory_entry_id: line.lead_type === "apas" ? null : line.lead_directory_entry_id,
      quantity: 1,
      unit: "ls",
      unit_cost: Number(line.unit_cost),
      markup_pct: Number(line.markup_pct) || 0,
    });
    toast.success("Line updated");
  }

  async function savePricing() {
    if (!proposal) return;
    try {
      const overheadPct = Number(pricingDraft.overhead_pct) || 0;
      const profitPct = Number(pricingDraft.profit_pct) || 0;
      await proposalQuery.update.mutateAsync({
        id: proposal.id,
        overhead_pct: overheadPct,
        profit_pct: profitPct,
        // Kept only for older integrations; proposal math no longer reads it.
        markup_pct: overheadPct + profitPct,
      });
      toast.success("Overhead and profit saved");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  // AI produces a reviewable candidate. The author explicitly chooses whether
  // it replaces the current draft (change-order behavior) or is additive.
  async function applyDraft(draftResult: ProposalAiDraft, mode: "replace" | "append") {
    if (!proposal) return;
    const append = mode === "append";
    const nextOverhead = typeof draftResult.overhead_pct === "number" ? draftResult.overhead_pct : proposal.overhead_pct;
    const nextProfit = typeof draftResult.profit_pct === "number" ? draftResult.profit_pct : proposal.profit_pct;
    await proposalQuery.update.mutateAsync({
      id: proposal.id,
      title: append ? proposal.title : (draftResult.title || proposal.title),
      notes: append
        ? [proposal.notes, draftResult.overview].filter(Boolean).join("\n\n") || null
        : (draftResult.overview || proposal.notes),
      terms: append ? proposal.terms : (draftResult.terms || proposal.terms),
      scope_bullets: append
        ? [...(proposal.scope_bullets ?? []), ...(draftResult.scope_bullets ?? [])]
        : (draftResult.scope_bullets ?? proposal.scope_bullets),
      deliverables: append
        ? [...(proposal.deliverables ?? []), ...(draftResult.deliverables ?? [])]
        : (draftResult.deliverables ?? proposal.deliverables),
      overhead_pct: nextOverhead,
      profit_pct: nextProfit,
      markup_pct: Number(nextOverhead ?? 0) + Number(nextProfit ?? 0),
    });
    if (!append) {
      await lineQuery.replaceAll.mutateAsync((draftResult.lines ?? []).map((line, index) => ({
        line_no: index + 1,
        category: line.category,
        description: line.description,
        quantity: Number(line.quantity) || 0,
        unit: line.unit || "ls",
        unit_cost: Number(line.unit_cost) || 0,
        markup_pct: Number(line.markup_pct) || 0,
        lead_type: "apas",
        lead_directory_entry_id: null,
      })));
      return;
    }
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
        markup_pct: Number(line.markup_pct) || 0,
        lead_type: "apas",
        lead_directory_entry_id: null,
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
    if (!editable) {
      toast.error("Only draft proposals can be deleted. Use Amend for client-facing or approved proposal records.");
      return;
    }
    const message = `Delete draft ${proposal.proposal_no}? This cannot be undone.`;
    if (!window.confirm(message)) return;
    await proposalQuery.remove.mutateAsync(proposal.id);
    navigate(`/projects/${projectId}/financials/proposals`);
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["financial_proposals", projectId] });
    queryClient.invalidateQueries({ queryKey: ["financial_proposal_lines", proposalId] });
  };

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 px-3 py-4 sm:px-6 lg:px-8">
      <FinancialSubNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Link to={`/projects/${projectId}/financials/proposals`} className="mt-1"><ChevronLeft className="h-5 w-5 text-muted-foreground" /></Link>
          <div><div className="flex flex-wrap items-center gap-2"><FileText className="h-6 w-6 text-[var(--apas-sapphire)]" /><h1 className="text-2xl font-bold"><span className="mr-2 font-mono text-muted-foreground">{proposal.proposal_no}</span>{proposal.title}</h1><Badge className={statusClass(proposal.status)}>{proposal.status === "approved" ? "Approved" : proposal.status}</Badge>{proposal.locked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}{executed && <Badge className="bg-[var(--apas-amber)] text-[var(--apas-deep)]"><CheckCircle2 className="mr-1 h-3 w-3" />Executed</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{proposal.client_name || "No client assigned"} · {fmt(totals.total)}</p></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canRenumber && <Button variant="outline" size="sm" onClick={() => setRenumberOpen(true)}><Hash className="mr-1.5 h-4 w-4" />Edit number</Button>}
          {proposal.locked && <Button variant="outline" size="sm" onClick={() => setAmendOpen(true)}><RotateCcw className="mr-1.5 h-4 w-4" />Amend</Button>}
          <Button size="sm" onClick={() => setHardcopyOpen(true)}><FileCheck className="mr-1.5 h-4 w-4" />{executed ? "Replace executed PDF" : "Upload / execute signed proposal"}</Button>
          {executed && proposal.pdf_path
            ? <Button asChild variant="outline" size="sm"><a href={proposal.pdf_path} target="_blank" rel="noopener noreferrer"><FileDown className="mr-1.5 h-4 w-4" />Open executed PDF</a></Button>
            : <Button variant="outline" size="sm" onClick={downloadPdf} disabled={pdfBusy}><Download className="mr-1.5 h-4 w-4" />{pdfBusy ? "Preparing…" : "Download PDF"}</Button>}
          {executed && <Button asChild size="sm" className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90"><Link to={`/projects/${projectId}/financials/client-invoices?new=1&proposal=${proposal.id}`}><Receipt className="mr-1.5 h-4 w-4" />Create client invoice</Link></Button>}
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Stable record ID <span className="font-mono text-foreground">{proposal.id.slice(0, 8)}</span>. Proposal numbers can be edited with audit history; relationships, invoices, PDFs, and value lines stay attached to this record.
      </div>

      {proposal.status === "rejected" && proposal.client_comments && <div className="rounded-md border-l-2 border-red-500 bg-red-50 px-4 py-3"><p className="text-xs font-semibold text-red-700">Client requested a revision</p><p className="mt-1 text-sm">{proposal.client_comments}</p></div>}

      {proposal.signed_hardcopy_path && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--apas-amber)]/35 bg-[var(--apas-amber)]/10 p-3">
          <div className="flex items-center gap-2 text-sm"><FileCheck className="h-4 w-4 text-[var(--apas-amber)]" /><span className="font-medium">Executed client-signed proposal on file</span>{proposal.signed_hardcopy_at && <span className="text-xs text-muted-foreground">· uploaded {new Date(proposal.signed_hardcopy_at).toLocaleDateString()}</span>}</div>
          <Button asChild variant="outline" size="sm"><a href={proposal.pdf_path || proposal.signed_hardcopy_path} target="_blank" rel="noopener noreferrer"><FileDown className="mr-1.5 h-4 w-4" />Open primary PDF</a></Button>
          {proposal.signed_hardcopy_note && <p className="w-full text-xs text-muted-foreground">{proposal.signed_hardcopy_note}</p>}
        </div>
      )}

      <Card className="border-[var(--apas-sapphire)]/25 bg-[var(--apas-sapphire)]/[0.03]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Step 1 · Executed proposal intake</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                This is the place to record a client-approved proposal before anyone creates an invoice. The signed PDF stays untouched. The value rows below are typed by your team and become the billing authority for client invoices and contractor or consultant bills.
              </p>
            </div>
            {executed ? <Badge className="bg-[var(--apas-amber)] text-[var(--apas-deep)]">Ready for invoicing</Badge> : <Badge variant="outline">Invoice prerequisite</Badge>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
          <div className="rounded-lg border bg-background p-3">
            <AttachmentField
              url={proposal.pdf_path}
              onChange={(pdf_path) => proposalQuery.update.mutateAsync({ id: proposal.id, pdf_path })}
              projectId={projectId!}
              folder="proposals/source"
              label={executed ? "Approved proposal PDF" : "Signed source proposal"}
              preview={false}
              readOnly={!editable}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Uploads are source records, not AI writing prompts. When the client signs, use <span className="font-medium text-foreground">Execute signed proposal</span> so the signed PDF becomes the approved record and the invoice builder unlocks.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["1", "Upload", "Attach the final client-signed proposal or approved pricing package."],
              ["2", "Project team", "Make sure every contractor and consultant exists in the project directory."],
              ["3", "Type values", "Enter one row per approved billing bucket, including markup or pass-through."],
              ["4", "Approve", "Execute the signed proposal so invoices can bill against approved rows only."],
            ].map(([no, title, copy]) => (
              <div key={title} className="rounded-lg border bg-white/80 p-3">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--apas-sapphire)] text-xs font-bold text-white">{no}</div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <FinancialProposalWorkflow proposal={proposal} />

      <ResizableWorkspace
        className="items-start gap-6"
        defaultPrimarySize={56}
        defaultSecondarySize={44}
        minPrimarySize={36}
        minSecondarySize={32}
        storageId="proposal-builder-workspace"
      >
      <div className="space-y-6">
      {editingDetails && (
        <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Edit proposal details</CardTitle><div className="flex gap-2"><Button variant="outline" onClick={() => setEditingDetails(false)}>Cancel</Button><Button onClick={saveDetails} disabled={proposalQuery.update.isPending}><Save className="mr-1.5 h-4 w-4" />Save</Button></div></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Proposal #</Label><Input value={draft.proposal_no || ""} onChange={event => setDraft(current => ({ ...current, proposal_no: event.target.value }))} /></div><div><Label>Title</Label><Input value={draft.title || ""} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} /></div>
          <div><Label>Client</Label><Input value={draft.client_name || ""} onChange={event => setDraft(current => ({ ...current, client_name: event.target.value }))} /></div><div><Label>Email</Label><Input type="email" value={draft.client_email || ""} onChange={event => setDraft(current => ({ ...current, client_email: event.target.value }))} /></div>
          <div><Label>Valid until</Label><Input type="date" value={draft.valid_until || ""} onChange={event => setDraft(current => ({ ...current, valid_until: event.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Overview</Label><VoiceDictationTextareaWithAI rows={5} context="notes" value={draft.notes || ""} onValueChange={value => setDraft(current => ({ ...current, notes: value }))} /></div>
          <div className="md:col-span-2"><Label>Scope of services <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={4} context="notes" value={(draft.scope_bullets ?? []).join("\n")} onValueChange={value => setDraft(current => ({ ...current, scope_bullets: value.split("\n").map(line => line.trim()).filter(Boolean) }))} /></div>
          <div className="md:col-span-2"><Label>Deliverables <span className="text-xs text-muted-foreground">(one per line)</span></Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={(draft.deliverables ?? []).join("\n")} onValueChange={value => setDraft(current => ({ ...current, deliverables: value.split("\n").map(line => line.trim()).filter(Boolean) }))} /></div>
          <div className="md:col-span-2"><Label>Terms</Label><VoiceDictationTextareaWithAI rows={3} context="notes" value={draft.terms || ""} onValueChange={value => setDraft(current => ({ ...current, terms: value }))} /></div>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><CardTitle className="text-base">Pricing calculation</CardTitle><p className="mt-1 text-xs text-muted-foreground">Same math as change orders: enter overhead and profit percentages once. The dollar amounts calculate automatically and are not line items.</p></div>
            {editable && <Button size="sm" onClick={savePricing} disabled={!pricingChanged || proposalQuery.update.isPending}><Save className="mr-1.5 h-4 w-4" />Save pricing</Button>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[1fr_1fr_1.4fr]">
          <div><Label>Overhead %</Label><Input type="number" min="0" step="any" value={pricingDraft.overhead_pct} disabled={!editable} onChange={event => setPricingDraft(current => ({ ...current, overhead_pct: Number(event.target.value) }))} /></div>
          <div><Label>Profit %</Label><Input type="number" min="0" step="any" value={pricingDraft.profit_pct} disabled={!editable} onChange={event => setPricingDraft(current => ({ ...current, profit_pct: Number(event.target.value) }))} /><p className="mt-1 text-[11px] text-muted-foreground">Enter 0 to waive profit.</p></div>
          <div className="space-y-1.5 rounded-md border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Source cost subtotal</span><span className="font-mono">{fmt(totals.sourceSubtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>APAS row markup</span><span className="font-mono text-[var(--apas-sapphire)]">{fmt(totals.lineMarkup)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Overhead ({pricingDraft.overhead_pct || 0}%)</span><span className="font-mono">{fmt(totals.overhead)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Profit ({pricingDraft.profit_pct || 0}%)</span><span className="font-mono">{fmt(totals.profit)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Total APAS profit</span><span className="font-mono text-[var(--apas-sapphire)]">{fmt(totals.apasProfit)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold text-[var(--apas-sapphire)]"><span>Proposal total</span><span className="font-mono text-base">{fmt(totals.total)}</span></div>
          </div>
        </CardContent>
      </Card>

      {editable && (
        <ProposalAiDraftCard
          projectId={projectId!}
          defaultOverhead={proposal.overhead_pct ?? 10}
          defaultProfit={proposal.profit_pct ?? 5}
          disabled={proposalQuery.update.isPending || lineQuery.create.isPending}
          onApply={applyDraft}
          hasExistingContent={Boolean(lines.length || proposal.notes || proposal.scope_bullets?.length || proposal.deliverables?.length)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved proposal value lines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Enter each billable bucket that the client approved. Contractor and consultant names come from the project directory, so billing, vendor payments, and APAS profit stay tied to the right company. The invoice builder caps billing against these approved values.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-3 p-3 md:hidden">
            {lines.map(line => (
              <MobileProposalLineCard
                key={line.id}
                line={line}
                editable={editable}
                directoryEntries={directoryEntries}
                onSave={saveLine}
                onRemove={() => lineQuery.remove.mutate(line.id)}
              />
            ))}
            {editable && (
              <div className="rounded-lg border border-dashed bg-muted/20 p-3">
                <p className="mb-3 text-sm font-semibold">Add approved value line</p>
                <div className="grid gap-3">
                  <div><Label>Description</Label><Input className="mt-1 h-10" value={description} onChange={event => setDescription(event.target.value)} placeholder="Approved line item description" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Lead</Label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                        value={newLine.lead_type ?? "apas"}
                        onChange={event => setNewLine(current => ({
                          ...current,
                          lead_type: event.target.value as FinancialProposalLine["lead_type"],
                          lead_directory_entry_id: event.target.value === "apas" ? null : current.lead_directory_entry_id ?? null,
                          category: event.target.value === "contractor" ? "subcontract" : current.category ?? "other",
                        }))}
                      >
                        <option value="apas">APAS</option>
                        <option value="contractor">Contractor</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </div>
                    <div><Label>Markup</Label><Input className="mt-1 h-10 text-right" type="number" value={newLine.markup_pct} onChange={event => setNewLine(current => ({ ...current, markup_pct: Number(event.target.value) }))} /></div>
                  </div>
                  {(newLine.lead_type ?? "apas") !== "apas" && (
                    <div>
                      <Label>Project team</Label>
                      <select
                        className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm"
                        value={newLine.lead_directory_entry_id ?? ""}
                        onChange={event => setNewLine(current => ({ ...current, lead_directory_entry_id: event.target.value || null }))}
                      >
                        <option value="">Choose from project directory</option>
                        {directoryEntries.map((entry) => <option key={entry.id} value={entry.id}>{directoryLabel(entry)}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <div><Label>Approved amount</Label><Input className="mt-1 h-10 text-right" type="number" value={newLine.unit_cost} onChange={event => setNewLine(current => ({ ...current, unit_cost: Number(event.target.value) }))} /></div>
                    <Button className="h-10" onClick={addLine} disabled={lineQuery.create.isPending}><Plus className="mr-1.5 h-4 w-4" />Add</Button>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Source cost subtotal</span><span className="font-mono">{fmt(totals.sourceSubtotal)}</span></div>
              <div className="mt-1 flex justify-between text-muted-foreground"><span>APAS row markup</span><span className="font-mono text-[var(--apas-sapphire)]">{fmt(totals.lineMarkup)}</span></div>
              <div className="mt-2 flex justify-between border-t pt-2 font-bold text-[var(--apas-sapphire)]"><span>Grand total</span><span className="font-mono">{fmt(totals.total)}</span></div>
            </div>
          </div>
          <div className="hidden min-w-0 md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[30%]" />
                <col className="w-[13%]" />
                <col className="w-[21%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[72px]" />
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-left">Lead</th>
                  <th className="p-3 text-left">Project team</th>
                  <th className="p-3 text-right">Approved amount</th>
                  <th className="p-3 text-right">Markup</th>
                  <th className="p-3 text-right">Client value</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <EditableProposalLine
                    key={line.id}
                    line={line}
                    editable={editable}
                    directoryEntries={directoryEntries}
                    onSave={saveLine}
                    onRemove={() => lineQuery.remove.mutate(line.id)}
                  />
                ))}
                {editable && (
                  <tr className="border-t-2 bg-muted/10">
                    <td className="p-2 text-xs text-muted-foreground">{lines.length + 1}</td>
                    <td className="p-2">
                      <Input className="h-8 w-full min-w-0 text-xs" value={description} onChange={event => setDescription(event.target.value)} placeholder="Approved line item description" />
                    </td>
                    <td className="p-2">
                      <select
                          className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                        value={newLine.lead_type ?? "apas"}
                        onChange={event => setNewLine(current => ({
                          ...current,
                          lead_type: event.target.value as FinancialProposalLine["lead_type"],
                          lead_directory_entry_id: event.target.value === "apas" ? null : current.lead_directory_entry_id ?? null,
                          category: event.target.value === "contractor" ? "subcontract" : current.category ?? "other",
                        }))}
                      >
                        <option value="apas">APAS</option>
                        <option value="contractor">Contractor</option>
                        <option value="consultant">Consultant</option>
                      </select>
                    </td>
                    <td className="p-2">
                      {(newLine.lead_type ?? "apas") === "apas" ? (
                        <span className="inline-flex h-8 items-center rounded-md border bg-muted/40 px-2 text-xs font-medium">APAS internal</span>
                      ) : (
                        <select
                          className="h-8 w-full min-w-0 rounded-md border bg-background px-2 text-xs"
                          value={newLine.lead_directory_entry_id ?? ""}
                          onChange={event => setNewLine(current => ({ ...current, lead_directory_entry_id: event.target.value || null }))}
                        >
                          <option value="">Choose from project directory</option>
                          {directoryEntries.map((entry) => <option key={entry.id} value={entry.id}>{directoryLabel(entry)}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="p-2"><Input className="h-8 w-full min-w-0 text-right text-xs" type="number" value={newLine.unit_cost} onChange={event => setNewLine(current => ({ ...current, unit_cost: Number(event.target.value) }))} /></td>
                    <td className="p-2"><Input className="h-8 w-full min-w-0 text-right text-xs" type="number" value={newLine.markup_pct} onChange={event => setNewLine(current => ({ ...current, markup_pct: Number(event.target.value) }))} /></td>
                    <td className="p-2 text-right text-xs text-muted-foreground">{fmt(rowClientValue({ quantity: 1, unit_cost: Number(newLine.unit_cost) || 0, markup_pct: Number(newLine.markup_pct) || 0 } as FinancialProposalLine))}</td>
                    <td className="p-2"><Button size="icon" className="h-8 w-8" onClick={addLine} disabled={lineQuery.create.isPending}><Plus className="h-4 w-4" /></Button></td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/50"><td colSpan={6} className="p-3 text-right">Source cost subtotal</td><td className="p-3 text-right font-mono">{fmt(totals.sourceSubtotal)}</td><td /></tr>
                <tr className="bg-muted/50"><td colSpan={6} className="p-3 text-right">APAS row markup</td><td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totals.lineMarkup)}</td><td /></tr>
                <tr className="border-t bg-muted/60 font-bold"><td colSpan={6} className="p-3 text-right">Grand total</td><td className="p-3 text-right font-mono text-base">{fmt(totals.total)}</td><td /></tr>
              </tfoot>
            </table>
          </div>
          {directoryEntries.length === 0 && editable && (
            <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">Need a contractor or consultant?</p>
              <p className="mt-1 text-xs leading-5">Add them to the project directory first, then come back and choose them from the dropdown. This avoids misspelled vendors and orphan bills.</p>
              <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 bg-white text-amber-950 hover:bg-amber-100">
                <Link to={`/projects/${projectId}/directory`}>Open project directory</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      </div>
      <div className="space-y-6">
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>{executed ? "Executed proposal document" : "Proposal document"}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{executed ? "The final client-signed PDF below is the primary document of record." : proposal.submitted_signed_at ? `Signed by APAS ${new Date(proposal.submitted_signed_at).toLocaleDateString()}.` : "Review the document, then sign to lock this version."}</p></div><div className="flex gap-2">{proposal.locked && <Badge variant="outline"><Lock className="mr-1 h-3 w-3" />{executed ? "Executed & locked" : "Signed version"}</Badge>}</div></div></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {editable && <Button variant="outline" onClick={startEditDetails}><Pencil className="mr-1.5 h-4 w-4" />Edit proposal</Button>}
          {editable && <Button onClick={() => setSignOpen(true)} disabled={lines.length === 0}><PenLine className="mr-1.5 h-4 w-4" />Sign &amp; lock</Button>}
          {proposal.locked && !proposal.accepted_signed_at && <Button onClick={() => setSendOpen(true)}><Send className="mr-1.5 h-4 w-4" />{proposal.sent_to_client_at ? "Re-send to client" : "Send to client"}</Button>}
          {executed && proposal.pdf_path
            ? <Button asChild variant="outline"><a href={proposal.pdf_path} target="_blank" rel="noopener noreferrer"><FileDown className="mr-1.5 h-4 w-4" />Open executed PDF</a></Button>
            : <Button variant="outline" onClick={downloadPdf} disabled={pdfBusy}><Download className="mr-1.5 h-4 w-4" />{pdfBusy ? "Preparing…" : "Download PDF"}</Button>}
        </div>
        {proposal.pdf_path
          ? <iframe src={proposal.pdf_path} title={`${proposal.proposal_no} ${executed ? "executed" : "uploaded"} proposal`} className="h-[760px] w-full rounded-md border bg-white" />
          : <div className="max-h-[760px] overflow-auto rounded-md border bg-muted/30 p-3"><FinancialProposalDocument ref={previewRef} proposal={proposal} lines={lines} projectName={projectName} client={client} /></div>}
      </CardContent></Card>

      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">Record controls</p><p className="text-sm text-muted-foreground">Signed proposals remain locked. Amend creates an auditable editable version; Edit number changes only the displayed proposal number.</p></div>{editable ? <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={removeProposal} disabled={proposalQuery.remove.isPending}><Trash2 className="mr-1.5 h-4 w-4" />Delete draft</Button> : <Badge variant="outline">Preserved record</Badge>}</CardContent></Card>
      </div>
      </ResizableWorkspace>

      <FinancialProposalSignDialog open={signOpen} onOpenChange={setSignOpen} proposal={proposal} lines={lines} projectName={projectName} client={client} onSigned={refresh} />
      <SendFinancialProposalDialog open={sendOpen} onOpenChange={setSendOpen} proposal={proposal} lines={lines} projectName={projectName} client={client} onSent={refresh} />
      <AmendFinancialProposalDialog open={amendOpen} onOpenChange={setAmendOpen} proposal={proposal} reopen={proposalQuery.reopen} onDone={refresh} />
      <RenumberFinancialProposalDialog open={renumberOpen} onOpenChange={setRenumberOpen} proposal={proposal} action={proposalQuery.renumber} onDone={refresh} />
      <UploadFinancialProposalHardcopyDialog open={hardcopyOpen} onOpenChange={setHardcopyOpen} proposal={proposal} projectId={projectId!} action={proposalQuery.uploadHardcopy} onExtractedRows={applyExtractedValueRows} onDone={refresh} />
    </div>
  );
}
