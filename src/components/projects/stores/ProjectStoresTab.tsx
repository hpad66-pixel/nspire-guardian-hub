import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardPlus,
  Copy,
  FileText,
  Loader2,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAiUsage } from '@/hooks/useAiUsage';
import {
  useCreateStoresWorkOrder,
  useIssueStorePart,
  useOpenStoresWorkOrders,
  useProjectPropertyId,
  useReceiveMaterialReceipt,
  useResetStoresDemo,
  useSeedStoresDemo,
  useStoresItems,
  useStoresReceipts,
  useStoresTransactions,
  useStoresUnits,
  useStoresWorkOrders,
  uploadStoresReceiptFile,
} from '@/hooks/useProjectStores';
import {
  buildOwnerStoresReport,
  buildStoresAiBrief,
  issuesByMonth,
  issuesByTech,
  issuesByUnit,
  lowStockItems,
  money,
  onHandValue,
  orphanIssues,
  predictiveFlags,
  repeatOffenders,
  spendByCategory,
  topMovedParts,
} from '@/lib/stores/storesAnalytics';
import { StoresAnalyticsCharts } from '@/components/projects/stores/StoresAnalyticsCharts';
import { StoresOwnerReportDialog } from '@/components/projects/stores/StoresOwnerReportDialog';
import { cn } from '@/lib/utils';
import { toDateOnly } from '@/lib/date';

