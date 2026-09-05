import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { BriefcaseBusiness, CheckCircle2, CircleDollarSign, Plus, ReceiptText, ShieldCheck, XCircle } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useConsultingCosts, useConsultingFinancialPosition, type ConsultingCost, type ConsultingCostType } from '@/hooks/useConsultingCashFlow';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import { useOrganizations } from '@/hooks/useDirectory';
import { money } from '@/components/projects/invoicing/invoiceMeta';

const today = () => new Date().toISOString().slice(0, 10);
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', approved: 'Approved', partially_paid: 'Partially paid', paid: 'Paid', void: 'Void',
};
const TYPE_LABEL: Record<ConsultingCostType, string> = {
  subcontractor: 'Subcontractor', consultant: 'Consultant', reimbursable: 'Reimbursable',
  internal_labor: 'Internal labor', other: 'Other',
};

function NewCostDialog({ open, onOpenChange, projectId }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: string }) {
  const { create } = useConsultingCosts(projectId);
  const { data: organizations = [] } = useOrganizations();
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const approved = proposals.filter((proposal) => proposal.status === 'approved');
  const [vendorOrgId, setVendorOrgId] = useState('manual');
  const [vendorName, setVendorName] = useState('');
  const [costType, setCostType] = useState<ConsultingCostType>('subcontractor');
  const [proposalId, setProposalId] = useState('none');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [billDate, setBillDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');

  const chooseVendor = (id: string) => {
    setVendorOrgId(id);
    if (id !== 'manual') setVendorName(organizations.find((org) => org.id === id)?.name ?? '');
  };

  const save = async () => {
    await create.mutateAsync({
      vendor_org_id: vendorOrgId === 'manual' ? null : vendorOrgId,
      vendor_name: vendorName,
      cost_type: costType,
      proposal_id: proposalId === 'none' ? null : proposalId,
      reference_no: reference.trim() || null,
      description: description.trim() || null,
      bill_date: billDate,
      due_date: dueDate || null,
      amount: Number(amount.replace(/[^0-9.-]/g, '')),
      status: 'approved',
    });
    setVendorOrgId('manual'); setVendorName(''); setReference(''); setDescription(''); setAmount(''); setDueDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader><DialogTitle>Record subcontractor or project cost</DialogTitle><DialogDescription>This approved cost becomes part of project A/P and final net-profit reconciliation.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-1.5 md:col-span-2"><Label>Existing company</Label><Select value={vendorOrgId} onValueChange={chooseVendor}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Enter a company manually</SelectItem>{organizations.filter((org) => ['sub', 'vendor', 'consultant', 'other'].includes(org.kind)).map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Vendor / subcontractor *</Label><Input value={vendorName} onChange={(event) => setVendorName(event.target.value)} placeholder="Company or person being paid" /></div>
          <div className="grid gap-1.5"><Label>Cost type</Label><Select value={costType} onValueChange={(value) => setCostType(value as ConsultingCostType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Invoice / reference</Label><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="INV-1001" /></div>
          <div className="grid gap-1.5"><Label>Approved amount *</Label><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div>
          <div className="grid gap-1.5"><Label>Bill date</Label><Input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          <div className="grid gap-1.5 md:col-span-2"><Label>Related executed proposal</Label><Select value={proposalId} onValueChange={setProposalId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">General project cost</SelectItem>{approved.map((proposal) => <SelectItem key={proposal.id} value={proposal.id}>{proposal.proposal_no} · {proposal.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5 md:col-span-2"><Label>Description</Label><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Scope, deliverable, or reason for this cost" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={create.isPending || !vendorName.trim() || !(Number(amount) > 0)}>{create.isPending ? 'Saving…' : 'Approve cost'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function PaymentDialog({ cost, onOpenChange, projectId }: { cost: ConsultingCost | null; onOpenChange: (open: boolean) => void; projectId: string }) {
  const { addPayment } = useConsultingCosts(projectId);
  const current = cost as (ConsultingCost & { balance_due?: number }) | null;
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(today());
  const [method, setMethod] = useState('Wire');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const balance = Number(current?.balance_due ?? current?.amount ?? 0);
  const pay = async () => {
    if (!current) return;
    await addPayment.mutateAsync({ costId: current.id, amount: Number(amount), paid_date: paidDate, method, reference: reference.trim() || null, note: note.trim() || null });
    setAmount(''); setReference(''); setNote(''); onOpenChange(false);
  };
  return <Dialog open={!!cost} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Pay {current?.vendor_name}</DialogTitle><DialogDescription>Remaining approved balance: {money(balance)}. The payment will flow into cash out and net profit.</DialogDescription></DialogHeader><div className="grid gap-3 py-2 sm:grid-cols-2"><div className="grid gap-1.5"><Label>Amount</Label><Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={balance.toFixed(2)} /></div><div className="grid gap-1.5"><Label>Paid date</Label><Input type="date" value={paidDate} onChange={(event) => setPaidDate(event.target.value)} /></div><div className="grid gap-1.5"><Label>Method</Label><Input value={method} onChange={(event) => setMethod(event.target.value)} placeholder="Wire / ACH / check" /></div><div className="grid gap-1.5"><Label>Reference</Label><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Confirmation or check #" /></div><div className="grid gap-1.5 sm:col-span-2"><Label>Note</Label><Input value={note} onChange={(event) => setNote(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={pay} disabled={addPayment.isPending || !(Number(amount) > 0) || Number(amount) > balance}>{addPayment.isPending ? 'Recording…' : 'Record payment'}</Button></DialogFooter></DialogContent></Dialog>;
}

export default function ConsultingCostsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: costs = [], isLoading, setStatus } = useConsultingCosts(projectId);
  const { position } = useConsultingFinancialPosition(projectId);
  const [newOpen, setNewOpen] = useState(false);
  const [paying, setPaying] = useState<ConsultingCost | null>(null);
  const active = useMemo(() => costs.filter((cost) => cost.status !== 'void'), [costs]);
  const p = position.data;

  return <div className="container mx-auto max-w-6xl space-y-6 p-6"><FinancialSubNav />
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2"><BriefcaseBusiness className="mt-1 h-6 w-6 text-[var(--apas-sapphire)]" /><div><h1 className="text-2xl font-bold">Costs &amp; subcontractors</h1><p className="text-sm text-muted-foreground">Approve vendor costs, pay subcontractors, and preserve the complete cost side of the engagement.</p></div></div><Button onClick={() => setNewOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Record cost</Button></div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ['Approved costs', money(p?.total_costs ?? 0)], ['Cash paid', money(p?.cash_paid ?? 0)], ['Open A/P', money(p?.open_ap ?? 0)], ['Projected profit', money(p?.projected_net_profit ?? 0)],
    ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" />Approved cost ledger</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-3">Vendor / sub</th><th className="p-3">Reference</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3 text-right">Approved</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Action</th></tr></thead><tbody>
      {isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading costs…</td></tr>}
      {!isLoading && active.length === 0 && <tr><td colSpan={8} className="p-10 text-center"><ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="font-medium">No consulting costs recorded</p><p className="mt-1 text-xs text-muted-foreground">Add subcontractor bills and project expenses before financial closeout.</p></td></tr>}
      {active.map((cost) => <tr key={cost.id} className="border-b last:border-0"><td className="p-3"><p className="font-medium">{cost.vendor_name}</p><p className="text-xs text-muted-foreground">{TYPE_LABEL[cost.cost_type]}</p></td><td className="p-3 font-mono text-xs">{cost.reference_no || '—'}</td><td className="p-3 whitespace-nowrap text-muted-foreground">{format(new Date(`${cost.bill_date}T00:00:00`), 'MMM d, yyyy')}</td><td className="p-3"><span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">{cost.status === 'paid' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <CircleDollarSign className="h-3 w-3 text-amber-600" />}{STATUS_LABEL[cost.status]}</span></td><td className="p-3 text-right tabular-nums">{money(cost.amount)}</td><td className="p-3 text-right tabular-nums text-emerald-700">{money(cost.paid_to_date)}</td><td className="p-3 text-right font-medium tabular-nums">{money(cost.balance_due)}</td><td className="p-3 text-right"><div className="flex justify-end gap-1">{cost.balance_due > 0 && <Button size="sm" variant="outline" onClick={() => setPaying(cost)}>Pay</Button>}{cost.paid_to_date === 0 && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Void cost" onClick={() => setStatus.mutate({ id: cost.id, status: 'void' })}><XCircle className="h-4 w-4" /></Button>}</div></td></tr>)}
    </tbody></table></div></CardContent></Card>
    <div className="flex justify-end"><Button asChild variant="outline"><Link to={`/projects/${projectId}/financials/closeout`}>Review financial closeout</Link></Button></div>
    {projectId && <NewCostDialog open={newOpen} onOpenChange={setNewOpen} projectId={projectId} />}
    {projectId && <PaymentDialog cost={paying} onOpenChange={(value) => !value && setPaying(null)} projectId={projectId} />}
  </div>;
}
