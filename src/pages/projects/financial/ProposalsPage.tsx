import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useFinancialProposals, FinancialProposal } from "@/hooks/useFinancialProposals";
import { useProjectIssues } from "@/hooks/useProjectIssues";
import { useProject } from "@/hooks/useProjects";
import { useClient } from "@/hooks/useClients";
import { useCoSettings } from "@/hooks/useCoSettings";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, ExternalLink, CheckCircle2, Clock, Send, XCircle, Sparkles, Trash2, Search, Paperclip, Receipt, UploadCloud, Wand2, Lock } from "lucide-react";
import { toast } from "sonner";
import { proposalTotals } from "@/lib/financial/proposalPricing";

function fmtMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

const STATUS_CONFIG: Record<FinancialProposal["status"], { label: string; className: string; icon: React.ElementType }> = {
  draft:    { label: "Draft",    className: "bg-gray-100 text-gray-700",    icon: FileText },
  sent:     { label: "Sent",     className: "bg-blue-100 text-blue-800",    icon: Send },
  approved: { label: "Approved", className: "bg-[var(--apas-sapphire)]/15 text-[var(--apas-sapphire)]",  icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800",      icon: XCircle },
  expired:  { label: "Expired",  className: "bg-amber-100 text-amber-800",  icon: Clock },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d.includes("T") ? d : `${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProposalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: proposals = [], isLoading, create, remove } = useFinancialProposals(projectId ?? null);
  const { data: issues = [] } = useProjectIssues(projectId ?? null);
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(project?.client_id ?? undefined);
  const { data: coSettings } = useCoSettings();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<FinancialProposal>>({ overhead_pct: 10, profit_pct: 5 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const draftCount    = proposals.filter(p => p.status === "draft").length;
  const sentCount     = proposals.filter(p => p.status === "sent").length;
  const approvedCount = proposals.filter(p => p.status === "approved").length;
  const pipelineValue = proposals.filter(p => ["draft", "sent"].includes(p.status))
    .reduce((sum, proposal) => sum + proposalTotals(proposal.proposal_lines ?? [], proposal).total, 0);
  const approvedValue = proposals.filter(p => p.status === "approved")
    .reduce((sum, proposal) => sum + proposalTotals(proposal.proposal_lines ?? [], proposal).total, 0);
  const filteredProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter(proposal => {
      const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
      const matchesSearch = !q || [proposal.proposal_no, proposal.title, proposal.client_name, proposal.client_email]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [proposals, search, statusFilter]);

  async function handleCreate() {
    if (!form.title?.trim() || !form.proposal_no?.trim()) {
      toast.error("Proposal number and title are required");
      return;
    }
    const proposedNo = form.proposal_no.trim();
    const duplicate = proposals.find(proposal => proposal.proposal_no.trim().toLowerCase() === proposedNo.toLowerCase());
    if (duplicate) {
      toast.error(`${proposedNo} already exists on this project. Open the existing record or choose a unique proposal number.`);
      return;
    }
    const created = await create.mutateAsync({
      project_id: projectId!,
      title: form.title!,
      proposal_no: proposedNo,
      client_name: form.client_name ?? null,
      client_email: form.client_email ?? null,
      valid_until: form.valid_until ?? null,
      overhead_pct: form.overhead_pct ?? 10,
      profit_pct: form.profit_pct ?? 5,
      markup_pct: Number(form.overhead_pct ?? 10) + Number(form.profit_pct ?? 5),
      notes: form.notes ?? null,
      source_issue_id: form.source_issue_id ?? null,
      terms: "Net 30. All work per applicable codes and standards.",
    });
    setShowCreate(false);
    setForm({ overhead_pct: Number(coSettings?.default_overhead_pct ?? 10), profit_pct: Number(coSettings?.default_profit_pct ?? 5) });
    toast.success("Proposal created");
    // Navigate to builder
    window.location.href = `/projects/${projectId}/financials/proposals/${created.id}`;
  }

  async function handleDelete(proposal: FinancialProposal) {
    if (proposal.locked || proposal.status !== "draft") {
      toast.error("Only draft proposals can be deleted. Use the builder to amend, edit the number, or preserve the signed record.");
      return;
    }
    const message = `Delete draft ${proposal.proposal_no}? This cannot be undone.`;
    if (!window.confirm(message)) return;
    try {
      await remove.mutateAsync(proposal.id);
      toast.success(`${proposal.proposal_no} deleted`);
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 px-3 py-4 sm:px-6 lg:px-8">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <FileText className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Client Proposals</h1>
            <p className="text-muted-foreground text-sm">Draft, price, sign, deliver, revise, and secure client approval in one controlled workflow.</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <Button variant="outline" className="w-full" onClick={() => navigate(`/projects/${projectId}/financials/proposals/new?mode=scratch`)}>
            <Wand2 className="h-4 w-4 mr-2" /> Write from scratch
          </Button>
          <Button className="w-full" onClick={() => navigate(`/projects/${projectId}/financials/proposals/new?mode=upload`)}>
            <UploadCloud className="h-4 w-4 mr-2" /> Upload signed proposal
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Proposals", value: proposals.length, sub: `${draftCount} draft`, color: "text-foreground" },
          { label: "Awaiting Client",  value: sentCount, sub: "sent for decision", color: "text-blue-600" },
          { label: "Approved", value: fmtMoney(approvedValue), sub: `${approvedCount} accepted`, color: "text-[var(--apas-sapphire)]" },
          { label: "Active Pipeline", value: fmtMoney(pipelineValue), sub: "draft + sent", color: "text-[var(--apas-sapphire)]" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[var(--apas-sapphire)]/25 bg-[var(--apas-sapphire)]/[0.03]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Proposal intake to invoice path</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Build or record the approved client proposal first, then invoice against the approved value lines so billing cannot drift from the signed amount.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate(`/projects/${projectId}/financials/proposals/new?mode=scratch`)}>
                <Wand2 className="mr-2 h-4 w-4" /> Write from scratch
              </Button>
              <Button onClick={() => navigate(`/projects/${projectId}/financials/proposals/new?mode=upload`)}>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload signed proposal
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-4">
          {[
            {
              icon: FileText,
              title: "1. Capture the proposal",
              copy: "Create from scratch with AI, or upload the executed client proposal as the permanent source record.",
            },
            {
              icon: Sparkles,
              title: "2. Type approved values",
              copy: "For uploaded proposals, do not use AI. Type each approved value line, select APAS, contractor, or consultant, and choose non-APAS leads from the project directory.",
            },
            {
              icon: CheckCircle2,
              title: "3. Execute and approve",
              copy: "Mark the signed PDF approved, keep it as the primary record, and lock the proposal total as billing authority.",
            },
            {
              icon: Receipt,
              title: "4. Create the invoice",
              copy: "Bill a percent, a typed amount, or the remaining approved balance without exceeding the proposal ceiling.",
            },
          ].map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-lg border bg-background p-3">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.copy}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Proposals List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Proposal Log</CardTitle>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <div className="relative min-w-0 flex-1 sm:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="h-9 pl-8" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search proposals…" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(STATUS_CONFIG).map(([value, config]) => <SelectItem key={value} value={value}>{config.label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : proposals.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground text-center">
              No proposals yet. Click "New Proposal" to create your first estimate or quote.
            </p>
          ) : filteredProposals.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No proposals match this search or status.</p>
          ) : (
            <>
            <div className="grid gap-3 p-3 md:hidden">
              {filteredProposals.map(p => {
                const sc = STATUS_CONFIG[p.status];
                const Icon = sc.icon;
                const amount = proposalTotals(p.proposal_lines ?? [], p).total;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="rounded-lg border bg-card p-3 text-left shadow-sm active:bg-muted/40"
                    onClick={() => navigate(`/projects/${projectId}/financials/proposals/${p.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-muted-foreground">{p.proposal_no}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">{p.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.client_name ?? "No client assigned"}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${sc.className}`}>
                        <Icon className="h-3 w-3" />
                        {p.status === "approved" && p.accepted_signed_at ? "Executed" : sc.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-muted/40 p-2">
                        <span className="block text-muted-foreground">Amount</span>
                        <span className="font-mono font-semibold">{fmtMoney(amount)}</span>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2">
                        <span className="block text-muted-foreground">Valid until</span>
                        <span className="font-medium">{fmtDate(p.valid_until)}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.status === "approved" && (
                        <Button
                          size="sm"
                          className="h-9 flex-1 bg-[var(--apas-sapphire)] text-white hover:bg-[var(--apas-sapphire)]/90"
                          onClick={event => { event.stopPropagation(); navigate(`/projects/${projectId}/financials/client-invoices?new=1&proposal=${p.id}`); }}
                        >
                          <Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoice
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 flex-1"
                        onClick={event => { event.stopPropagation(); navigate(`/projects/${projectId}/financials/proposals/${p.id}`); }}
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                      </Button>
                    </div>
                  </button>
                );
              })}
              <div className="rounded-lg border bg-muted/30 p-3 text-right text-sm font-semibold">
                Total approved <span className="font-mono text-[var(--apas-sapphire)]">{fmtMoney(approvedValue)}</span>
              </div>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3">Proposal #</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Client</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-center p-3">Valid Until</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Created</th>
                    <th className="text-center p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map(p => {
                    const sc = STATUS_CONFIG[p.status];
                    const Icon = sc.icon;
                    const amount = proposalTotals(p.proposal_lines ?? [], p).total;
                    return (
                      <tr key={p.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/20" onClick={() => navigate(`/projects/${projectId}/financials/proposals/${p.id}`)}>
                        <td className="p-3 font-mono font-medium"><div>{p.proposal_no}</div>{Number(p.revision_no ?? 0) > 0 && <div className="mt-0.5 text-[10px] font-sans text-muted-foreground">Revision {p.revision_no}</div>}</td>
                        <td className="p-3"><div>{p.title}</div>{p.client_comments && p.status === "rejected" && <div className="mt-0.5 max-w-xs truncate text-xs text-red-600">Revision requested: {p.client_comments}</div>}</td>
                        <td className="p-3 text-muted-foreground">{p.client_name ?? "—"}</td>
                        <td className="p-3 text-right font-mono font-medium">{fmtMoney(amount)}</td>
                        <td className="p-3 text-center text-muted-foreground text-xs">{fmtDate(p.valid_until)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                            <Icon className="h-3 w-3" />{p.status === "approved" && p.accepted_signed_at ? "Approved · Executed" : p.locked && p.status === "draft" ? "Signed · Ready" : sc.label}
                          </span>
                        </td>
                        <td className="p-3 text-center text-muted-foreground text-xs">{fmtDate(p.created_at)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.status === "approved" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-[var(--apas-sapphire)]"
                                title="Create client invoice"
                                onClick={event => { event.stopPropagation(); navigate(`/projects/${projectId}/financials/client-invoices?new=1&proposal=${p.id}`); }}
                              >
                                <Receipt className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(p.pdf_path || p.signed_hardcopy_path) && <a href={p.pdf_path || p.signed_hardcopy_path || "#"} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} title="Open primary proposal PDF"><Paperclip className="h-3.5 w-3.5 text-[var(--apas-sapphire)]" /></a>}
                            <Link to={`/projects/${projectId}/financials/proposals/${p.id}`} onClick={event => event.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Open">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            {p.status === "draft" && !p.locked ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete draft proposal"
                                disabled={remove.isPending}
                                onClick={event => { event.stopPropagation(); handleDelete(p); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span title="Preserved proposal record"><Lock className="h-3.5 w-3.5 text-muted-foreground" /></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="border-t bg-muted/60 font-bold"><td colSpan={3} className="p-3 text-right">Total Approved</td><td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmtMoney(approvedValue)}</td><td colSpan={4} /></tr></tfoot>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card><CardContent className="space-y-1.5 p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">How proposals work here</p><p>A proposal remains an editable draft until APAS signs it. Signing locks the commercial scope and fee, then the same record is sent or re-sent to the assigned client for electronic acceptance.</p><p>If the client requests changes, <strong>Amend</strong> creates the next auditable revision. If the client signs outside the system, record the offline approval and retain the signed PDF with the same proposal record.</p></CardContent></Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
                <Label>Proposal # *</Label>
                <Input
                  value={form.proposal_no ?? ""}
                  onChange={e => setForm(f => ({ ...f, proposal_no: e.target.value }))}
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Overhead %</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.overhead_pct ?? 10}
                  onChange={e => setForm(f => ({ ...f, overhead_pct: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Profit %</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.profit_pct ?? 5}
                  onChange={e => setForm(f => ({ ...f, profit_pct: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Both percentages calculate from the cost-of-work subtotal. They are not proposal line items.</p>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Concrete Demolition Scope Proposal"
                value={form.title ?? ""}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            {client && (
              <p className="text-xs text-muted-foreground">
                Auto-filled from this project's client <span className="font-medium text-foreground">{client.name}</span>. Edit if needed.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Client Name</Label>
                <Input
                  placeholder="Client or company name"
                  value={form.client_name ?? ""}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Client Email</Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={form.client_email ?? ""}
                  onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={form.valid_until ?? ""}
                  onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
              <div>
                <Label>Linked Issue (optional)</Label>
                <Select
                  value={form.source_issue_id ?? "__none__"}
                  onValueChange={v => setForm(f => ({ ...f, source_issue_id: v === "__none__" ? undefined : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {issues.filter(i => i.status !== "closed").map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes to include in the proposal…"
                rows={2}
                value={form.notes ?? ""}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create & Open Builder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
