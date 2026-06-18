import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFinancialProposals, useFinancialProposalLines, FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateProposalPdf } from "@/lib/pdf/proposalPdf";
import { FileText, Plus, Trash2, Download, ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: FinancialProposalLine["category"][] = ["labor", "material", "equipment", "subcontract", "other"];

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}

const STATUS_NEXT: Record<string, { label: string; next: string }> = {
  draft:    { label: "Mark as Sent",     next: "sent" },
  sent:     { label: "Mark as Approved", next: "approved" },
  approved: { label: "Approved",         next: "" },
  rejected: { label: "Rejected",         next: "" },
  expired:  { label: "Expired",          next: "" },
};

export default function ProposalBuilderPage() {
  const { projectId, proposalId } = useParams<{ projectId: string; proposalId: string }>();
  const { data: proposals = [], update: updateProposal } = useFinancialProposals(projectId ?? null);
  const proposal = proposals.find(p => p.id === proposalId) ?? null;
  const { data: lines = [], create, remove, update: updateLine } = useFinancialProposalLines(proposalId ?? null);

  const [newLine, setNewLine] = useState<Partial<FinancialProposalLine>>({
    category: "labor",
    quantity: 1,
    unit: "ls",
    unit_cost: 0,
    markup_pct: proposal?.markup_pct ?? 10,
  });
  const [editDesc, setEditDesc] = useState("");

  if (!proposal) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <FinancialSubNav />
        <p className="text-muted-foreground">Proposal not found.</p>
      </div>
    );
  }

  // Computed totals
  const subtotal   = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const totalMarkup = lines.reduce((s, l) => s + l.quantity * l.unit_cost * (l.markup_pct / 100), 0);
  const grandTotal = subtotal + totalMarkup;

  async function handleAddLine() {
    if (!editDesc.trim()) { toast.error("Description is required"); return; }
    const nextNo = lines.length > 0 ? Math.max(...lines.map(l => l.line_no)) + 1 : 1;
    await create.mutateAsync({
      proposal_id: proposalId!,
      description: editDesc,
      line_no: nextNo,
      category: newLine.category ?? "labor",
      quantity: newLine.quantity ?? 1,
      unit: newLine.unit ?? "ls",
      unit_cost: newLine.unit_cost ?? 0,
      markup_pct: newLine.markup_pct ?? 10,
    });
    setEditDesc("");
    setNewLine({ category: "labor", quantity: 1, unit: "ls", unit_cost: 0, markup_pct: proposal.markup_pct ?? 10 });
    toast.success("Line added");
  }

  async function handleRemoveLine(id: string) {
    await remove.mutateAsync(id);
  }

  async function handleAdvanceStatus() {
    const { next } = STATUS_NEXT[proposal.status] ?? {};
    if (!next) return;
    await updateProposal.mutateAsync({ id: proposal.id, status: next as any });
    toast.success(`Status updated to ${next}`);
  }

  function handleExportPdf() {
    generateProposalPdf(proposal, lines, `Project ${projectId}`, "Build OS");
  }

  const sc = STATUS_NEXT[proposal.status];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <Link to={`/projects/${projectId}/financials/proposals`} className="mt-1">
            <ChevronLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-[var(--apas-sapphire)]" />
              <h1 className="text-2xl font-bold">{proposal.proposal_no}</h1>
              <Badge className={`text-xs ${
                proposal.status === "approved" ? "bg-green-100 text-green-800" :
                proposal.status === "sent"     ? "bg-blue-100 text-blue-800" :
                proposal.status === "rejected" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-700"
              }`}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{proposal.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sc?.next && (
            <Button variant="outline" size="sm" onClick={handleAdvanceStatus} disabled={updateProposal.isPending}>
              <Save className="h-4 w-4 mr-2" />{sc.label}
            </Button>
          )}
          <Button size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Proposal info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Client", value: proposal.client_name ?? "—" },
          { label: "Email", value: proposal.client_email ?? "—" },
          { label: "Valid Until", value: proposal.valid_until ? new Date(proposal.valid_until + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
          { label: "Default Markup", value: `${proposal.markup_pct}%` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{k.label}</p>
              <p className="text-sm font-medium">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Qty</th>
                  <th className="text-left p-3">Unit</th>
                  <th className="text-right p-3">Unit Cost</th>
                  <th className="text-right p-3">Markup</th>
                  <th className="text-right p-3">Total</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const total = line.quantity * line.unit_cost * (1 + line.markup_pct / 100);
                  return (
                    <tr key={line.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground font-mono">{line.line_no}</td>
                      <td className="p-3">
                        <span className="text-xs capitalize bg-muted px-1.5 py-0.5 rounded">{line.category}</span>
                      </td>
                      <td className="p-3">{line.description}</td>
                      <td className="p-3 text-right font-mono">{line.quantity}</td>
                      <td className="p-3 text-muted-foreground">{line.unit}</td>
                      <td className="p-3 text-right font-mono">{fmt(line.unit_cost)}</td>
                      <td className="p-3 text-right font-mono text-amber-600">{line.markup_pct}%</td>
                      <td className="p-3 text-right font-mono font-semibold">{fmt(total)}</td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveLine(line.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {/* Add new line row */}
                {proposal.status === "draft" && (
                  <tr className="bg-muted/10 border-t-2">
                    <td className="p-2 text-muted-foreground font-mono text-xs">{lines.length + 1}</td>
                    <td className="p-2">
                      <Select
                        value={newLine.category}
                        onValueChange={v => setNewLine(l => ({ ...l, category: v as any }))}
                      >
                        <SelectTrigger className="h-8 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Description…"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-xs w-16 text-right"
                        type="number"
                        step="any"
                        value={newLine.quantity}
                        onChange={e => setNewLine(l => ({ ...l, quantity: parseFloat(e.target.value) || 1 }))}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-xs w-16"
                        value={newLine.unit}
                        onChange={e => setNewLine(l => ({ ...l, unit: e.target.value }))}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-xs w-24 text-right"
                        type="number"
                        step="any"
                        value={newLine.unit_cost}
                        onChange={e => setNewLine(l => ({ ...l, unit_cost: parseFloat(e.target.value) || 0 }))}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 text-xs w-16 text-right"
                        type="number"
                        step="0.1"
                        value={newLine.markup_pct}
                        onChange={e => setNewLine(l => ({ ...l, markup_pct: parseFloat(e.target.value) || 0 }))}
                      />
                    </td>
                    <td className="p-2 text-right text-xs font-mono text-muted-foreground">
                      {fmt((newLine.quantity ?? 1) * (newLine.unit_cost ?? 0) * (1 + (newLine.markup_pct ?? 10) / 100))}
                    </td>
                    <td className="p-2">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={handleAddLine} disabled={create.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Totals footer */}
              {lines.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/30 text-xs border-t">
                    <td colSpan={7} className="p-3 text-right text-muted-foreground">Subtotal (before markup)</td>
                    <td className="p-3 text-right font-mono">{fmt(subtotal)}</td>
                    <td />
                  </tr>
                  <tr className="bg-muted/30 text-xs">
                    <td colSpan={7} className="p-3 text-right text-amber-600">Total Markup</td>
                    <td className="p-3 text-right font-mono text-amber-600">{fmt(totalMarkup)}</td>
                    <td />
                  </tr>
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={7} className="p-3 text-right">Proposal Total</td>
                    <td className="p-3 text-right font-mono text-[var(--apas-sapphire)] text-base">{fmt(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Terms / Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {proposal.notes && (
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.notes}</p></CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-sm">Terms & Conditions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{proposal.terms ?? "Net 30. All work per applicable codes and standards."}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
