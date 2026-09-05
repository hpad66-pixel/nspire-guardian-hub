import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Award, CircleDollarSign, Plus, Receipt } from 'lucide-react';
import { FinancialSubNav } from './FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsultingInvoices, useConsultingArLedger } from '@/hooks/useConsultingInvoices';
import { useConsultingCashTransactions, useConsultingCosts, useConsultingFinancialPosition } from '@/hooks/useConsultingCashFlow';
import { InvoiceDetailDialog } from '@/components/projects/invoicing/InvoiceDetailDialog';
import { money } from '@/components/projects/invoicing/invoiceMeta';
import type { Project } from '@/hooks/useProjects';

const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function ConsultingCashFlowView({ project }: { project: Project }) {
  const projectId = project.id;
  const { data: invoices = [] } = useConsultingInvoices(projectId);
  const { data: ledger } = useConsultingArLedger(projectId);
  const { data: transactions } = useConsultingCashTransactions(projectId);
  const { data: costs = [] } = useConsultingCosts(projectId);
  const { position } = useConsultingFinancialPosition(projectId);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const p = position.data;
  const openInvoices = useMemo(() => (ledger?.entries ?? []).filter((entry) => entry.status !== 'draft' && entry.balance > 0), [ledger]);
  const vendorPayments = useMemo(() => costs.flatMap((cost) => cost.payments.map((payment) => ({ ...payment, vendor_name: cost.vendor_name, reference_no: cost.reference_no }))).sort((a, b) => b.paid_date.localeCompare(a.paid_date)), [costs]);
  const clientSeed = {
    name: project.client?.contact_name || project.client?.name || null,
    company: project.client?.name || null,
    email: project.client?.contact_email || null,
    phone: project.client?.contact_phone || null,
    address: project.client?.address || null,
    city: project.client?.city || null,
    state: project.client?.state || null,
  };

  return <div className="container mx-auto max-w-6xl space-y-6 p-6"><FinancialSubNav />
    <div className="flex items-start gap-2"><CircleDollarSign className="mt-1 h-6 w-6 text-[var(--apas-sapphire)]" /><div><h1 className="text-2xl font-bold">Consulting cash flow</h1><p className="text-sm text-muted-foreground">Cash received from {project.client?.name || 'the client'} and cash paid to consultants, subcontractors, and project vendors.</p></div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
      ['Client invoiced', p?.invoiced_revenue ?? 0, 'text-foreground'], ['Cash received', p?.cash_received ?? 0, 'text-emerald-700'], ['Cash paid', p?.cash_paid ?? 0, 'text-blue-700'], ['Open A/R + A/P', (p?.open_ar ?? 0) + (p?.open_ap ?? 0), 'text-amber-700'], ['Net profit', p?.net_profit ?? 0, (p?.net_profit ?? 0) >= 0 ? 'text-emerald-700' : 'text-destructive'],
    ].map(([label, value, color]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{money(Number(value))}</p></CardContent></Card>)}</div>

    <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 via-card to-amber-50"><CardContent className="flex flex-wrap items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-double border-emerald-600 bg-white text-emerald-700"><Award className="h-6 w-6" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Live financial result</p><p className="font-[Playfair_Display] text-2xl font-bold">Net Profit: <span className="text-emerald-700">{money(p?.net_profit ?? 0)}</span></p><p className="text-xs text-muted-foreground">Cash received − all cash paid · {(p?.margin_pct ?? 0).toFixed(1)}% margin</p></div><Button asChild variant="outline" className="ml-auto"><Link to={`/projects/${projectId}/financials/closeout`}>Reconcile &amp; close</Link></Button></CardContent></Card>

    <Tabs defaultValue="received"><TabsList><TabsTrigger value="received" className="gap-1.5"><ArrowDownLeft className="h-4 w-4" />Cash in</TabsTrigger><TabsTrigger value="paid" className="gap-1.5"><ArrowUpRight className="h-4 w-4" />Cash out</TabsTrigger></TabsList>
      <TabsContent value="received" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Open client A/R: <span className="font-semibold text-amber-700">{money(p?.open_ar ?? 0)}</span></p><Button asChild size="sm"><Link to={`/projects/${projectId}/financials/client-invoices`}><Plus className="mr-1.5 h-4 w-4" />Create or open invoice</Link></Button></div>
        {openInvoices.length > 0 && <Card><CardContent className="p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices awaiting payment</p><div className="space-y-2">{openInvoices.map((entry) => <button key={entry.invoice_id} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40" onClick={() => setInvoiceId(entry.invoice_id)}><Receipt className="h-4 w-4 text-[var(--apas-sapphire)]" /><div><p className="font-medium">Invoice #{entry.invoice_no}</p><p className="text-xs text-muted-foreground">{entry.subject || 'Client invoice'}</p></div><span className="ml-auto font-semibold tabular-nums text-amber-700">{money(entry.balance)} due</span></button>)}</div></CardContent></Card>}
        <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-3">Received</th><th className="p-3">Invoice</th><th className="p-3">Method / reference</th><th className="p-3 text-right">Cash in</th></tr></thead><tbody>{(transactions?.receipts ?? []).map((receipt) => <tr key={receipt.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{date(receipt.received_date)}</td><td className="p-3">#{receipt.invoice_no} · {receipt.invoice_subject || 'Client invoice'}</td><td className="p-3 text-muted-foreground">{[receipt.method, receipt.note].filter(Boolean).join(' · ') || '—'}</td><td className="p-3 text-right font-semibold tabular-nums text-emerald-700">+ {money(receipt.amount)}</td></tr>)}{(transactions?.receipts ?? []).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No client receipts recorded yet.</td></tr>}</tbody></table></div></CardContent></Card>
      </TabsContent>
      <TabsContent value="paid" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Open vendor A/P: <span className="font-semibold text-amber-700">{money(p?.open_ap ?? 0)}</span></p><Button asChild size="sm"><Link to={`/projects/${projectId}/financials/costs`}><Plus className="mr-1.5 h-4 w-4" />Record cost or payment</Link></Button></div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-3">Paid</th><th className="p-3">Vendor / sub</th><th className="p-3">Method / reference</th><th className="p-3 text-right">Cash out</th></tr></thead><tbody>{vendorPayments.map((payment) => <tr key={payment.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{date(payment.paid_date)}</td><td className="p-3"><p className="font-medium">{payment.vendor_name}</p><p className="text-xs text-muted-foreground">{payment.reference_no || 'Project cost'}</p></td><td className="p-3 text-muted-foreground">{[payment.method, payment.reference].filter(Boolean).join(' · ') || '—'}</td><td className="p-3 text-right font-semibold tabular-nums text-blue-700">− {money(payment.amount)}</td></tr>)}{vendorPayments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No subcontractor or vendor payments recorded yet.</td></tr>}</tbody></table></div></CardContent></Card></TabsContent>
    </Tabs>
    <InvoiceDetailDialog open={!!invoiceId} onOpenChange={(open) => !open && setInvoiceId(null)} projectId={projectId} invoiceId={invoiceId} projectName={project.name} clientName={project.client?.name ?? null} clientSeed={clientSeed} />
  </div>;
}
