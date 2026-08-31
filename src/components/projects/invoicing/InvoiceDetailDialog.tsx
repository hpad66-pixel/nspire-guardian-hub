import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Send, CheckCircle2, Plus, Loader2, Mail } from 'lucide-react';
import { useInvoiceDetail, useConsultingInvoices, type ConsultingInvoice } from '@/hooks/useConsultingInvoices';
import { downloadConsultingInvoicePdf, generateConsultingInvoicePdf } from '@/lib/pdf/consultingInvoice';
import { useCoSettings } from '@/hooks/useCoSettings';
import { SendExternalEmailDialog } from '@/components/projects/SendExternalEmailDialog';
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
  const { data: coSettings } = useCoSettings();
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailHtml, setEmailHtml] = useState('');
  const [pdfAttachment, setPdfAttachment] = useState<
    { filename: string; contentBase64: string; contentType: string } | undefined
  >();

  const inv: ConsultingInvoice | undefined = data?.invoice;
  const lines = data?.lines ?? [];
  const payments = data?.payments ?? [];
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = (Number(inv?.total) || 0) - paid;
  const meta = inv ? INVOICE_STATUS_META[inv.status] : null;

  const branding = {
    companyName: coSettings?.company_name ?? coSettings?.wordmark ?? null,
    companyAddress: coSettings?.company_address ?? null,
    companyCity: coSettings?.company_city ?? null,
    companyEmail: coSettings?.company_email ?? null,
    companyContact: coSettings?.company_contact ?? null,
    wordmark: coSettings?.wordmark ?? null,
    footer: coSettings?.footer ?? null,
  };

  const pdfInput = () => {
    if (!inv) return null;
    return {
      invoiceNo: inv.invoice_no,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      projectName,
      clientName,
      tenantName: branding.companyName,
      notes: inv.notes,
      lines: lines.map((l) => ({
        description: l.description,
        fee_amount: Number(l.fee_amount),
        pct_prev: Number(l.pct_prev),
        pct_this: Number(l.pct_this),
        amount: Number(l.amount),
      })),
      subtotal: Number(inv.subtotal),
      total: Number(inv.total),
      amountPaid: paid,
      branding,
    };
  };

  const handlePdf = () => {
    const input = pdfInput();
    if (!input) return;
    downloadConsultingInvoicePdf(input);
  };

  const handleSend = () => {
    if (!inv) return;
    const company = branding.companyName || 'APAS Consulting';
    const rows = lines
      .map(
        (l) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${l.description}</td>` +
          `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums">${money(Number(l.amount))}</td></tr>`,
      )
      .join('');
    setEmailHtml(`
      <div style="font-family:Georgia,serif;color:#1A1714;max-width:560px">
        <div style="border-bottom:3px solid #C4A35A;padding-bottom:12px;margin-bottom:20px">
          <div style="font-size:18px;font-weight:700">${company}</div>
          <div style="color:#1D6FE8;font-size:14px;margin-top:4px">Invoice #${inv.invoice_no}</div>
        </div>
        <p>Please find Invoice #${inv.invoice_no} for <strong>${projectName}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
        <p style="font-size:16px"><strong>Amount due: ${money(balance)}</strong></p>
        ${inv.due_date ? `<p style="color:#878581">Due ${inv.due_date}</p>` : ''}
        <p style="color:#878581;font-size:13px">A branded PDF is attached for your records.</p>
      </div>
    `);
    const input = pdfInput();
    if (input) {
      try {
        const doc = generateConsultingInvoicePdf(input);
        const dataUri = doc.output('datauristring') as string;
        setPdfAttachment({
          filename: `Invoice-${inv.invoice_no}.pdf`,
          contentBase64: dataUri.split(',')[1] ?? '',
          contentType: 'application/pdf',
        });
      } catch {
        setPdfAttachment(undefined);
      }
    } else {
      setPdfAttachment(undefined);
    }
    setEmailOpen(true);
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

  const markSent = () => {
    if (!inv) return;
    setStatus.mutate({ id: inv.id, status: 'sent' });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-[Playfair_Display] text-xl">
              Invoice #{inv?.invoice_no ?? ''}
              {meta && <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span>}
            </DialogTitle>
          </DialogHeader>

          {isLoading || !inv ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-4">
              {/* Branded preview strip */}
              <div className="rounded-xl border bg-gradient-to-br from-[#FAF8F4] to-white p-4">
                <div className="flex items-start justify-between gap-3 border-b-2 border-[#C4A35A] pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C4A35A]">
                      {branding.companyName || 'APAS Consulting'}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">Invoice #{inv.invoice_no}</p>
                    <p className="text-sm text-muted-foreground">{projectName}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Bill to</p>
                    <p className="font-medium">{clientName || '—'}</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--apas-sapphire)]">
                      {money(balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">balance due</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b bg-muted/40">
                      <th className="font-medium px-3 py-2">Description</th>
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
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{money(Number(l.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end gap-1 text-sm pr-1">
                <div className="flex gap-8"><span className="text-muted-foreground">Total</span><span className="font-medium w-28 text-right tabular-nums">{money(Number(inv.total))}</span></div>
                {paid > 0 && <div className="flex gap-8"><span className="text-muted-foreground">Paid</span><span className="w-28 text-right tabular-nums">- {money(paid)}</span></div>}
                <div className="flex gap-8"><span className="text-muted-foreground">Balance</span><span className="font-semibold w-28 text-right tabular-nums text-[var(--apas-sapphire)]">{money(balance)}</span></div>
              </div>

              <div className="border-t pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payments</div>
                {payments.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{new Date(p.received_date + 'T00:00:00').toLocaleDateString()}</span>
                        <span className="tabular-nums">{money(Number(p.amount))}</span>
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
                <Button size="sm" variant="outline" onClick={handleSend} className="gap-1.5"><Mail className="h-4 w-4" />Email invoice</Button>
                {inv.status === 'draft' && (
                  <Button size="sm" onClick={markSent} disabled={setStatus.isPending} className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
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
                <p className="text-xs text-muted-foreground">Marking as sent locks billed % on linked scopes. Email uses your project CRM contacts first.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {inv && (
        <SendExternalEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          documentType="invoice"
          documentTitle={`Invoice #${inv.invoice_no}`}
          documentId={inv.id}
          projectName={projectName}
          projectId={projectId}
          defaultSubject={`Invoice #${inv.invoice_no} — ${projectName}`}
          contentHtml={emailHtml}
          onSent={() => {
            if (inv.status === 'draft') markSent();
          }}
          pdfAttachment={pdfAttachment}
        />
      )}
    </>
  );
}
