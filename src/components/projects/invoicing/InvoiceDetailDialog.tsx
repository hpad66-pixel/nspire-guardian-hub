import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Send, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { useInvoiceDetail, useConsultingInvoices, type ConsultingInvoice } from '@/hooks/useConsultingInvoices';
import { downloadConsultingInvoicePdf } from '@/lib/pdf/consultingInvoice';
import { INVOICE_STATUS_META, money } from './invoiceMeta';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  invoiceId: string | null;
  projectName: string;
  clientName?: string | null;
}

export function InvoiceDetailDialog({ open, onOpenChange, projectId, invoiceId, projectName, clientName }: Props) {
  const { data, isLoading, addPayment } = useInvoiceDetail(invoiceId);
  const { setStatus } = useConsultingInvoices(projectId);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));

  const inv: ConsultingInvoice | undefined = data?.invoice;
  const lines = data?.lines ?? [];
  const payments = data?.payments ?? [];
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = (Number(inv?.total) || 0) - paid;
  const meta = inv ? INVOICE_STATUS_META[inv.status] : null;

  const handlePdf = () => {
    if (!inv) return;
    downloadConsultingInvoicePdf({
      invoiceNo: inv.invoice_no,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      projectName,
      clientName,
      notes: inv.notes,
      lines: lines.map((l) => ({ description: l.description, fee_amount: Number(l.fee_amount), pct_prev: Number(l.pct_prev), pct_this: Number(l.pct_this), amount: Number(l.amount) })),
      subtotal: Number(inv.subtotal),
      total: Number(inv.total),
      amountPaid: paid,
    });
  };

  const recordPayment = async () => {
    const amt = Number(payAmount.replace(/[^0-9.]/g, ''));
    if (!amt) return;
    await addPayment.mutateAsync({ amount: amt, received_date: payDate, method: null, note: null });
    setPayAmount('');
    if (inv && amt + paid >= Number(inv.total) && inv.status !== 'paid') {
      setStatus.mutate({ id: inv.id, status: 'paid' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Invoice #{inv?.invoice_no ?? ''}
            {meta && <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !inv ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/40">
                    <th className="font-medium px-3 py-2">Scope</th>
                    <th className="font-medium px-2 py-2 text-right">Prev</th>
                    <th className="font-medium px-2 py-2 text-right">This</th>
                    <th className="font-medium px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{Math.round(Number(l.pct_prev))}%</td>
                      <td className="px-2 py-2 text-right">{Math.round(Number(l.pct_this))}%</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{money(Number(l.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end gap-1 text-sm pr-1">
              <div className="flex gap-8"><span className="text-muted-foreground">Total</span><span className="font-medium w-24 text-right">{money(Number(inv.total))}</span></div>
              {paid > 0 && <div className="flex gap-8"><span className="text-muted-foreground">Paid</span><span className="w-24 text-right">- {money(paid)}</span></div>}
              <div className="flex gap-8"><span className="text-muted-foreground">Balance</span><span className="font-semibold w-24 text-right">{money(balance)}</span></div>
            </div>

            <div className="border-t pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payments</div>
              {payments.length > 0 && (
                <div className="space-y-1 mb-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(p.received_date + 'T00:00:00').toLocaleDateString()}</span>
                      <span>{money(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="grid gap-1 flex-1"><span className="text-xs text-muted-foreground">Amount</span>
                  <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" className="h-8" />
                </div>
                <div className="grid gap-1"><span className="text-xs text-muted-foreground">Date</span>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8" />
                </div>
                <Button size="sm" variant="outline" onClick={recordPayment} disabled={addPayment.isPending || !payAmount}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={handlePdf} className="gap-1.5"><Download className="h-4 w-4" />PDF</Button>
              {inv.status === 'draft' && (
                <Button size="sm" onClick={() => setStatus.mutate({ id: inv.id, status: 'sent' })} disabled={setStatus.isPending} className="gap-1.5">
                  {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Mark as sent
                </Button>
              )}
              {inv.status === 'sent' && (
                <Button size="sm" onClick={() => setStatus.mutate({ id: inv.id, status: 'paid' })} disabled={setStatus.isPending} className="gap-1.5"><CheckCircle2 className="h-4 w-4" />Mark as paid</Button>
              )}
              {inv.status !== 'void' && (
                <Button size="sm" variant="ghost" className="text-muted-foreground ml-auto" onClick={() => setStatus.mutate({ id: inv.id, status: 'void' })}>Void</Button>
              )}
            </div>
            {inv.status === 'draft' && (
              <p className="text-xs text-muted-foreground">Marking as sent locks in the billed % on each scope, so the next invoice bills only new progress.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