export function ProjectStoresTab({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const { data: project, isLoading: loadingProject } = useProjectPropertyId(projectId);
  const propertyId = project?.property_id ?? undefined;
  const { data: items = [], isLoading: loadingItems } = useStoresItems(propertyId);
  const { data: txns = [], isLoading: loadingTxns } = useStoresTransactions(propertyId);
  const { data: receipts = [] } = useStoresReceipts(propertyId);
  const { data: units = [] } = useStoresUnits(propertyId);
  const { data: workOrders = [] } = useStoresWorkOrders(propertyId);
  const { data: openWos = [] } = useOpenStoresWorkOrders(propertyId);
  const { isSuperAdmin } = useAiUsage('30d');
  const resetDemo = useResetStoresDemo();
  const seedDemo = useSeedStoresDemo();

  const [issueOpen, setIssueOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [woOpen, setWoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loading = loadingProject || loadingItems || loadingTxns;

  const analytics = useMemo(() => {
    const byCategory = spendByCategory(items, txns);
    const byMonth = issuesByMonth(txns);
    const topParts = topMovedParts(items, txns, 8);
    const byUnit = issuesByUnit(txns, 10);
    const repeats = repeatOffenders(items, txns, 2);
    const byTech = issuesByTech(txns);
    const low = lowStockItems(items);
    const orphans = orphanIssues(txns);
    const flags = predictiveFlags(items, txns);
    const brief = buildStoresAiBrief({
      propertyName: projectName,
      items,
      txns,
      workOrders,
    });
    const report = buildOwnerStoresReport({
      propertyName: projectName,
      projectName,
      items,
      txns,
      workOrders,
    });
    return {
      byCategory,
      byMonth,
      topParts,
      byUnit,
      repeats,
      byTech,
      low,
      orphans,
      flags,
      brief,
      report,
      onHand: onHandValue(items),
      issueCount: txns.filter((t) => t.transaction_type === 'used').length,
      materialsSpend: money(byCategory.reduce((s, c) => s + c.spend, 0)),
    };
  }, [items, txns, workOrders, projectName]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q)
        || (i.sku || '').toLowerCase().includes(q)
        || i.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading stores…
      </div>
    );
  }

  if (!propertyId) {
    return (
      <Card>
        <CardContent className="space-y-3 p-10 text-center">
          <Warehouse className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Link a property to enable Stores</h3>
          <p className="text-sm text-muted-foreground">
            Stores & Materials is property-scoped (units + work orders). Attach this project to a property, then refresh.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-1" data-testid="project-stores-tab">
      <section className="overflow-hidden rounded-3xl border border-[#0D3B30]/20 bg-gradient-to-br from-[#0D3B30] via-[#0f4a3c] to-[#14532d] p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/90">Stores & Materials</p>
            <h2 className="mt-1 font-display text-3xl font-bold">Maintenance stock room</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Home Depot–style inventory with work-order controls. No WO → no issue. Every part is tied to a unit, a requester, and a date.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" className="bg-white text-[#0D3B30] hover:bg-emerald-50" onClick={() => setReceiveOpen(true)}>
              <PackagePlus className="mr-1.5 h-4 w-4" /> Receive / receipt
            </Button>
            <Button size="sm" className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90" onClick={() => setIssueOpen(true)}>
              <ClipboardPlus className="mr-1.5 h-4 w-4" /> Issue to WO
            </Button>
            <Button size="sm" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" onClick={() => setWoOpen(true)}>
              New work order
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-200/60 bg-amber-400/20 text-white hover:bg-amber-400/30"
              disabled={items.length === 0}
              onClick={() => setReportOpen(true)}
            >
              <FileText className="mr-1.5 h-4 w-4" /> Simulate owner report
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="On-hand value" value={`$${analytics.onHand.toLocaleString()}`} />
          <Kpi label="SKUs / low stock" value={`${items.length} / ${analytics.low.length}`} warn={analytics.low.length > 0} />
          <Kpi label="Parts issued" value={String(analytics.issueCount)} />
          <Kpi label="Materials spend" value={`$${analytics.materialsSpend.toLocaleString()}`} />
          <Kpi label="Open work orders" value={String(openWos.length)} />
        </div>
      </section>

      {items.length === 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-amber-950">No stock room data yet</h3>
              <p className="text-sm text-amber-900/80">
                Load a 6-month Glorieta demo (catalog, Home Depot receipts, WO-gated issues, red flags) so analytics and the owner report light up.
              </p>
            </div>
            {isSuperAdmin ? (
              <Button
                className="bg-[#0D3B30] hover:bg-[#0D3B30]/90"
                disabled={seedDemo.isPending}
                onClick={() => seedDemo.mutate({ propertyId, projectId })}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                {seedDemo.isPending ? 'Seeding…' : 'Load 6-month demo'}
              </Button>
            ) : (
              <p className="text-xs text-amber-900">Ask a super-admin to load demo data.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> WO-gated issue
        </Badge>
        <Badge variant="outline">{receipts.length} receipts</Badge>
        <Badge variant="outline">{units.length} units</Badge>
        {analytics.flags.length > 0 && (
          <Badge className="bg-rose-600">{analytics.flags.length} red flags</Badge>
        )}
        {analytics.orphans.length > 0 && (
          <Badge variant="destructive">{analytics.orphans.length} orphan issues (control gap)</Badge>
        )}
        {isSuperAdmin && (
          <div className="ml-auto flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={seedDemo.isPending}
              onClick={() => {
                if (confirm('Reload 6-month demo data? Existing demo rows for this property will be replaced.')) {
                  seedDemo.mutate({ propertyId, projectId });
                }
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Load / refresh demo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-700"
              disabled={resetDemo.isPending}
              onClick={() => {
                if (confirm('Reset all demo stores data for this property? Live non-demo rows are kept.')) {
                  resetDemo.mutate(propertyId);
                }
              }}
            >
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Reset demo data
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/60 p-1">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="stock">Stock room</TabsTrigger>
          <TabsTrigger value="issues">Issue log</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="work-orders">Work orders</TabsTrigger>
          <TabsTrigger value="brief">Owner brief</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          {analytics.flags.length > 0 && (
            <Card className="border-rose-200 bg-rose-50/40">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="h-4 w-4" />
                  <h3 className="font-semibold">Red flags & predictive actions</h3>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {analytics.flags.map((f) => (
                    <div key={f.id} className="rounded-xl border bg-white/80 p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={f.severity === 'critical' ? 'bg-rose-600' : f.severity === 'watch' ? 'bg-amber-500' : 'bg-emerald-700'}>
                          {f.severity}
                        </Badge>
                        <p className="font-medium leading-tight">{f.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
                      <p className="mt-2 text-xs font-medium text-[#0D3B30]">→ {f.recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <StoresAnalyticsCharts
            byCategory={analytics.byCategory}
            byMonth={analytics.byMonth}
            topParts={analytics.topParts}
            byUnit={analytics.byUnit}
            repeats={analytics.repeats}
          />
          {analytics.byTech.length > 0 && (
            <Card>
              <CardContent className="flex flex-wrap gap-2 p-4">
                <span className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground">Crew volume</span>
                {analytics.byTech.map((t) => (
                  <Badge key={t.name} variant="secondary" className="text-xs">
                    {t.name}: {t.issues} issues · ${money(t.spend).toLocaleString()}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stock" className="mt-4 space-y-3">
          <Input
            placeholder="Search SKU, name, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const low = item.current_quantity <= item.minimum_quantity;
              return (
                <Card key={item.id} className={cn('border', low && 'border-amber-300 bg-amber-50/40')}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku} · {item.category}</p>
                      </div>
                      {low && <Badge className="bg-amber-500">Low</Badge>}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold tabular-nums">{Number(item.current_quantity)}</p>
                        <p className="text-[11px] text-muted-foreground">min {Number(item.minimum_quantity)} · ${Number(item.unit_cost || 0).toFixed(2)}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{item.storage_location}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <div className="overflow-x-auto rounded-xl border mobile-table-scroll">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Part</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Requester</th>
                  <th className="px-3 py-2">Tech</th>
                  <th className="px-3 py-2">WO</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {txns.filter((t) => t.transaction_type === 'used').slice(0, 80).map((t) => {
                  const item = items.find((i) => i.id === t.item_id);
                  return (
                    <tr key={t.id} className="border-t">
                      <td className="px-3 py-2 tabular-nums">{t.deployed_at || t.transaction_date}</td>
                      <td className="px-3 py-2">{item?.name ?? t.item_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 font-medium">{t.unit_label || '—'}</td>
                      <td className="px-3 py-2">{t.requester_name || '—'}</td>
                      <td className="px-3 py-2">{t.issued_to_name || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{t.linked_work_order_id ? t.linked_work_order_id.slice(0, 8) : '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{Math.abs(Number(t.quantity))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4 space-y-3">
          {receipts.length === 0 ? (
            <EmptyCard text="No procurement receipts yet. Upload a Home Depot (or other) receipt to receive stock." />
          ) : (
            receipts.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{r.vendor} · {r.receipt_number || 'No #'}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.purchased_at} · {r.file_name || 'No file'} · {r.notes || '—'}
                    </p>
                  </div>
                  <p className="text-lg font-bold tabular-nums">${Number(r.total_amount || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="work-orders" className="mt-4 space-y-2">
          {workOrders.map((wo) => (
            <Card key={wo.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{wo.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Requester: {wo.requester_name || '—'} · Unit: {wo.unit?.unit_number || '—'} · Due {wo.due_date}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{wo.status.replace('_', ' ')}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="brief" className="mt-4 space-y-3">
          <Card className="border-[#0D3B30]/20">
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2 text-[#0D3B30]">
                <Sparkles className="h-4 w-4" />
                <h3 className="font-semibold">AI monthly materials brief</h3>
                <Button
                  size="sm"
                  className="ml-auto bg-[#0D3B30] hover:bg-[#0D3B30]/90"
                  disabled={items.length === 0}
                  onClick={() => setReportOpen(true)}
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Simulate owner report
                </Button>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">{analytics.brief}</pre>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(analytics.brief);
                  toast.success('Brief copied');
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy for owner
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StoresOwnerReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        report={analytics.report}
        flags={analytics.flags}
      />

      <IssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        propertyId={propertyId}
        projectId={projectId}
        items={items}
        units={units}
        openWos={openWos}
      />
      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        propertyId={propertyId}
        projectId={projectId}
        items={items}
      />
      <WorkOrderDialog
        open={woOpen}
        onOpenChange={setWoOpen}
        propertyId={propertyId}
        projectId={projectId}
        units={units}
      />
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-white/15 bg-white/10 px-4 py-3', warn && 'border-amber-300/50 bg-amber-400/15')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function IssueDialog({
  open,
  onOpenChange,
  propertyId,
  projectId,
  items,
  units,
  openWos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  projectId: string;
  items: { id: string; name: string; unit_cost: number | null; current_quantity: number }[];
  units: { id: string; unit_number: string }[];
  openWos: { id: string; title: string; requester_name: string | null; unit_id: string | null; unit?: { unit_number: string } | null }[];
}) {
  const issue = useIssueStorePart();
  const [itemId, setItemId] = useState('');
  const [woId, setWoId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [qty, setQty] = useState('1');
  const [tech, setTech] = useState('');
  const [reason, setReason] = useState('');
  const [emergency, setEmergency] = useState(false);
  const selectedWo = openWos.find((w) => w.id === woId);
  const selectedItem = items.find((i) => i.id === itemId);

  const unitLabel =
    units.find((u) => u.id === unitId)?.unit_number
    || selectedWo?.unit?.unit_number
    || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue part to work order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!emergency && openWos.length === 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              No open work orders. Create one first — parts cannot be issued without a WO.
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Work order *</Label>
            <Select value={woId} onValueChange={(v) => {
              setWoId(v);
              const wo = openWos.find((w) => w.id === v);
              if (wo?.unit_id) setUnitId(wo.unit_id);
              if (wo?.title) setReason(wo.title);
            }}>
              <SelectTrigger><SelectValue placeholder="Select open work order" /></SelectTrigger>
              <SelectContent>
                {openWos.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title} {w.requester_name ? `· ${w.requester_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Part *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select stock item" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} ({Number(i.current_quantity)} on hand)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit *</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Qty *</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Issued to (tech)</Label>
            <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Crew member name" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason / repair</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why was this replaced?" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={emergency} onCheckedChange={(v) => setEmergency(!!v)} />
            Admin emergency override (audited)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={issue.isPending || (!woId && !emergency) || !itemId}
            onClick={() => {
              issue.mutate(
                {
                  propertyId,
                  projectId,
                  itemId,
                  quantity: Math.max(1, Number(qty) || 1),
                  workOrderId: woId,
                  unitId: unitId || selectedWo?.unit_id || null,
                  unitLabel,
                  requesterName: selectedWo?.requester_name || undefined,
                  reason: reason || undefined,
                  issuedToName: tech || undefined,
                  unitCost: selectedItem?.unit_cost,
                  emergencyOverride: emergency,
                  deployedAt: toDateOnly(new Date()),
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            {issue.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Issue part'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({
  open,
  onOpenChange,
  propertyId,
  projectId,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  projectId: string;
  items: { id: string; name: string; unit_cost: number | null }[];
}) {
  const receive = useReceiveMaterialReceipt();
  const [vendor, setVendor] = useState('Home Depot');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const selected = items.find((i) => i.id === itemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive stock / upload receipt</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt #</Label>
              <Input value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="HD-…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Item *</Label>
            <Select value={itemId} onValueChange={(v) => {
              setItemId(v);
              const it = items.find((i) => i.id === v);
              if (it?.unit_cost != null) setUnitCost(String(it.unit_cost));
            }}>
              <SelectTrigger><SelectValue placeholder="Catalog item" /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Qty *</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit cost</Label>
              <Input type="number" min={0} step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Receipt file (PDF / photo)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={receive.isPending || !itemId}
            onClick={async () => {
              try {
                let fileUrl: string | undefined;
                let fileName: string | undefined;
                if (file) {
                  const up = await uploadStoresReceiptFile(propertyId, file);
                  fileUrl = up.url;
                  fileName = file.name;
                }
                await receive.mutateAsync({
                  propertyId,
                  projectId,
                  vendor,
                  receiptNumber: receiptNumber || undefined,
                  notes: notes || undefined,
                  fileUrl,
                  fileName,
                  lines: [{
                    itemId,
                    description: selected?.name || 'Item',
                    quantity: Math.max(1, Number(qty) || 1),
                    unitCost: unitCost ? Number(unitCost) : selected?.unit_cost ?? undefined,
                  }],
                });
                onOpenChange(false);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Receive failed');
              }
            }}
          >
            {receive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkOrderDialog({
  open,
  onOpenChange,
  propertyId,
  projectId,
  units,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  projectId: string;
  units: { id: string; unit_number: string }[];
}) {
  const create = useCreateStoresWorkOrder();
  const [title, setTitle] = useState('');
  const [requester, setRequester] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tech, setTech] = useState('');
  const [priority, setPriority] = useState<'routine' | 'emergency'>('routine');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New maintenance work order</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leaking faucet — Apt …" />
          </div>
          <div className="space-y-1.5">
            <Label>Requester * (who asked)</Label>
            <Input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Tenant / PM / maintenance lead" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'routine' | 'emergency')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned tech (note)</Label>
            <Input value={tech} onChange={(e) => setTech(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={create.isPending || !title.trim() || !requester.trim()}
            onClick={() => {
              create.mutate(
                {
                  propertyId,
                  projectId,
                  title: title.trim(),
                  requesterName: requester.trim(),
                  unitId: unitId || null,
                  priority,
                  assignedTechNote: tech ? `Assigned tech: ${tech}` : undefined,
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Create WO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
