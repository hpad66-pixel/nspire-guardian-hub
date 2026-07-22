import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import {
  usePrimeContract, usePrimeContractSov, usePrimeContractTotals, usePayApps,
} from "@/hooks/usePrimeContract";
import { useGeneratePayApp } from "@/hooks/usePayAppContinuation";
import { useChangeOrdersByProject } from "@/hooks/useChangeOrders";
import { useProjectFinancials } from "@/hooks/useProjectFinancials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileSignature, Plus, ExternalLink, Pencil } from "lucide-react";

function fmt(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n ?? 0);
}
function fmt2(n: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", out_for_signature: "bg-amber-100 text-amber-800",
  executed: "bg-green-100 text-green-800", closed: "bg-blue-100 text-blue-800", terminated: "bg-red-100 text-red-800",
};

export default function PrimeContractPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contract, isLoading, create, update } = usePrimeContract(projectId ?? null);
  const { data: totals } = usePrimeContractTotals(contract?.id ?? null);
  const { data: sov = [] } = usePrimeContractSov(contract?.id ?? null);
  const { data: payApps = [] } = usePayApps(contract?.id ?? null);
  const generatePayApp = useGeneratePayApp(contract?.id ?? null, projectId ?? null);
  const { data: allCos = [] } = useChangeOrdersByProject(projectId ?? null);
  const { summary, ledger } = useProjectFinancials(projectId ?? null);

  const [creating, setCreating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ contract_no: "", title: "", original_value: "" });

  async function handleCreate() {
    const original_value = parseFloat(createForm.original_value || "0");
    if (!createForm.contract_no.trim() || !createForm.title.trim()) {
      toast.error("Contract number and title are required.");
      return;
    }
    try {
      await create.mutateAsync({
        contract_no: createForm.contract_no.trim(),
        title: createForm.title.trim(),
        original_value: Number.isFinite(original_value) ? original_value : 0,
        status: "draft",
      });
      toast.success("Prime contract created.");
      setCreateOpen(false);
      setCreateForm({ contract_no: "", title: "", original_value: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create prime contract");
    }
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  if (!contract) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <FinancialSubNav />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Prime Contract</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Prime Contract
          </Button>
        </div>
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No prime contract yet for this project. Create one to unlock pay apps, payments, budget, and reports.
        </CardContent></Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Prime Contract</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="pc-no">Contract Number</Label>
                <Input id="pc-no" value={createForm.contract_no}
                  onChange={(e) => setCreateForm((f) => ({ ...f, contract_no: e.target.value }))}
                  placeholder="e.g. PC-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-title">Title</Label>
                <Input id="pc-title" value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Main Building Construction" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pc-value">Original Contract Value (USD)</Label>
                <Input id="pc-value" type="number" min="0" step="0.01" value={createForm.original_value}
                  onChange={(e) => setCreateForm((f) => ({ ...f, original_value: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const coList = allCos.filter((c) => (c as any).co_type !== "CCO" && !(c as any).commitment_id);
  const payments = (ledger.data ?? []).filter((e) => e.entry_type === "payment" && e.direction === "receivable");
  const s = summary.data;

  const original = totals?.original_value ?? contract.original_value ?? 0;
  const executedCo = totals?.executed_co_value ?? 0;
  const revised = totals?.revised_contract_value ?? original + executedCo;
  const billed = totals?.billed_to_date ?? s?.billed_to_date ?? 0;

  async function newPayApp() {
    setCreating(true);
    try {
      const res = await generatePayApp.mutateAsync({});
      toast.success(`Pay App #${res.payAppNo} generated — ${res.lineCount} SOV lines seeded from the contract + approved change orders.`);
      window.location.href = `/projects/${projectId}/financials/prime-contract/pay-apps/${res.payAppId}`;
    } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
  }

  const DETAIL_FIELDS: { key: string; label: string; type?: string; full?: boolean }[] = [
    { key: "contractor_name", label: "Contractor" }, { key: "contractor_email", label: "Contractor email" },
    { key: "owner_name", label: "Owner" }, { key: "owner_email", label: "Owner email" },
    { key: "project_address", label: "Project address", full: true },
    { key: "contract_date", label: "Contract date", type: "date" },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "substantial_completion_date", label: "Substantial completion", type: "date" },
    { key: "final_completion_date", label: "Final completion", type: "date" },
    { key: "scope_description", label: "Scope", full: true },
    { key: "special_conditions", label: "Special conditions", full: true },
  ];

  function openDetails() {
    if (!contract) return;
    const seed: Record<string, string> = {};
    DETAIL_FIELDS.forEach((f) => { seed[f.key] = (contract as any)[f.key] ?? ""; });
    setForm(seed);
    setDetailsOpen(true);
  }
  async function saveDetails() {
    if (!contract) return;
    const patch: Record<string, any> = {};
    DETAIL_FIELDS.forEach((f) => { patch[f.key] = form[f.key]?.trim() ? form[f.key].trim() : null; });
    try {
      await update.mutateAsync({ id: contract.id, ...patch });
      toast.success("Contract details saved");
      setDetailsOpen(false);
    } catch (e: any) { toast.error(e.message); }
  }

  const kpis = [
    { label: "Original", value: fmt(original) },
    { label: "Executed Change Orders", value: fmt(executedCo), color: "text-emerald-600" },
    { label: "Revised", value: fmt(revised), color: "text-[var(--apas-sapphire)]" },
    { label: "Billed", value: fmt(billed) },
    { label: "Received", value: fmt(s?.received_to_date), color: "text-emerald-600" },
    { label: "A/R Outstanding", value: fmt(s?.ar_outstanding), color: (s?.ar_outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600" },
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          <FileSignature className="h-6 w-6 text-[var(--apas-sapphire)] mt-1" />
          <div>
            <h1 className="text-2xl font-bold">
              <span className="font-mono text-muted-foreground mr-2">{contract.contract_no}</span>{contract.title}
            </h1>
            <p className="text-muted-foreground text-sm capitalize">Prime contract · {contract.status}</p>
          </div>
        </div>
        <Badge className={STATUS_BADGE[contract.status] ?? ""}>{contract.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color ?? "text-foreground"}`}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sov">SOV · {sov.length}</TabsTrigger>
          <TabsTrigger value="payapps">Pay Apps · {(payApps as any[]).length}</TabsTrigger>
          <TabsTrigger value="cos">Change Orders · {coList.length}</TabsTrigger>
          <TabsTrigger value="payments">Payments · {payments.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Contract Details</CardTitle>
              <Button size="sm" variant="outline" onClick={openDetails}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {DETAIL_FIELDS.map((f) => {
                  const v = (contract as any)[f.key];
                  return (
                    <div key={f.key} className={f.full ? "md:col-span-2" : ""}>
                      <dt className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</dt>
                      <dd className="font-medium">{v || <span className="text-muted-foreground">—</span>}</dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sov">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3 w-8">#</th><th className="text-left p-3">Description</th>
                <th className="text-left p-3">Cost Code</th><th className="text-right p-3">Scheduled</th>
              </tr></thead>
              <tbody>
                {sov.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No SOV lines.</td></tr>}
                {sov.map((l) => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="p-3 font-mono text-muted-foreground">{l.line_no}</td>
                    <td className="p-3">{l.description}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{l.cost_code_id ?? "—"}</td>
                    <td className="p-3 text-right font-mono">{fmt2(l.scheduled_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payapps">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Pay Applications</CardTitle>
              <Button size="sm" onClick={newPayApp} disabled={creating}><Plus className="h-4 w-4 mr-1" /> {creating ? "Generating…" : "Generate Pay App"}</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                  <th className="text-left p-3">#</th><th className="text-left p-3">Period</th>
                  <th className="text-right p-3">Submitted</th><th className="text-right p-3">Approved</th>
                  <th className="text-center p-3">Status</th><th className="p-3" />
                </tr></thead>
                <tbody>
                  {(payApps as any[]).length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No pay apps yet.</td></tr>}
                  {(payApps as any[]).map((pa) => (
                    <tr key={pa.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                      onClick={() => (window.location.href = `/projects/${projectId}/financials/prime-contract/pay-apps/${pa.id}`)}>
                      <td className="p-3 font-mono font-medium">#{pa.pay_app_no}</td>
                      <td className="p-3 text-muted-foreground">{fmtDate(pa.period_end)}</td>
                      <td className="p-3 text-right font-mono">{fmt2(pa.submitted_amount)}</td>
                      <td className="p-3 text-right font-mono">{fmt2(pa.approved_amount)}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="capitalize">{pa.status}</Badge></td>
                      <td className="p-3 text-center"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cos">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3">CO</th><th className="text-left p-3">Title</th>
                <th className="text-right p-3">Amount</th><th className="text-center p-3">Status</th>
              </tr></thead>
              <tbody>
                {coList.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No change orders.</td></tr>}
                {coList.map((co) => (
                  <tr key={co.id} className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => (window.location.href = `/projects/${projectId}/financials/cos/${co.id}`)}>
                    <td className="p-3 font-mono">{(co as any).co_type ?? "CO"}-{(co as any).co_no ?? "—"}</td>
                    <td className="p-3">{co.title ?? co.description}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">+{fmt2(Number(co.amount ?? 0))}</td>
                    <td className="p-3 text-center"><Badge variant="outline" className="capitalize">{co.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3">Date</th><th className="text-left p-3">Reference</th><th className="text-right p-3">Amount</th>
              </tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No payments received.</td></tr>}
                {payments.map((p) => (
                  <tr key={p.ledger_id} className="border-b last:border-0">
                    <td className="p-3">{fmtDate(p.entry_date)}</td>
                    <td className="p-3 font-mono text-xs">{p.reference ?? "—"}</td>
                    <td className="p-3 text-right font-mono text-emerald-700">{fmt2(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Contract Details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
            {DETAIL_FIELDS.map((f) => (
              <div key={f.key} className={`space-y-1.5 ${f.full ? "md:col-span-2" : ""}`}>
                <Label className="text-xs">{f.label}</Label>
                {f.full ? (
                  <Textarea rows={2} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
                ) : (
                  <Input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Cancel</Button>
            <Button onClick={saveDetails} disabled={update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
