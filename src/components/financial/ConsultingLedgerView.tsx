import { useMemo } from 'react';
import { Download, BookOpen } from 'lucide-react';
import { FinancialSubNav } from './FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useConsultingInvoices } from '@/hooks/useConsultingInvoices';
import { useConsultingCashTransactions, useConsultingCosts, useConsultingFinancialPosition } from '@/hooks/useConsultingCashFlow';
import { money } from '@/components/projects/invoicing/invoiceMeta';
import type { Project } from '@/hooks/useProjects';

interface Row { id: string; date: string; type: string; party: string; reference: string; direction: 'A/R' | 'A/P' | 'Cash in' | 'Cash out'; amount: number }

export function ConsultingLedgerView({ project }: { project: Project }) {
  const { data: invoices = [] } = useConsultingInvoices(project.id);
  const { data: transactions } = useConsultingCashTransactions(project.id);
  const { data: costs = [] } = useConsultingCosts(project.id);
  const { position } = useConsultingFinancialPosition(project.id);
  const rows = useMemo<Row[]>(() => [
    ...invoices.filter((invoice) => invoice.status !== 'void').map((invoice) => ({ id: `invoice-${invoice.id}`, date: invoice.issue_date, type: invoice.status === 'draft' ? 'Client invoice draft' : 'Client invoice', party: invoice.bill_to_company || invoice.bill_to_name || project.client?.name || 'Client', reference: `Invoice #${invoice.invoice_no}`, direction: 'A/R' as const, amount: Number(invoice.total) || 0 })),
    ...(transactions?.receipts ?? []).map((receipt) => ({ id: `receipt-${receipt.id}`, date: receipt.received_date, type: 'Client receipt', party: project.client?.name || 'Client', reference: `Invoice #${receipt.invoice_no}${receipt.method ? ` · ${receipt.method}` : ''}`, direction: 'Cash in' as const, amount: receipt.amount })),
    ...costs.filter((cost) => cost.status !== 'void').map((cost) => ({ id: `cost-${cost.id}`, date: cost.bill_date, type: 'Approved project cost', party: cost.vendor_name, reference: cost.reference_no || cost.cost_type, direction: 'A/P' as const, amount: cost.amount })),
    ...costs.flatMap((cost) => cost.payments.map((payment) => ({ id: `payment-${payment.id}`, date: payment.paid_date, type: 'Vendor payment', party: cost.vendor_name, reference: payment.reference || payment.method || cost.reference_no || 'Payment', direction: 'Cash out' as const, amount: payment.amount }))),
  ].sort((a, b) => b.date.localeCompare(a.date)), [invoices, transactions, costs, project.client?.name]);

  const exportCsv = () => {
    const data = [['Date', 'Type', 'Party', 'Reference', 'Direction', 'Amount'], ...rows.map((row) => [row.date, row.type, row.party, row.reference, row.direction, row.amount.toFixed(2)])];
    const csv = data.map((values) => values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `consulting-ledger-${project.name}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const p = position.data;
  return <div className="container mx-auto max-w-6xl space-y-6 p-6"><FinancialSubNav /><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2"><BookOpen className="mt-1 h-6 w-6 text-[var(--apas-sapphire)]" /><div><h1 className="text-2xl font-bold">Consulting financial ledger</h1><p className="text-sm text-muted-foreground">Every client invoice, receipt, approved cost, and vendor payment in one audit trail.</p></div></div><Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Cash in', p?.cash_received], ['Cash out', p?.cash_paid], ['Open A/R', p?.open_ar], ['Open A/P', p?.open_ap]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{money(Number(value ?? 0))}</p></CardContent></Card>)}</div><Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><th className="p-3">Date</th><th className="p-3">Event</th><th className="p-3">Party</th><th className="p-3">Reference</th><th className="p-3">Side</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{new Date(`${row.date}T00:00:00`).toLocaleDateString()}</td><td className="p-3 font-medium">{row.type}</td><td className="p-3">{row.party}</td><td className="p-3 font-mono text-xs text-muted-foreground">{row.reference}</td><td className="p-3"><span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{row.direction}</span></td><td className={`p-3 text-right font-semibold tabular-nums ${row.direction === 'Cash in' ? 'text-emerald-700' : row.direction === 'Cash out' ? 'text-blue-700' : ''}`}>{money(row.amount)}</td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No financial events yet.</td></tr>}</tbody></table></div></CardContent></Card></div>;
}
