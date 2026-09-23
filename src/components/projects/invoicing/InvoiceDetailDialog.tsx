import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Send, Plus, Loader2, Mail, Pencil, Paperclip, Upload, X, RotateCcw, XCircle, Trash2, PenLine, CheckCircle2 } from 'lucide-react';
import {
  invoiceLifecycleActions,
  useInvoiceDetail,
  useConsultingInvoices,
  useConsultingArLedger,
  useProposalBillingMaps,
  type ConsultingInvoice,
  type InvoiceLifecycleAction,
} from '@/hooks/useConsultingInvoices';
import { downloadConsultingInvoicePdf, generateConsultingInvoicePdf } from '@/lib/pdf/consultingInvoice';
import { useCoSettings } from '@/hooks/useCoSettings';
import { SendExternalEmailDialog, type SendExternalEmailPreviewAttachment } from '@/components/projects/SendExternalEmailDialog';
import { ConsultingInvoiceBuilder, type InvoiceClientSeed } from './ConsultingInvoiceBuilder';
import { buildProposalAccountSummaries, type ProposalBillingRow } from '@/lib/consulting/billing';
import {
  APAS_COMPANY_BRANDS,
  invoiceDocumentLabelForCompany,
  invoicePackageSubject,
  type ApasCompanyBrand,
} from '@/lib/financial/apasCompanyBranding';
import { supabase } from '@/integrations/supabase/client';
import { INVOICE_STATUS_META, money } from './invoiceMeta';
import { cn } from '@/lib/utils';
import { TypedSignaturePad } from '@/components/financial/TypedSignaturePad';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  invoiceId: string | null;
  projectName: string;
  clientName?: string | null;
  clientSeed?: InvoiceClientSeed | null;
  billingBrand?: ApasCompanyBrand;
}

