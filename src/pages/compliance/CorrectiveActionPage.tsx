import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties } from '@/hooks/useProperties';
import {
  useRegulatoryDocuments, useRegulatoryActionItems, useCorrectiveActionStats,
  useCreateRegulatoryDocument, useCreateActionItem, useUpdateActionItem,
  type RegulatoryDocument, type RegulatoryActionItem,
} from '@/hooks/useCorrectiveActions';

const AGENCY_COLORS: Record<string, string> = {
  DERM: 'bg-teal-500/20 text-teal-400', HUD: 'bg-blue-500/20 text-blue-400',
  FDEP: 'bg-emerald-500/20 text-emerald-400', OSHA: 'bg-orange-500/20 text-orange-400',
  City: 'bg-muted text-muted-foreground', 'State Fire Marshal': 'bg-rose-500/20 text-rose-400',
  EPA: 'bg-green-500/20 text-green-400', Other: 'bg-muted text-muted-foreground',
};

const DOC_TYPES = [
  'consent_order', 'consent_agreement', 'corrective_action_plan', 'notice_of_violation',
  'administrative_order', 'citation', 'warning_letter', 'compliance_schedule', 'other',
];
const AGENCIES = ['DERM', 'HUD', 'FDEP', 'OSHA', 'City of Opa-locka', 'State Fire Marshal', 'EPA', 'Miami-Dade County', 'Other'];

function AgencyBadge({ agency }: { agency: string }) {
  const color = AGENCY_COLORS[agency] || AGENCY_COLORS.Other;
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>{agency}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    active: 'bg-blue-500/20 text-blue-400', compliant: 'bg-amber-400/20 text-amber-400',
    closed: 'bg-amber-400/20 text-amber-400', appealing: 'bg-violet-500/20 text-violet-400',
    overdue: 'bg-rose-500/20 text-rose-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c[status] || c.active}`}>{status}</span>;
}

function ActionItemStatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    open: 'bg-muted text-muted-foreground', in_progress: 'bg-amber-500/20 text-amber-500',
    submitted: 'bg-blue-500/20 text-blue-400', closed: 'bg-amber-400/20 text-amber-400',
    waived: 'bg-amber-400/20 text-amber-400', disputed: 'bg-rose-500/20 text-rose-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${c[status] || c.open}`}>{status.replace('_', ' ')}</span>;
}

function ComplianceProgress({ closed, total }: { closed: number; total: number }) {
  const pct = total > 0 ? (closed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{closed}/{total}</span>
    </div>
  );
}

