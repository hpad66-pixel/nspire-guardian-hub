import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectIssues, ProjectIssue } from "@/hooks/useProjectIssues";
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
import { AlertTriangle, Plus, ArrowRightCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<ProjectIssue["category"], string> = {
  scope_gap: "Scope Gap",
  owner_directed: "Owner Directed",
  unforeseen: "Unforeseen",
  design_change: "Design Change",
  deficiency: "Deficiency",
  other: "Other",
};

const STATUS_CONFIG: Record<ProjectIssue["status"], { label: string; className: string; icon: React.ElementType }> = {
  open:          { label: "Open",           className: "bg-amber-100 text-amber-800",  icon: Clock },
  pending_review:{ label: "Pending Review", className: "bg-blue-100 text-blue-800",   icon: Clock },
  converted_pco: { label: "Converted PCO",  className: "bg-purple-100 text-purple-800", icon: ArrowRightCircle },
  converted_co:  { label: "Converted CO",   className: "bg-green-100 text-green-800",  icon: CheckCircle2 },
  closed:        { label: "Closed",         className: "bg-gray-100 text-gray-600",   icon: XCircle },
};

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n ?? 0);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function IssuesLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: issues = [], isLoading, create, update, convertToPco } = useProjectIssues(projectId ?? null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Partial<ProjectIssue>>({
    category: "unforeseen",
    status: "open",
  });

  const filtered = issues.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterCategory !== "all" && i.category !== filterCategory) return false;
    return true;
  });

  const openCount  = issues.filter(i => i.status === "open").length;
  const reviewCount = issues.filter(i => i.status === "pending_review").length;
  const pcoCount   = issues.filter(i => i.status === "converted_pco" || i.status === "converted_co").length;
  const totalExposure = issues.filter(i => i.status !== "closed").reduce((s, i) => s + (i.estimated_cost ?? 0), 0);

  async function handleCreate() {
    if (!form.title?.trim()) { toast.error("Title is required"); return; }
    await create.mutateAsync({ project_id: projectId!, title: form.title!, ...form });
    setShowCreate(false);
    setForm({ category: "unforeseen", status: "open" });
    toast.success("Issue logged");
  }

  async function handleConvertToPco(issue: ProjectIssue) {
    await convertToPco.mutateAsync(issue);
    toast.success(`Issue converted to PCO`);
  }

  async function handleClose(issue: ProjectIssue) {
    await update.mutateAsync({ id: issue.id, status: "closed" });
    toast.success("Issue closed");
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500 mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Issue Log</h1>
            <p className="text-muted-foreground text-sm">Field observations, scope gaps, and change drivers</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Log Issue
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Open", value: openCount, color: "text-amber-600" },
          { label: "Pending Review", value: reviewCount, color: "text-blue-600" },
          { label: "Converted to PCO/CO", value: pcoCount, color: "text-purple-600" },
          { label: "Total Exposure", value: fmt(totalExposure), color: "text-destructive" },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <SelectItem key={v} value={v}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Issues Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} issue{filtered.length !== 1 ? "s" : ""} {filterStatus !== "all" || filterCategory !== "all" ? "(filtered)" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground text-center">
              No issues found. Click "Log Issue" to add your first field observation.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-right p-3">Est. Cost</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(issue => {
                    const sc = STATUS_CONFIG[issue.status];
                    const Icon = sc.icon;
                    return (
                      <tr key={issue.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(issue.created_at)}</td>
                        <td className="p-3">
                          <p className="font-medium">{issue.title}</p>
                          {issue.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{issue.description}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[issue.category]}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{issue.location ?? "—"}</td>
                        <td className="p-3 text-right font-mono">
                          {issue.estimated_cost != null ? fmt(issue.estimated_cost) : "—"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                            <Icon className="h-3 w-3" />{sc.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(issue.status === "open" || issue.status === "pending_review") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2"
                                onClick={() => handleConvertToPco(issue)}
                                disabled={convertToPco.isPending}
                              >
                                → PCO
                              </Button>
                            )}
                            {issue.status === "open" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-muted-foreground"
                                onClick={() => update.mutateAsync({ id: issue.id, status: "pending_review" })}
                              >
                                Review
                              </Button>
                            )}
                            {issue.status !== "closed" && issue.status !== "converted_pco" && issue.status !== "converted_co" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 px-2 text-muted-foreground"
                                onClick={() => handleClose(issue)}
                              >
                                Close
                              </Button>
                            )}
                          </div>
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
            <DialogTitle>Log New Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Brief description of the issue"
                value={form.title ?? ""}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v as ProjectIssue["category"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estimated Cost ($)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={form.estimated_cost ?? ""}
                  onChange={e => setForm(f => ({ ...f, estimated_cost: e.target.value ? parseFloat(e.target.value) : undefined }))}
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                placeholder="e.g. Level 2, Grid B-4"
                value={form.location ?? ""}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Detailed description of the issue, conditions observed, and recommended action…"
                rows={3}
                value={form.description ?? ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Log Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