interface ReportAttachmentDraft {
  id: string;
  filename: string;
  contentBase64: string;
  contentType: string;
  previewUrl: string;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  projectId,
  invoiceId,
  projectName,
  clientName,
  clientSeed,
  billingBrand = APAS_COMPANY_BRANDS.apas_consulting,
}: Props) {
  const { data, isLoading, addPayment } = useInvoiceDetail(invoiceId);
  const { setStatus, returnToDraft, remove, sign, recordClientApproval } = useConsultingInvoices(projectId);
  const { data: ledger } = useConsultingArLedger(projectId);
  const { billedByProposal, paidByProposal } = useProposalBillingMaps(projectId, open && !!invoiceId);
  const { data: coSettings } = useCoSettings();
  const consultingBrand = billingBrand;
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('');
  const [payNote, setPayNote] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailText, setEmailText] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [pdfAttachment, setPdfAttachment] = useState<
    { filename: string; contentBase64: string; contentType: string } | undefined
  >();
  const [reportAttachments, setReportAttachments] = useState<ReportAttachmentDraft[]>([]);
  const [previewAttachments, setPreviewAttachments] = useState<SendExternalEmailPreviewAttachment[]>([]);
  const [packaging, setPackaging] = useState(false);
  const [signerName, setSignerName] = useState(consultingBrand.senderName);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [clientApprovalName, setClientApprovalName] = useState('');
  const [clientApprovalComments, setClientApprovalComments] = useState('');

  const inv: ConsultingInvoice | undefined = data?.invoice;
  const invoiceDocumentLabel = invoiceDocumentLabelForCompany(consultingBrand);
  const lines = useMemo(() => data?.lines ?? [], [data?.lines]);
  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = (Number(inv?.total) || 0) - paid;
  const meta = inv ? INVOICE_STATUS_META[inv.status] : null;
  const lifecycleActions = inv ? invoiceLifecycleActions(inv, paid) : new Set<InvoiceLifecycleAction>();

  const branding = {
    companyName: consultingBrand.key === 'apas_consulting' ? coSettings?.company_name ?? consultingBrand.legalName : consultingBrand.legalName,
    companyAddress: consultingBrand.key === 'apas_consulting' ? coSettings?.company_address ?? null : null,
    companyCity: consultingBrand.key === 'apas_consulting' ? coSettings?.company_city ?? null : null,
    companyEmail: consultingBrand.key === 'apas_consulting' ? coSettings?.company_email ?? consultingBrand.senderEmail : consultingBrand.senderEmail,
    companyContact: consultingBrand.key === 'apas_consulting' ? coSettings?.company_contact ?? consultingBrand.senderName : consultingBrand.senderName,
    wordmark: coSettings?.wordmark ?? consultingBrand.wordmark,
    footer: consultingBrand.footer,
  };

  const accountSummaries = useMemo(() => {
    const rows: ProposalBillingRow[] = [];
    for (const l of lines) {
      if (!l.proposal_id) continue;
      const fee = Number(l.fee_amount) || 0;
      const thisAmt = Number(l.amount) || 0;
      // previously billed on other invoices = map total minus this line (if already in map)
      const mapBilled = billedByProposal[l.proposal_id] ?? 0;
      const previously = Math.max(0, mapBilled - (inv?.status === 'void' ? 0 : thisAmt));
      const previouslyPaid = paidByProposal[l.proposal_id] ?? 0;
      // Avoid double-counting payments on *this* invoice in "prior paid"
      const thisSharePaid = paid > 0 && Number(inv?.total) > 0
        ? Math.round(paid * (thisAmt / Number(inv?.total)) * 100) / 100
        : 0;
      rows.push({
        proposal_id: l.proposal_id,
        proposal_no: l.description.split('·')[0]?.trim() || 'PROP',
        title: l.description.split('·').slice(1).join('·').trim() || l.description,
        fee_amount: fee,
        previously_billed: previously,
        previously_paid: Math.max(0, previouslyPaid - thisSharePaid),
        remaining: Math.max(0, fee - previously),
        this_amount: thisAmt,
        included: true,
      });
    }
    return buildProposalAccountSummaries(rows);
  }, [lines, billedByProposal, paidByProposal, paid, inv]);

  const priorPayments = useMemo(() => {
    if (!ledger?.entries || !inv) return [];
    return ledger.entries
      .filter((e) => e.invoice_no < inv.invoice_no && e.paid > 0)
      .flatMap((e) =>
        // One summary row per prior invoice that received cash
        [{ invoiceNo: e.invoice_no, date: e.issue_date, amount: e.paid, note: e.subject }],
      );
  }, [ledger, inv]);

  const pdfInput = () => {
    if (!inv) return null;
    const billName = inv.bill_to_name || clientSeed?.name || clientName;
    const billCompany = inv.bill_to_company || clientSeed?.company || null;
    return {
      invoiceNo: inv.invoice_no,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      projectName,
      subject: inv.subject,
      paymentTerms: inv.payment_terms,
      poNumber: inv.po_number,
      clientName: billName,
      clientCompany: billCompany,
      clientEmail: inv.bill_to_email || clientSeed?.email || null,
      clientPhone: inv.bill_to_phone || clientSeed?.phone || null,
      clientAddress: inv.bill_to_address || clientSeed?.address || null,
      clientCity: inv.bill_to_city || clientSeed?.city || null,
      clientState: inv.bill_to_state || clientSeed?.state || null,
      clientPostal: inv.bill_to_postal || clientSeed?.postal || null,
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
      accountSummaries,
      priorPayments,
      branding,
      senderSignedName: inv.sender_signed_name,
      senderSignedAt: inv.sender_signed_at,
      senderSignaturePath: inv.sender_signature_path,
      clientSignedName: inv.client_signed_name,
      clientSignedAt: inv.client_signed_at,
      clientSignaturePath: inv.client_signature_path,
      clientSignatureMethod: inv.client_signature_method,
      clientComments: inv.client_comments,
    };
  };

  const handlePdf = () => {
    const input = pdfInput();
    if (!input) return;
    downloadConsultingInvoicePdf(input);
  };

  const addReportFiles = async (files: FileList | null) => {
    const picked = Array.from(files ?? []);
    if (!picked.length) return;
    const supported = picked.filter((file) => file.type.includes('pdf') || file.type.startsWith('image/'));
    const next = await Promise.all(supported.map(async (file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      filename: file.name,
      contentBase64: await fileToBase64(file),
      contentType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      previewUrl: URL.createObjectURL(file),
    })));
    setReportAttachments((prev) => [...prev, ...next]);
  };

  const handleSend = async () => {
    if (!inv) return;
    setPackaging(true);
    setEmailText(
      [
        `Please see attached Invoice #${inv.invoice_no} for ${projectName}.`,
        `Amount due: ${money(balance)}${inv.due_date ? `\nDue: ${inv.due_date}` : ''}`,
        inv.payment_terms || null,
        reportAttachments.length
          ? 'The invoice PDF package includes the attached report backup.'
          : 'The invoice is attached as a PDF.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    );
    const input = pdfInput();
    if (input) {
      try {
        const doc = generateConsultingInvoicePdf(input);
        const dataUri = doc.output('datauristring') as string;
        const invoiceBase64 = dataUri.split(',')[1] ?? '';
        let finalBase64 = invoiceBase64;
        let finalFilename = `Invoice-${inv.invoice_no}.pdf`;
        let finalPreviewUrl = dataUri;
        if (reportAttachments.length > 0) {
          const { data: pkg, error: pkgErr } = await supabase.functions.invoke('package-pdf', {
            body: {
              basePdfBase64: invoiceBase64,
              basePdfLabel: `Invoice #${inv.invoice_no}`,
              rawItems: reportAttachments.map((attachment) => ({
                base64: attachment.contentBase64,
                contentType: attachment.contentType,
                label: attachment.filename,
              })),
            },
          });
          if (!pkgErr && pkg?.ok && pkg.base64) {
            finalBase64 = pkg.base64;
            finalFilename = `Invoice-${inv.invoice_no}-client-package.pdf`;
            finalPreviewUrl = `data:application/pdf;base64,${pkg.base64}`;
          }
        }
        setPdfAttachment({
          filename: finalFilename,
          contentBase64: finalBase64,
          contentType: 'application/pdf',
        });
        setPreviewAttachments([
          {
            filename: finalFilename,
            url: finalPreviewUrl,
            contentType: 'application/pdf',
          },
          ...reportAttachments.map((attachment) => ({
            filename: attachment.filename,
            url: attachment.previewUrl,
            contentType: attachment.contentType,
          })),
        ]);
      } catch {
        setPreviewAttachments([]);
        setPdfAttachment(undefined);
      }
    } else {
      setPdfAttachment(undefined);
      setPreviewAttachments([]);
    }
    setPackaging(false);
    setEmailOpen(true);
  };

  const recordPayment = async () => {
    const amt = Number(payAmount.replace(/[^0-9.]/g, ''));
    if (!amt) return;
    if (amt > balance + 0.005) return;
    await addPayment.mutateAsync({
      amount: amt,
      received_date: payDate,
      method: payMethod.trim() || null,
      note: payNote.trim() || null,
    });
    setPayAmount('');
    setPayNote('');
    if (inv && amt + paid >= Number(inv.total) && inv.status !== 'paid') {
      setStatus.mutate({ id: inv.id, status: 'paid' });
    } else if (inv?.status === 'draft') {
      setStatus.mutate({ id: inv.id, status: 'sent' });
    }
  };

  const markSent = () => {
    if (!inv) return;
    setStatus.mutate({ id: inv.id, status: 'sent' });
    void supabase
      .from('consulting_invoices' as never)
      .update({ sent_to_client_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
      .eq('id', inv.id);
  };

  const signInvoice = async () => {
    if (!inv) return;
    await sign.mutateAsync({
      id: inv.id,
      name: signerName,
      signatureDataUrl: signatureDataUrl ?? '',
    });
  };

  const recordReturnedClientApproval = async (method: 'electronic' | 'download_print_scan') => {
    if (!inv) return;
    await recordClientApproval.mutateAsync({
      id: inv.id,
      name: clientApprovalName,
      method,
      comments: clientApprovalComments,
    });
    setClientApprovalName('');
    setClientApprovalComments('');
  };

  const deleteEligibleInvoice = async () => {
    if (!inv) return;
    const label = inv.status === 'void' ? 'voided invoice' : 'draft invoice';
    const ok = window.confirm(`Delete ${label} #${inv.invoice_no}? This cannot be undone.`);
    if (!ok) return;
    await remove.mutateAsync(inv.id);
    onOpenChange(false);
  };

  const billDisplay =
    inv?.bill_to_name || inv?.bill_to_company || clientName || clientSeed?.name || '—';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
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
              <div className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: '#d9d4c9' }}>
                <div className="flex items-start justify-between gap-3 border-b-2 pb-3" style={{ borderColor: consultingBrand.accent }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: consultingBrand.accent }}>
                      {branding.companyName || consultingBrand.legalName}
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">Invoice #{inv.invoice_no}</p>
                    {inv.subject && <p className="text-sm text-muted-foreground mt-0.5">{inv.subject}</p>}
                    <p className="text-sm text-muted-foreground">{projectName}</p>
                    {inv.payment_terms && (
                      <p className="text-xs text-muted-foreground mt-1">Terms: {inv.payment_terms}</p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Bill to</p>
                    <p className="font-medium">{billDisplay}</p>
                    {(inv.bill_to_address || clientSeed?.address) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.bill_to_address || clientSeed?.address}
                      </p>
                    )}
                    <p className="mt-2 text-2xl font-black tabular-nums text-[#1A1714]">
                      {money(balance)}
                    </p>
                    <p className="text-xs text-muted-foreground">amount due</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm" style={{ borderColor: `${consultingBrand.accent}55`, background: consultingBrand.surface }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: consultingBrand.accent }}>
                      Client delivery package
                    </div>
                    <p className="mt-1 font-medium" style={{ color: consultingBrand.ink }}>
                      {invoiceDocumentLabel} from {consultingBrand.legalName}
                    </p>
                    <p className="text-xs" style={{ color: consultingBrand.muted }}>
                      Emailing this invoice attaches one branded PDF package. Add separately prepared reports below and ProjOS merges them behind the invoice.
                    </p>
                  </div>
                  <div className="grid gap-1 text-xs">
                    {consultingBrand.packageIncludes.slice(0, 3).map((item) => (
                      <span key={item} className="rounded bg-white/80 px-2 py-1 font-medium" style={{ color: consultingBrand.primary }}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <PenLine className="h-3.5 w-3.5" />
                      Signature lifecycle
                    </div>
                    <p className="mt-1 font-semibold text-[#1A1714]">Sign it, send it, then let the client sign electronically or return a scanned copy.</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', inv.sender_signed_at ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {inv.sender_signed_at ? `Signed by ${inv.sender_signed_name || 'sender'}` : 'Sender signature pending'}
                      </span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', inv.client_signed_at ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {inv.client_signed_at ? `Client signed by ${inv.client_signed_name || 'client'}` : 'Client approval pending'}
                      </span>
                    </div>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
                      The package supports both choices: the client can approve by reply email, or print, sign, scan, and return it. Record the returned approval below so the invoice audit trail is complete.
                    </p>
                  </div>
                  {!inv.sender_signed_at && lifecycleActions.has('sign') && (
                    <div className="w-full max-w-sm rounded-lg border bg-stone-50 p-3">
                      <TypedSignaturePad
                        defaultName={consultingBrand.senderName}
                        onChange={setSignatureDataUrl}
                        onNameChange={setSignerName}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full bg-[#1A1714] text-white hover:bg-[#1A1714]/90"
                        onClick={() => void signInvoice()}
                        disabled={sign.isPending || !signatureDataUrl || !signerName.trim()}
                      >
                        {sign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenLine className="mr-2 h-4 w-4" />}
                        Sign invoice package
                      </Button>
                    </div>
                  )}
                </div>
                {!inv.client_signed_at && inv.sender_signed_at && (
                  <div className="mt-3 rounded-lg border bg-stone-50 p-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <Input
                        value={clientApprovalName}
                        onChange={(event) => setClientApprovalName(event.target.value)}
                        placeholder="Client signer name"
                        className="bg-white"
                      />
                      <Input
                        value={clientApprovalComments}
                        onChange={(event) => setClientApprovalComments(event.target.value)}
                        placeholder="Approval note or email reference"
                        className="bg-white"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={recordClientApproval.isPending || !clientApprovalName.trim()}
                        onClick={() => void recordReturnedClientApproval('electronic')}
                      >
                        Record electronic approval
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={recordClientApproval.isPending || !clientApprovalName.trim()}
                        onClick={() => void recordReturnedClientApproval('download_print_scan')}
                      >
                        Record scanned signed copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {accountSummaries.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <div className="font-semibold uppercase tracking-wide text-[#C4A35A]">Account continuity</div>
                  {accountSummaries.map((s) => (
                    <div key={s.proposal_id} className="flex flex-wrap gap-x-4 text-muted-foreground">
                      <span className="font-medium text-foreground">{s.proposal_no}</span>
                      <span>Approved {money(s.approved_fee)}</span>
                      <span>Prior billed {money(s.previously_billed)}</span>
                      <span>Prior paid {money(s.previously_paid)}</span>
                      <span className="text-[var(--apas-sapphire)]">This invoice {money(s.this_invoice)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      Report backup
                    </div>
                    <p className="mt-1 text-sm font-medium">Attach the separately built report before previewing the package.</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, or JPG files are collated after the invoice into one client package PDF.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted">
                    <Upload className="h-3.5 w-3.5" />
                    Attach report
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void addReportFiles(event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                {reportAttachments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {reportAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{attachment.filename}</span>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                          onClick={() => setReportAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
                          title="Remove report"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                <div className="flex gap-8"><span className="text-muted-foreground">Amount due</span><span className="font-black w-28 text-right tabular-nums text-[#1A1714]">{money(balance)}</span></div>
              </div>

              {inv.notes && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{inv.notes}</p>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Payments received</div>
                {payments.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground">
                          {new Date(p.received_date + 'T00:00:00').toLocaleDateString()}
                          {p.method ? ` · ${p.method}` : ''}
                          {p.note ? ` · ${p.note}` : ''}
                        </span>
                        <span className="tabular-nums font-medium">{money(Number(p.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <Input inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" className="h-8" />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs text-muted-foreground">Method</span>
                    <Input value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="Wire / check" className="h-8" />
                  </div>
                  <Button size="sm" variant="outline" onClick={recordPayment} disabled={addPayment.isPending || !payAmount || Number(payAmount.replace(/[^0-9.]/g, '')) > balance} className="gap-1">
                    <Plus className="h-4 w-4" /> Record
                  </Button>
                </div>
                <Input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Payment note / reference (optional)"
                  className="h-8 mt-2"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {lifecycleActions.has('edit') && (
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
                    <Pencil className="h-4 w-4" />Edit invoice
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handlePdf} className="gap-1.5"><Download className="h-4 w-4" />Download package PDF</Button>
                <Button size="sm" variant="outline" onClick={() => void handleSend()} disabled={packaging} className="gap-1.5">
                  {packaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Preview & email PDF
                </Button>
                {lifecycleActions.has('mark_sent') && (
                  <Button size="sm" onClick={markSent} disabled={setStatus.isPending} className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
                    {setStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Mark as sent
                  </Button>
                )}
                {lifecycleActions.has('return_to_draft') && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => returnToDraft.mutate(inv.id)} disabled={returnToDraft.isPending}>
                    <RotateCcw className="h-4 w-4" />Return to draft
                  </Button>
                )}
                {lifecycleActions.has('void') && (
                  <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-muted-foreground" onClick={() => setStatus.mutate({ id: inv.id, status: 'void' })}>
                    <XCircle className="h-4 w-4" />Void unpaid invoice
                  </Button>
                )}
                {lifecycleActions.has('delete') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => void deleteEligibleInvoice()}
                    disabled={remove.isPending}
                  >
                    {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {inv.status === 'void' ? 'Delete voided invoice' : 'Delete draft'}
                  </Button>
                )}
              </div>
              {inv.status === 'draft' ? (
                <p className="text-xs text-muted-foreground">
                  Edit any line, bill-to, terms, or notes while draft. PDF includes client sign-off and the running account tab.
                </p>
              ) : paid > 0 ? (
                <p className="text-xs text-muted-foreground">
                  This invoice has payment history, so Proj OS keeps it locked for audit. Use adjustments or corrected receipts instead of deleting the record.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No payment is recorded. Return to draft for corrections, or void the issued invoice and keep the audit record.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConsultingInvoiceBuilder
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        projectName={projectName}
        clientSeed={clientSeed}
        editInvoiceId={invoiceId}
        billingBrand={consultingBrand}
        onDeleted={() => onOpenChange(false)}
      />

      {inv && (
        <SendExternalEmailDialog
          open={emailOpen}
          onOpenChange={setEmailOpen}
          documentType="invoice"
          documentTitle={`Invoice #${inv.invoice_no}`}
          documentId={inv.id}
          projectName={projectName}
          projectId={projectId}
          defaultSubject={inv.subject || invoicePackageSubject(consultingBrand, inv.invoice_no, projectName)}
          contentText={emailText}
          deliveryMode="attachment_only"
          fromName={consultingBrand.senderName}
          fromEmail={consultingBrand.senderEmail}
          fromEmailVerified={consultingBrand.senderEmailStatus === 'verified'}
          senderNotice={consultingBrand.senderEmailStatus === 'pending_domain' ? 'Until APASBuild.com is verified in the sending provider, ProjOS prepares the package and uses the verified fallback sender for delivery.' : undefined}
          onSent={() => {
            if (inv.status === 'draft') markSent();
          }}
          pdfAttachment={pdfAttachment}
          previewAttachments={previewAttachments}
        />
      )}
    </>
  );
}
