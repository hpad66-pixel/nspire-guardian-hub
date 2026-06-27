import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gavel, Plus, Trophy, Trash2, ChevronRight, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBidPackages, useBidInvitees, type BidPackage } from '@/hooks/useBidding';

const money = (n: number | null | undefined) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`);
const statusColor: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-700 border-blue-200',
  awarded: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground border-border',
};

export function BiddingPanel({ projectId }: { projectId: string }) {
  const { data: packages = [], isLoading, create, remove } = useBidPackages(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', trade: '', scope: '', due_date: '', estimate: '' });

  const selected = packages.find((p) => p.id === selectedId) ?? null;

  const submitCreate = () => {
    if (!form.title.trim()) { toast.error('Give the package a title.'); return; }
    create.mutate({
      title: form.title, trade: form.trade, scope: form.scope,
      due_date: form.due_date || null, estimate: form.estimate ? Number(form.estimate) : null,
    }, {
      onSuccess: (pkg) => { toast.success('Bid package created'); setCreateOpen(false); setForm({ title: '', trade: '', scope: '', due_date: '', estimate: '' }); setSelectedId(pkg.id); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Bidding &amp; Tender</h3>
          <Badge variant="secondary">{packages.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New package</Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : packages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No bid packages yet. Create one to invite subcontractors, record their bids, and award the work.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {packages.map((p) => (
            <Card key={p.id} className={cn('cursor-pointer transition-colors hover:border-primary/40', selectedId === p.id && 'border-primary/60')} onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{p.title}</span>
                    <Badge variant="outline" className={cn('capitalize', statusColor[p.status])}>{p.status}</Badge>
                    {p.status === 'awarded' && p.commitment_id && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">Commitment created</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.trade && <>{p.trade} · </>}{p.due_date ? `Due ${format(new Date(p.due_date + 'T12:00:00'), 'MMM d')}` : 'No due date'}{p.estimate != null && <> · Est. {money(p.estimate)}</>}
                  </div>
                </div>
                <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', selectedId === p.id && 'rotate-90')} />
              </CardContent>
              {selectedId === p.id && (
                <div onClick={(e) => e.stopPropagation()}>
                  <PackageDetail pkg={p} projectId={projectId} onDelete={() => { if (confirm(`Delete bid package "${p.title}"?`)) remove.mutate(p.id, { onSuccess: () => { setSelectedId(null); toast.success('Deleted'); } }); }} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New bid package</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sitework & Excavation" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Trade</Label><Input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} placeholder="Earthwork" /></div>
              <div><Label>Bids due</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Internal estimate (optional)</Label><Input type="number" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} placeholder="Used to level bids" /></div>
            <div><Label>Scope</Label><Textarea rows={3} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="What's included in this package…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={create.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PackageDetail({ pkg, projectId, onDelete }: { pkg: BidPackage; projectId: string; onDelete: () => void }) {
  const { data: invitees = [], addInvitee, updateInvitee, removeInvitee, award } = useBidInvitees(pkg.id, projectId);
  const [adding, setAdding] = useState({ vendor_name: '', vendor_company: '', vendor_email: '' });

  const bids = invitees.filter((i) => i.bid_amount != null).map((i) => Number(i.bid_amount));
  const lowBid = bids.length ? Math.min(...bids) : null;

  return (
    <div className="border-t bg-muted/20 px-3 py-3 space-y-3">
      {pkg.scope && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{pkg.scope}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-1.5 pr-2">Subcontractor</th>
              <th className="py-1.5 px-2">Status</th>
              <th className="py-1.5 px-2 text-right">Bid</th>
              <th className="py-1.5 px-2 text-right">vs Est.</th>
              <th className="py-1.5 pl-2"></th>
            </tr>
          </thead>
          <tbody>
            {invitees.map((iv) => {
              const isLow = iv.bid_amount != null && lowBid != null && Number(iv.bid_amount) === lowBid;
              const delta = iv.bid_amount != null && pkg.estimate != null ? Number(iv.bid_amount) - Number(pkg.estimate) : null;
              return (
                <tr key={iv.id} className={cn('border-b', iv.status === 'awarded' && 'bg-emerald-500/10')}>
                  <td className="py-1.5 pr-2">
                    <div className="font-medium flex items-center gap-1.5">{iv.vendor_name}{iv.status === 'awarded' && <Trophy className="h-3.5 w-3.5 text-emerald-600" />}</div>
                    {iv.vendor_company && <div className="text-xs text-muted-foreground">{iv.vendor_company}</div>}
                  </td>
                  <td className="py-1.5 px-2"><Badge variant="outline" className="capitalize text-[10px]">{iv.status}</Badge></td>
                  <td className="py-1.5 px-2 text-right">
                    <Input type="number" defaultValue={iv.bid_amount ?? ''} placeholder="—"
                      className={cn('h-7 w-28 ml-auto text-right text-sm', isLow && 'border-emerald-400 font-semibold text-emerald-700')}
                      onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== (iv.bid_amount ?? null)) updateInvitee.mutate({ id: iv.id, patch: { bid_amount: v } }); }} />
                  </td>
                  <td className={cn('py-1.5 px-2 text-right text-xs', delta != null && (delta > 0 ? 'text-rose-600' : 'text-emerald-600'))}>
                    {delta == null ? '—' : `${delta > 0 ? '+' : ''}${money(delta)}`}
                  </td>
                  <td className="py-1.5 pl-2">
                    <div className="flex items-center justify-end gap-1">
                      {pkg.status !== 'awarded' && iv.bid_amount != null && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => award.mutate({ inviteeId: iv.id, pkgId: pkg.id }, { onSuccess: (res) => {
                          if (res?.commitment_no) toast.success(`Awarded to ${iv.vendor_name} · commitment ${res.commitment_no} created`);
                          else if (res?.commitmentError) toast.success(`Awarded to ${iv.vendor_name} (couldn’t auto-create the commitment — add it manually)`);
                          else toast.success(`Awarded to ${iv.vendor_name}`);
                        } })}>
                          <Trophy className="h-3 w-3 mr-1" /> Award
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeInvitee.mutate(iv.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {invitees.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-xs text-muted-foreground">No subcontractors invited yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add invitee */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
        <Input className="h-8 text-sm" placeholder="Subcontractor name *" value={adding.vendor_name} onChange={(e) => setAdding({ ...adding, vendor_name: e.target.value })} />
        <Input className="h-8 text-sm" placeholder="Company" value={adding.vendor_company} onChange={(e) => setAdding({ ...adding, vendor_company: e.target.value })} />
        <Input className="h-8 text-sm" placeholder="Email" value={adding.vendor_email} onChange={(e) => setAdding({ ...adding, vendor_email: e.target.value })} />
        <Button size="sm" className="h-8" disabled={!adding.vendor_name.trim()}
          onClick={() => addInvitee.mutate(adding, { onSuccess: () => setAdding({ vendor_name: '', vendor_company: '', vendor_email: '' }) })}>
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Invite
        </Button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">{invitees.length} invited · {bids.length} bid{bids.length !== 1 ? 's' : ''} in{lowBid != null && <> · low {money(lowBid)}</>}</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete package</Button>
      </div>
    </div>
  );
}
