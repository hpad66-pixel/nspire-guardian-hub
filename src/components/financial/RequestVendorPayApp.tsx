import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Link2, Copy, Check, Loader2, Eye, CheckCircle2, Banknote, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useProject } from '@/hooks/useProjects';
import { useCommitments } from '@/hooks/useCommitments';
import { useVendorPayApps, useRequestVendorPayApp, useUpdateVendorPayAppStatus, useDeleteVendorPayApp, useConvertVendorPayApp, type VendorPayApp } from '@/hooks/useVendorPayApps';
import { useInvoice } from '@/hooks/useInvoices';
import { useCommitmentPayments } from '@/hooks/useCommitmentPayments';
import { useSendEmail } from '@/hooks/useSendEmail';
import { openVendorPayAppReport } from '@/lib/financial/vendorPayAppReport';
import { toast } from 'sonner';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  requested: { label: 'Link sent', bg: '#F1EFE8', fg: '#5F5E5A' },
  submitted: { label: 'Submitted', bg: '#E7F0FD', fg: '#1558b0' },
  approved:  { label: 'Approved', bg: '#E1F5EE', fg: '#0F6E56' },
  paid:      { label: 'Paid', bg: '#E1F5EE', fg: '#0F6E56' },
  void:      { label: 'Void', bg: '#FCEBEB', fg: '#A32D2D' },
};
const usd = (n?: number | null) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// GC-side: request an AIA pay app from a vendor via magic link.
export function RequestVendorPayApp({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId ?? null);
  const { data: commitments = [] } = useCommitments(projectId);
  const { data: requests = [] } = useVendorPayApps(projectId);
  const request = useRequestVendorPayApp(projectId);
  const updateStatus = useUpdateVendorPayAppStatus();
  const del = useDeleteVendorPayApp();
  const sendEmail = useSendEmail();
  const [commitmentId, setCommitmentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [review, setReview] = useState<VendorPayApp | null>(null);

  const linkFor = (token: string) => `${window.location.origin}/vendor/submit/${token}`;
  const titleFor = (cid: string | null) => commitments.find((c: any) => c.id === cid)?.title as string | undefined;

  const create = async () => {
    if (!commitmentId) return toast.error('Select the subcontract this pay app bills against.');
    let token: string;
    try {
      token = await request.mutateAsync({ commitmentId, vendorName: name.trim() || undefined, vendorEmail: email.trim() || undefined });
    } catch (e: any) {
      return toast.error(e?.message || 'Could not create the request.');
    }
    const url = linkFor(token);
    // The link always works and is in the list below. Email is best-effort —
    // if it fails (provider config, bad address) we copy the link so you can send it.
    navigator.clipboard?.writeText(url);
    if (email.trim()) {
      try {
        await sendEmail.mutateAsync({
          recipients: [email.trim()],
          subject: `Submit your pay application — APAS Consulting`,
          bodyHtml: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto">
            <div style="background:#1D6FE8;padding:18px 24px;border-radius:12px 12px 0 0;color:#fff"><div style="font-size:18px;font-weight:700">Submit your pay application</div></div>
            <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:22px 24px">
              <p style="color:#333;font-size:14px;line-height:1.6">${name.trim() ? `Hi ${name.trim()},` : 'Hi,'}<br/>APAS Consulting has invited you to submit your AIA pay application and conditional lien waiver online — no account needed.</p>
              <p style="margin:18px 0"><a href="${url}" style="background:#1D6FE8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Open the submission portal →</a></p>
              <p style="color:#999;font-size:12px">Or paste this link: ${url}</p>
            </div>
          </div>`,
        });
        toast.success(`Invite sent to ${email.trim()}`);
      } catch {
        toast.warning('Request created & link copied — email didn’t send. Paste the link to the vendor.');
      }
    } else {
      toast.success('Link created and copied');
    }
    setName(''); setEmail(''); setCommitmentId('');
  };

  const copy = (token: string) => { navigator.clipboard?.writeText(linkFor(token)); setCopied(token); setTimeout(() => setCopied(null), 1500); };

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2.5 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--apas-sapphire)]/10"><FileText className="h-4 w-4 text-[var(--apas-sapphire)]" /></div>
        <div>
          <h3 className="text-sm font-semibold">Request a pay app from a vendor</h3>
          <p className="text-[11px] text-muted-foreground">Sends a magic link where they build an AIA G702/G703 and e-sign the conditional lien waiver.</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={commitmentId} onValueChange={setCommitmentId}>
            <SelectTrigger><SelectValue placeholder="Subcontract (required)" /></SelectTrigger>
            <SelectContent>{commitments.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.commitment_no ? c.commitment_no + ' · ' : ''}{c.title}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Vendor name" />
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vendor@email.com" />
        </div>
        <Button onClick={create} disabled={!commitmentId || request.isPending || sendEmail.isPending} className="gap-1.5">
          {(request.isPending || sendEmail.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} {email.trim() ? 'Create & email link' : 'Create link'}
        </Button>

        {requests.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {requests.map((r) => {
              const st = STATUS[r.status] ?? STATUS.requested;
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-[13px]">
                  <span className="flex-1 truncate font-medium">{r.vendor_name || r.vendor_email || 'Vendor'}{r.app_no ? ` · App #${r.app_no}` : ''}</span>
                  {r.submitted_at && <span className="shrink-0 text-muted-foreground">{usd(r.current_due)}</span>}
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  {r.submitted_at && <button onClick={() => setReview(r)} title="Review" className="shrink-0 text-muted-foreground hover:text-foreground"><Eye className="h-3.5 w-3.5" /></button>}
                  <button onClick={() => copy(r.token)} title="Copy link" className="shrink-0 text-muted-foreground hover:text-foreground">{copied === r.token ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button title="More" className="shrink-0 text-muted-foreground hover:text-foreground"><MoreVertical className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="text-[11px]">Submission actions</DropdownMenuLabel>
                      <DropdownMenuItem disabled={r.status === 'void'} onClick={() => updateStatus.mutate({ id: r.id, status: 'void', projectId }, { onSuccess: () => toast.success('Submission voided') })}>
                        {r.status === 'void' && <Check className="mr-1 h-3.5 w-3.5" />}Void submission
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { if (confirm(`Delete this vendor invoice (${r.vendor_name || 'Vendor'})?\n\nThis also removes its draft invoice and unconditional waiver. This can’t be undone.`)) del.mutate({ id: r.id, projectId }, { onSuccess: (res) => toast.success(res?.keptInvoice ? 'Deleted — its invoice has payments recorded, so it was kept. Remove it from Commitments if needed.' : 'Deleted (and its draft invoice + waiver)') }); }}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {review && <ReviewDialog sub={review} projectId={projectId} projectName={project?.name || 'Project'} commitmentTitle={titleFor(review.commitment_id)} onClose={() => setReview(null)} />}
    </div>
  );
}

function ReviewDialog({ sub, projectId, projectName, commitmentTitle, onClose }: { sub: VendorPayApp; projectId: string; projectName: string; commitmentTitle?: string; onClose: () => void }) {
  const convert = useConvertVendorPayApp();
  const [invoiceId, setInvoiceId] = useState<string | null>(sub.commitment_invoice_id);
  const { detail, balance } = useInvoice(invoiceId);
  const { data: payments = [] } = useCommitmentPayments(invoiceId);
  const total = Number(sub.total_completed ?? 0);
  const ret = Number(sub.retainage_amount ?? 0);
  const due = Number(sub.current_due ?? 0);
  const paidTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const invoiceStatus = (detail.data as any)?.status as string | undefined;
  const invoiceAmount = Number((detail.data as any)?.approved_amount ?? (detail.data as any)?.submitted_amount ?? due);
  const invoiceRetainage = Number((detail.data as any)?.retainage_held ?? 0);
  const invoiceBalance = Number(
    (balance.data as any)?.balance_due
      ?? Math.max(0, invoiceAmount - invoiceRetainage - paidTotal),
  );
  const fullyPaid = invoiceStatus === 'paid' && payments.length > 0 && invoiceBalance <= 0.005;
  const readyForPayment = invoiceStatus === 'approved';
  const invoiceHref = invoiceId && sub.commitment_id
    ? `/projects/${projectId}/financials/commitments/${sub.commitment_id}?tab=invoices&invoice=${invoiceId}`
    : null;
  const busy = convert.isPending;

  const approve = async () => {
    try {
      const id = await convert.mutateAsync({ sub, projectId });
      setInvoiceId(id);
      toast.success(id ? 'Approved · draft invoice created in Commitments' : 'Approved (link a commitment to create an invoice)');
    } catch { /* handled */ }
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{sub.vendor_name || 'Vendor'} · App #{sub.app_no ?? '—'}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div className="rounded-lg border border-border p-3 text-[13px]">
            <Row label="Total completed & stored" value={usd(total)} />
            <Row label={`Less retainage (${sub.retainage_pct ?? 0}%)`} value={`(${usd(ret)})`} />
            <Row label="Less previous payments" value={usd(sub.prior_payments ?? 0)} />
            <div className="mt-1 flex justify-between border-t border-border pt-1.5 text-[14px] font-bold"><span>Current payment due</span><span className="text-[var(--apas-sapphire)]">{usd(due)}</span></div>
          </div>
          <p className="text-[12px] text-muted-foreground">Conditional waiver signed by <b className="text-foreground">{sub.conditional_signed_name || '—'}</b>.{sub.apas_waiver_ack && <span className="ml-1 text-[#0F6E56]">✓ Acknowledged APAS waiver form.</span>}{invoiceId && <span className="ml-1 text-[#0F6E56]">Linked invoice: {invoiceStatus ?? 'loading'}.</span>}</p>
          {invoiceId && (
            <p className={`rounded-md border px-2.5 py-2 text-[12px] ${fullyPaid ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800' : 'text-muted-foreground'}`}>
              {invoiceStatus === 'draft'
                ? `Vendor requested ${usd(due)}. Map the current-period request to the commitment SOV, then submit it for approval.`
                : invoiceStatus === 'submitted'
                  ? `Submitted invoice ${usd(invoiceAmount)} is awaiting finance approval.`
                  : fullyPaid
                ? `Paid in full from ${payments.length} linked payment${payments.length === 1 ? '' : 's'} totaling ${usd(paidTotal)}.`
                : `${usd(paidTotal)} recorded against the linked invoice; ${usd(Math.max(0, invoiceBalance))} remains.`}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">Paid status is derived from payments recorded against the approved invoice. It cannot be set manually.</p>
          {invoiceId && !readyForPayment && <p className="text-[11px] font-medium text-amber-700">Submit and approve the linked invoice first; then record its disbursement from Financials → Payments.</p>}
          <Button variant="outline" size="sm" onClick={() => openVendorPayAppReport(sub, { projectName, commitmentTitle })} className="w-full gap-1.5"><FileText className="h-3.5 w-3.5" /> Open AIA G702/G703</Button>
        </div>
        <DialogFooter>
          {!invoiceId && <Button variant="ghost" onClick={approve} disabled={busy} className="gap-1.5"><CheckCircle2 className="h-4 w-4" /> Approve + invoice</Button>}
          {invoiceId && invoiceStatus === 'paid' && invoiceHref ? (
            <Button asChild className="gap-1.5">
              <Link to={invoiceHref} onClick={onClose}><FileText className="h-4 w-4" /> View paid invoice</Link>
            </Button>
          ) : invoiceId && readyForPayment ? (
            <Button asChild className="gap-1.5">
              <Link to={`/projects/${projectId}/financials/payments?tab=paid`} onClick={onClose}><Banknote className="h-4 w-4" /> Record linked invoice payment</Link>
            </Button>
          ) : invoiceHref ? (
            <Button asChild className="gap-1.5">
              <Link to={invoiceHref} onClick={onClose}><FileText className="h-4 w-4" /> Process linked invoice</Link>
            </Button>
          ) : (
            <Button disabled className="gap-1.5"><Banknote className="h-4 w-4" /> Approve invoice first</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between py-0.5"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{value}</span></div>;
}
