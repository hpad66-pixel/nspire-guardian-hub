import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProjectContracts } from '@/hooks/useProjectContracts';
import { useContractInvoices, useContractChangeOrders, useContractPayments } from '@/hooks/useContractFinancials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Edit, FileText, Calendar, DollarSign,
  Building2, Users, AlertTriangle, CheckCircle2, Clock,
  ShieldCheck, FileSignature, MapPin, Plus, Trash2, CreditCard,
  TrendingUp, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  out_for_signature: 'bg-amber-100 text-amber-800',
  executed: 'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  out_for_signature: 'Out for Signature',
  executed: 'Executed',
  terminated: 'Terminated',
};
const INV_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};
const CO_STATUS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  voided: 'bg-gray-100 text-gray-500',
};

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export default function ContractDashboardPage() {
  const { projectId, contractId } = useParams<{ projectId: string; contractId: string }>();
  const { data: contracts = [], isLoading } = useProjectContracts(projectId!);
  const invoices = useContractInvoices(contractId!);
  const changeOrders = useContractChangeOrders(contractId!);
  const payments = useContractPayments(contractId!);

  // Inline add state
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddCO, setShowAddCO] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [invForm, setInvForm] = useState({ invoice_number: '', invoice_date: '', amount: '', retainage: '', notes: '' });
  const [coForm, setCoForm] = useState({ co_number: '', description: '', amount: '', co_date: '', reason: '', notes: '' });
  const [payForm, setPayForm] = useState({ payment_date: '', amount: '', reference: '', payment_method: '', notes: '' });

  const contract = contracts.find((c) => c.id === contractId);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading contract…</div>;
  if (!contract) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">Contract not found.</p>
        <Link to={`/projects/${projectId}/contracts`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Contracts</Button>
        </Link>
      </div>
    );
  }

  const sov = contract.sov_items ?? [];
  const invList = invoices.data ?? [];
  const coList = changeOrders.data ?? [];
  const payList = payments.data ?? [];

  // Financials
  const contractValue = contract.base_contract_amount ?? 0;
  const approvedCOs = coList.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  const revisedValue = contractValue + approvedCOs;
  const totalBilled = invList.filter(i => ['approved', 'paid'].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPaid = payList.reduce((s, p) => s + p.amount, 0);
  const retainageHeld = invList.filter(i => ['approved', 'paid'].includes(i.status)).reduce((s, i) => s + i.retainage, 0);
  const balance = revisedValue - totalBilled;
  const overallPct = pct(totalBilled, revisedValue);

  async function submitInvoice() {
    if (!invForm.amount) return;
    try {
      await invoices.create.mutateAsync({
        contract_id: contractId!,
        invoice_number: invForm.invoice_number || null,
        invoice_date: invForm.invoice_date || null,
        amount: parseFloat(invForm.amount),
        retainage: parseFloat(invForm.retainage || '0'),
        notes: invForm.notes || null,
        status: 'draft',
      } as any);
      setInvForm({ invoice_number: '', invoice_date: '', amount: '', retainage: '', notes: '' });
      setShowAddInvoice(false);
      toast.success('Invoice added');
    } catch (e: any) { toast.error(e.message); }
  }

  async function submitCO() {
    if (!coForm.description || !coForm.amount) return;
    try {
      await changeOrders.create.mutateAsync({
        contract_id: contractId!,
        co_number: coForm.co_number || null,
        description: coForm.description,
        amount: parseFloat(coForm.amount),
        co_date: coForm.co_date || null,
        reason: coForm.reason || null,
        notes: coForm.notes || null,
        status: 'pending',
      } as any);
      setCoForm({ co_number: '', description: '', amount: '', co_date: '', reason: '', notes: '' });
      setShowAddCO(false);
      toast.success('Change order added');
    } catch (e: any) { toast.error(e.message); }
  }

  async function submitPayment() {
    if (!payForm.payment_date || !payForm.amount) return;
    try {
      await payments.create.mutateAsync({
        contract_id: contractId!,
        payment_date: payForm.payment_date,
        amount: parseFloat(payForm.amount),
        reference: payForm.reference || null,
        payment_method: payForm.payment_method || null,
        notes: payForm.notes || null,
      } as any);
      setPayForm({ payment_date: '', amount: '', reference: '', payment_method: '', notes: '' });
      setShowAddPayment(false);
      toast.success('Payment recorded');
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to={`/projects/${projectId}/contracts`} className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Contracts
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-xs">{contract.contract_title}</span>
          </div>
          <Link to={`/projects/${projectId}/contracts/${contractId}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1.5" />Edit Contract</Button>
          </Link>
        </div>

        {/* Header */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)]" />
                  <h1 className="text-xl font-bold">{contract.contract_title}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[contract.status] ?? STATUS_STYLE.draft}`}>
                    {STATUS_LABEL[contract.status] ?? contract.status}
                  </span>
                </div>
                {contract.contract_number && <p className="text-sm text-muted-foreground font-mono">#{contract.contract_number}</p>}
                {contract.project_address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{contract.project_address}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{fmt(revisedValue)}</p>
                <p className="text-xs text-muted-foreground">{approvedCOs !== 0 ? `Base ${fmt(contractValue)} + COs ${fmt(approvedCOs)}` : 'Base Contract Value'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Revised Value', value: fmt(revisedValue), sub: `${approvedCOs >= 0 ? '+' : ''}${fmt(approvedCOs)} COs`, icon: TrendingUp, color: 'text-foreground' },
            { label: 'Billed to Date', value: fmt(totalBilled), sub: `${overallPct}% complete`, icon: Receipt, color: 'text-[var(--apas-sapphire)]' },
            { label: 'Paid to Date', value: fmt(totalPaid), sub: `${fmt(totalBilled - totalPaid)} outstanding`, icon: CreditCard, color: 'text-emerald-600' },
            { label: 'Retainage Held', value: fmt(retainageHeld), sub: `${contract.retainage_percent ?? 5}% rate`, icon: ShieldCheck, color: 'text-amber-600' },
            { label: 'Contract Balance', value: fmt(balance), sub: 'Remaining to bill', icon: Clock, color: balance < 0 ? 'text-destructive' : 'text-foreground' },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress bar */}
        {revisedValue > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Overall Completion</p>
                <span className="text-sm font-bold">{overallPct}%</span>
              </div>
              <Progress value={overallPct} className="h-3" />
            </CardContent>
          </Card>
        )}

        {/* Main tabs */}
        <Tabs defaultValue="invoices">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" />Invoices
              {invList.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{invList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="change-orders" className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />Change Orders
              {coList.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{coList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />Payments
              {payList.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{payList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="sov" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />SOV
              {sov.length > 0 && <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{sov.length}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ── INVOICES TAB ── */}
          <TabsContent value="invoices" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{invList.length} invoice{invList.length !== 1 ? 's' : ''} · {fmt(totalBilled)} approved/paid</p>
              <Button size="sm" onClick={() => setShowAddInvoice(v => !v)}>
                <Plus className="h-4 w-4 mr-1" />Add Invoice
              </Button>
            </div>

            {showAddInvoice && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">New Invoice</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Invoice #</label>
                      <Input value={invForm.invoice_number} onChange={e => setInvForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Invoice Date</label>
                      <Input type="date" value={invForm.invoice_date} onChange={e => setInvForm(f => ({ ...f, invoice_date: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Amount *</label>
                      <Input type="number" value={invForm.amount} onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Retainage</label>
                      <Input type="number" value={invForm.retainage} onChange={e => setInvForm(f => ({ ...f, retainage: e.target.value }))} placeholder="0.00" className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <Input value={invForm.notes} onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={submitInvoice} disabled={invoices.create.isPending}>Save Invoice</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddInvoice(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {invList.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No invoices yet. Click "Add Invoice" to record one.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">Invoice #</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-right p-3">Retainage</th>
                        <th className="text-right p-3">Net Due</th>
                        <th className="text-center p-3">Status</th>
                        <th className="p-3 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {invList.map(inv => (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono">{inv.invoice_number ?? '—'}</td>
                          <td className="p-3 text-muted-foreground">{fmtDate(inv.invoice_date)}</td>
                          <td className="p-3 text-right font-mono">{fmt(inv.amount)}</td>
                          <td className="p-3 text-right font-mono text-amber-600">{inv.retainage > 0 ? fmt(inv.retainage) : '—'}</td>
                          <td className="p-3 text-right font-mono font-medium">{fmt(inv.net_due ?? (inv.amount - inv.retainage))}</td>
                          <td className="p-3 text-center">
                            <select
                              value={inv.status}
                              onChange={async e => {
                                await invoices.update.mutateAsync({ id: inv.id, status: e.target.value as any });
                              }}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${INV_STATUS[inv.status]}`}
                            >
                              {['draft', 'submitted', 'approved', 'paid', 'rejected'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <button onClick={() => invoices.remove.mutate(inv.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm">
                        <td colSpan={2} className="p-3 text-right">Totals</td>
                        <td className="p-3 text-right font-mono">{fmt(invList.reduce((s, i) => s + i.amount, 0))}</td>
                        <td className="p-3 text-right font-mono text-amber-600">{fmt(invList.reduce((s, i) => s + i.retainage, 0))}</td>
                        <td className="p-3 text-right font-mono">{fmt(invList.reduce((s, i) => s + (i.net_due ?? (i.amount - i.retainage)), 0))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── CHANGE ORDERS TAB ── */}
          <TabsContent value="change-orders" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{coList.length} change order{coList.length !== 1 ? 's' : ''} · {fmt(approvedCOs)} approved</p>
              <Button size="sm" onClick={() => setShowAddCO(v => !v)}>
                <Plus className="h-4 w-4 mr-1" />Add Change Order
              </Button>
            </div>

            {showAddCO && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">New Change Order</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">CO #</label>
                      <Input value={coForm.co_number} onChange={e => setCoForm(f => ({ ...f, co_number: e.target.value }))} placeholder="CO-001" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Date</label>
                      <Input type="date" value={coForm.co_date} onChange={e => setCoForm(f => ({ ...f, co_date: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Amount *</label>
                      <Input type="number" value={coForm.amount} onChange={e => setCoForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Description *</label>
                      <Input value={coForm.description} onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))} placeholder="Scope change description" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Reason</label>
                      <Input value={coForm.reason} onChange={e => setCoForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Owner request" className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={submitCO} disabled={changeOrders.create.isPending}>Save Change Order</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCO(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {coList.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No change orders yet. Click "Add Change Order" to record one.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">CO #</th>
                        <th className="text-left p-3">Description</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-center p-3">Status</th>
                        <th className="p-3 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {coList.map(co => (
                        <tr key={co.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 font-mono">{co.co_number ?? '—'}</td>
                          <td className="p-3">
                            <p>{co.description}</p>
                            {co.reason && <p className="text-xs text-muted-foreground">{co.reason}</p>}
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(co.co_date)}</td>
                          <td className={`p-3 text-right font-mono font-medium ${co.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            {co.amount >= 0 ? '+' : ''}{fmt(co.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <select
                              value={co.status}
                              onChange={async e => {
                                await changeOrders.update.mutateAsync({ id: co.id, status: e.target.value as any });
                              }}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${CO_STATUS[co.status]}`}
                            >
                              {['pending', 'approved', 'rejected', 'voided'].map(s => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <button onClick={() => changeOrders.remove.mutate(co.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm">
                        <td colSpan={3} className="p-3 text-right">Approved Total</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{fmt(approvedCOs)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── PAYMENTS TAB ── */}
          <TabsContent value="payments" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{payList.length} payment{payList.length !== 1 ? 's' : ''} received · {fmt(totalPaid)} total</p>
              <Button size="sm" onClick={() => setShowAddPayment(v => !v)}>
                <Plus className="h-4 w-4 mr-1" />Record Payment
              </Button>
            </div>

            {showAddPayment && (
              <Card className="border-dashed">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">Record Payment Received</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Payment Date *</label>
                      <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Amount *</label>
                      <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Reference / Check #</label>
                      <Input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="CHK-1234" className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Payment Method</label>
                      <Input value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Check / ACH / Wire" className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={submitPayment} disabled={payments.create.isPending}>Save Payment</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddPayment(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {payList.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No payments recorded yet. Click "Record Payment" when payment is received.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Reference</th>
                        <th className="text-left p-3">Method</th>
                        <th className="text-right p-3">Amount</th>
                        <th className="text-left p-3">Notes</th>
                        <th className="p-3 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {payList.map(pay => (
                        <tr key={pay.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 whitespace-nowrap">{fmtDate(pay.payment_date)}</td>
                          <td className="p-3 font-mono">{pay.reference ?? '—'}</td>
                          <td className="p-3 text-muted-foreground">{pay.payment_method ?? '—'}</td>
                          <td className="p-3 text-right font-mono font-medium text-emerald-600">{fmt(pay.amount)}</td>
                          <td className="p-3 text-muted-foreground text-xs">{pay.notes ?? '—'}</td>
                          <td className="p-3">
                            <button onClick={() => payments.remove.mutate(pay.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 font-bold text-sm">
                        <td colSpan={3} className="p-3 text-right">Total Received</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{fmt(totalPaid)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── SOV TAB ── */}
          <TabsContent value="sov" className="mt-4">
            {sov.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No SOV items. Edit the contract to add line items.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="text-left p-3 w-8">#</th>
                          <th className="text-left p-3">Description</th>
                          <th className="text-right p-3 whitespace-nowrap">Qty / Unit</th>
                          <th className="text-right p-3">Unit Cost</th>
                          <th className="text-right p-3">Subtotal</th>
                          <th className="text-right p-3">Billed</th>
                          <th className="p-3 w-28">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sov.slice().sort((a, b) => a.item_number - b.item_number).map((item) => {
                          const billedPct = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                          return (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="p-3 text-muted-foreground font-mono">{item.item_number}</td>
                              <td className="p-3">
                                <p className="font-medium leading-snug">{item.description}</p>
                                {item.budget_code && <span className="text-xs text-muted-foreground font-mono">{item.budget_code}</span>}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">{item.quantity} {item.unit}</td>
                              <td className="p-3 text-right font-mono">{fmt(item.unit_cost)}</td>
                              <td className="p-3 text-right font-mono font-medium">{fmt(item.subtotal)}</td>
                              <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">
                                {item.billed_to_date > 0 ? fmt(item.billed_to_date) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <Progress value={billedPct} className="h-1.5 flex-1" />
                                  <span className="text-xs text-muted-foreground w-8 text-right">{billedPct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/60 font-bold">
                          <td colSpan={4} className="p-3 text-right text-sm">Grand Total</td>
                          <td className="p-3 text-right font-mono text-base">{fmt(sov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                          <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0))}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Progress value={overallPct} className="h-1.5 flex-1" />
                              <span className="text-xs w-8 text-right">{overallPct}%</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Contract details (parties, dates, terms, scope) */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Contract Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Prime Contractor / Owner</p>
                <p className="font-medium">{contract.prime_contractor_name ?? '—'}</p>
                {contract.prime_contractor_address && <p className="text-muted-foreground">{contract.prime_contractor_address}</p>}
                {contract.prime_contractor_contact && <p>{contract.prime_contractor_contact}</p>}
                {contract.prime_contractor_email && (
                  <a href={`mailto:${contract.prime_contractor_email}`} className="text-[var(--apas-sapphire)] hover:underline">{contract.prime_contractor_email}</a>
                )}
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Subcontractor</p>
                <p className="font-medium">{contract.subcontractor_name ?? '—'}</p>
                {contract.subcontractor_address && <p className="text-muted-foreground">{contract.subcontractor_address}</p>}
                {contract.subcontractor_contact && <p>{contract.subcontractor_contact}</p>}
                {contract.subcontractor_email && (
                  <a href={`mailto:${contract.subcontractor_email}`} className="text-[var(--apas-sapphire)] hover:underline">{contract.subcontractor_email}</a>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {[
                { label: 'Contract Date', val: contract.contract_date },
                { label: 'Start Date', val: contract.start_date },
                { label: 'Substantial Completion', val: contract.substantial_completion_date },
                { label: 'Final Completion', val: contract.final_completion_date },
                { label: 'Actual Completion', val: contract.actual_completion_date },
                { label: 'Signed Contract Received', val: contract.signed_contract_received_date },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-medium ${!val ? 'text-muted-foreground' : ''}`}>{fmtDate(val)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {contract.special_conditions && (
          <Card>
            <CardContent className="p-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                <p className="font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Special Conditions</p>
                <p className="leading-relaxed">{contract.special_conditions}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
