import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFinancialProposals, FinancialProposal } from "@/hooks/useFinancialProposals";
import { useProjectIssues } from "@/hooks/useProjectIssues";
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
import { FileText, Plus, ExternalLink, CheckCircle2, Clock, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<FinancialProposal["status"], { label: string; className: string; icon: React.ElementType }> = {
  draft:    { label: "Draft",    className: "bg-gray-100 text-gray-700",    icon: FileText },
  sent:     { label: "Sent",     className: "bg-blue-100 text-blue-800",    icon: Send },
  approved: { label: "Approved", className: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800",      icon: XCircle },
  expired:  { label: "Expired",  className: "bg-amber-100 text-amber-800",  icon: Clock },
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProposalsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: proposals = [], isLoading, create } = useFinancialProposals(projectId ?? null);
  const { data: issues = [] } = useProjectIssues(projectId ?? null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<FinancialProposal>>({ markup_pct: 10 });

  const draftCount    = proposals.filter(p => p.status === "draft").length;
  const sentCount     = proposals.filter(p => p.status === "sent").length;
  const approvedCount = proposals.filter(p => p.status === "approved").length;

  async function handleCreate() {
    if (!form.title?.trim() || !form.proposal_no?.trim()) {
      toast.error("Proposal number and title are required");
      return;
    }
    const created = await create.mutateAsync({
      project_id: projectId!,
      title: form.title!,
      proposal_no: form.proposal_no!,
      client_name: form.client_name ?? null,
      client_email: form.client_email ?? null,
      valid_until: form.valid_until ?? null,
      markup_pct: form.markup_pct ?? 10,
      notes: form.notes ?? null,
      source_issue_id: form.source_issue_id ?? null,
      terms: "Net 30. All work per applicable codes and standards.",
    });
    setShowCreate(false);
    setForm({ markup_pct: 10 });
    toast.success("Proposal created");
    // Navigate to builder
    window.location.href = `/projects/${projectId}/financials/proposals/${created.id}`;
  }

  const nextNo = `PROP-${String(proposals.length + 1).padStart(3, "0")}`;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <FileText className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Proposals & Quotes</h1>
            <p className="text-muted-foreground text-sm">Estimates, scope proposals, and client quotes</p>
          </div>
        </div>
        <Button onClick={() => { setForm({ markup_pct: 10, proposal_no: nextNo }); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Proposal
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Draft", value: draftCount,    color: "text-muted-foreground" },
          { label: "Sent",  value: sentCount,     color: "text-blue-600" },
          { label: "Approved", value: approvedCount, color: "text-emerald-600" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Proposals List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Proposals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : proposals.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground text-center">
              No proposals yet. Click "New Proposal" to create your first estimate or quote.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3">Proposal #</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Client</th>
                    <th className="text-center p-3">Valid Until</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Created</th>
                    <th className="text-center p-3">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map(p => {
                    const sc = STATUS_CONFIG[p.status];
                    const Icon = sc.icon;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-mono font-medium">{p.proposal_no}</td>
                        <td className="p-3">{p.title}</td>
                        <td className="p-3 text-muted-foreground">{p.client_name ?? "—"}</td>
                        <td className="p-3 text-center text-muted-foreground text-xs">{fmtDate(p.valid_until)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                            <Icon className="h-3 w-3" />{sc.label}
                          </span>
                        </td>
                        <td className="p-3 text-center text-muted-foreground text-xs">{fmtDate(p.created_at)}</td>
                        <td className="p-3 text-center">
                          <Link to={`/projects/${projectId}/financials/proposals/${p.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proposal # *</Label>
                <Input
                  value={form.proposal_no ?? ""}
                  onChange={e => setForm(f => ({ ...f, proposal_no: e.target.value }))}
                />
              </div>
              <div>
                <Label>Default Markup %</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.markup_pct ?? 10}
                  onChange={e => setForm(f => ({ ...f, markup_pct: parseFloat(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Concrete Demolition Scope Proposal"
                value={form.title ?? ""}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
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