function DocumentCard({ doc }: { doc: RegulatoryDocument }) {
  const [expanded, setExpanded] = useState(false);
  const { data: items = [] } = useRegulatoryActionItems(expanded ? doc.id : null);
  const closedItems = items.filter(i => ['closed', 'waived'].includes(i.status)).length;
  const updateItem = useUpdateActionItem();
  const createItem = useCreateActionItem();
  const [addingItem, setAddingItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  const daysToCompliance = doc.final_compliance_date
    ? differenceInDays(new Date(doc.final_compliance_date), new Date())
    : null;
  const isUrgent = daysToCompliance !== null && daysToCompliance < 30;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isUrgent ? 'bg-rose-500' : 'bg-primary/30'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <AgencyBadge agency={doc.agency} />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase" style={{ fontFamily: 'JetBrains Mono' }}>
                    {doc.doc_type.replace(/_/g, ' ')}
                  </span>
                  <StatusBadge status={doc.status} />
                </div>
                <h3 className="text-sm font-semibold">{doc.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {doc.case_number && <span>Case: {doc.case_number}</span>}
                  {(doc.property as any)?.name && <span>{(doc.property as any).name}</span>}
                  {doc.final_compliance_date && (
                    <span className={isUrgent ? 'text-destructive font-medium' : ''}>
                      Due: {format(new Date(doc.final_compliance_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                {items.length > 0 && (
                  <div className="mt-2 max-w-xs">
                    <ComplianceProgress closed={closedItems} total={items.length} />
                  </div>
                )}
                {(doc.penalty_amount || doc.daily_fine) && (
                  <div className="mt-1 text-xs text-amber-500 font-medium">
                    {doc.penalty_amount && <span>Penalty: ${doc.penalty_amount.toLocaleString()}</span>}
                    {doc.daily_fine && <span className="ml-3">Daily Fine: ${doc.daily_fine.toLocaleString()}/day</span>}
                  </div>
                )}
              </div>
              <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border p-4 space-y-3">
            {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}

            {/* Action items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>Item</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Required Action</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Assigned</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Due</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const overdue = item.due_date && isPast(new Date(item.due_date)) && !['closed', 'waived'].includes(item.status);
                    return (
                      <tr key={item.id} className="border-b border-border/30">
                        <td className="px-2 py-2 font-mono text-muted-foreground">{item.item_number || '—'}</td>
                        <td className="px-2 py-2 font-medium max-w-[200px] truncate">{item.title}</td>
                        <td className="px-2 py-2">
                          {item.assigned_profile ? (
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {((item.assigned_profile as any).full_name || '?').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : '—'}
                        </td>
                        <td className={`px-2 py-2 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {item.due_date ? format(new Date(item.due_date), 'MMM d') : '—'}
                        </td>
                        <td className="px-2 py-2"><ActionItemStatusBadge status={item.status} /></td>
                        <td className="px-2 py-2">
                          {!['closed', 'waived'].includes(item.status) && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                              onClick={() => updateItem.mutate({ id: item.id, status: item.status === 'open' ? 'in_progress' : 'closed', completed_at: new Date().toISOString() })}>
                              {item.status === 'open' ? 'Start' : 'Close'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {addingItem ? (
              <div className="flex gap-2 items-center">
                <Input placeholder="Action item title" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} className="h-8 text-xs" />
                <Button size="sm" className="h-8 text-xs" onClick={() => {
                  if (newItemTitle) {
                    createItem.mutate({ regulatory_document_id: doc.id, title: newItemTitle, item_number: `${items.length + 1}` });
                    setNewItemTitle(''); setAddingItem(false);
                  }
                }}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddingItem(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setAddingItem(true)}>
                <Plus className="h-3 w-3" /> Add Action Item
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function AddDocDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: properties = [] } = useProperties();
  const createDoc = useCreateRegulatoryDocument();
  const [form, setForm] = useState({ title: '', doc_type: 'other', agency: 'Other', property_id: '', case_number: '', final_compliance_date: '', penalty_amount: '', description: '' });

  const handleSave = () => {
    if (!form.title) return;
    createDoc.mutate({
      title: form.title, doc_type: form.doc_type, agency: form.agency,
      property_id: form.property_id || null, case_number: form.case_number || null,
      final_compliance_date: form.final_compliance_date || null,
      penalty_amount: form.penalty_amount ? parseFloat(form.penalty_amount) : null,
      description: form.description || null,
    } as any, { onSuccess: () => { onOpenChange(false); setForm({ title: '', doc_type: 'other', agency: 'Other', property_id: '', case_number: '', final_compliance_date: '', penalty_amount: '', description: '' }); } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Add Regulatory Document</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><Label>Type</Label>
            <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Agency</Label>
            <Select value={form.agency} onValueChange={v => setForm(f => ({ ...f, agency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{AGENCIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Property</Label>
            <Select value={form.property_id || 'none'} onValueChange={v => setForm(f => ({ ...f, property_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent><SelectItem value="none">None</SelectItem>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Case Number</Label><Input value={form.case_number} onChange={e => setForm(f => ({ ...f, case_number: e.target.value }))} /></div>
          <div><Label>Final Compliance Date</Label><Input type="date" value={form.final_compliance_date} onChange={e => setForm(f => ({ ...f, final_compliance_date: e.target.value }))} /></div>
          <div><Label>Penalty Amount</Label><Input type="number" value={form.penalty_amount} onChange={e => setForm(f => ({ ...f, penalty_amount: e.target.value }))} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title}>Add Document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: 'JetBrains Mono' }}>{label}</p>
        <p className={`text-xl font-bold ${color || ''}`}>{value}</p>
      </div>
    </div>
  );
}

export default function CorrectiveActionPage() {
  const { data: docs = [], isLoading } = useRegulatoryDocuments();
  const stats = useCorrectiveActionStats();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-10 w-72" /><Skeleton className="h-[400px]" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1" style={{ fontFamily: 'JetBrains Mono' }}>REGULATORY COMPLIANCE</p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Instrument Serif' }}>Corrective Actions</h1>
          <p className="text-sm text-muted-foreground mt-1">Every agency document. Every required action.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Document</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Documents" value={stats.activeDocs} />
        <StatCard label="Total Documents" value={stats.totalDocs} />
        <StatCard label="Financial Exposure" value={stats.totalExposure > 0 ? `$${stats.totalExposure.toLocaleString()}` : '$0'} color="text-amber-500" />
      </div>

      <div className="space-y-4">
        {docs.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            No regulatory documents. Add your first document to start tracking.
          </div>
        ) : (
          docs.map(doc => <DocumentCard key={doc.id} doc={doc} />)
        )}
      </div>

      <AddDocDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
