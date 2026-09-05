import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BadgeCheck, BriefcaseBusiness, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign,
  FileCheck2, FileClock, Link2, MailPlus, ReceiptText, ShieldCheck, UserPlus, XCircle,
} from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConsultingInvoiceDraftDialog } from '@/components/financial/ConsultingInvoiceDraftDialog';
import { ConsultingInvoiceRequestDialog } from '@/components/financial/ConsultingInvoiceRequestDialog';
import { ConsultingPaymentDialog } from '@/components/financial/ConsultingPaymentDialog';
import { InviteSubDialog } from '@/components/portal/InviteSubDialog';
import { ProcessedPaidStamp } from '@/components/financial/ProcessedPaidStamp';
import {
  useConsultingCosts, useConsultingFinancialPosition, useConsultingInvoiceRequests,
  type ConsultingCostWithPayments, type ConsultingCostType, type ConsultingCostPayment,
} from '@/hooks/useConsultingCashFlow';
import { useOrganizations } from '@/hooks/useDirectory';
import { useProject } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactUrl } from '@/hooks/useProjectArtifacts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { money } from '@/components/projects/invoicing/invoiceMeta';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft review', submitted: 'Vendor submitted', approved: 'Approved to pay', rejected: 'Needs revision',
  partially_paid: 'Partially paid', paid: 'Paid', void: 'Void',
};
const TYPE_LABEL: Record<ConsultingCostType, string> = {
  subcontractor: 'Subcontractor', consultant: 'Consultant', reimbursable: 'Reimbursable',
  internal_labor: 'Internal labor', other: 'Other',
};

export default function ConsultingCostsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId ?? null);
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const { data: costs = [], isLoading, approve, reject, setStatus, reconcilePayment } = useConsultingCosts(projectId);
  const { data: requests = [] } = useConsultingInvoiceRequests(projectId);
  const { data: organizations = [] } = useOrganizations();
  const { position } = useConsultingFinancialPosition(projectId);
  const [draftOpen, setDraftOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [paying, setPaying] = useState<ConsultingCostWithPayments | null>(null);
  const [rejecting, setRejecting] = useState<ConsultingCostWithPayments | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const active = useMemo(() => costs.filter((cost) => cost.status !== 'void'), [costs]);
  const p = position.data;
  const pending = active.filter((cost) => ['draft', 'submitted', 'rejected'].includes(cost.status)).length;
  const openRequests = requests.filter((request) => request.status === 'open').length;

  if (!projectId) return null;
  const organizationFor = (cost: ConsultingCostWithPayments | null) => organizations.find((item) => item.id === cost?.vendor_org_id);
  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <FinancialSubNav />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-[var(--apas-sapphire)]/10 p-2"><BriefcaseBusiness className="h-6 w-6 text-[var(--apas-sapphire)]" /></div><div><h1 className="text-2xl font-bold">Vendor invoices &amp; payments</h1><p className="max-w-2xl text-sm text-muted-foreground">Invoice-first consulting A/P with vendor intake, approval, payment evidence, and bank reconciliation.</p></div></div>
        {isAdmin && <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPortalOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" />Provision vendor</Button>
          <Button variant="outline" onClick={() => setDraftOpen(true)}><FileCheck2 className="mr-1.5 h-4 w-4" />Create on behalf</Button>
          <Button onClick={() => setRequestOpen(true)}><MailPlus className="mr-1.5 h-4 w-4" />Request invoice</Button>
        </div>}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4">
        <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><p className="font-semibold text-emerald-950">Secure hybrid payment control</p><p className="mt-0.5 text-sm text-emerald-800">ProjOS verifies and documents the invoice, prepares the payment, and requires bank evidence. You complete Zelle, ACH, wire, or check in the bank—bank credentials and MFA never enter ProjOS.</p></div></div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric label="Pending review" value={String(pending)} tone="amber" />
        <Metric label="Open requests" value={String(openRequests)} />
        <Metric label="Approved A/P" value={money(p?.total_costs ?? 0)} />
        <Metric label="Cash paid" value={money(p?.cash_paid ?? 0)} tone="emerald" />
        <Metric label="Open A/P" value={money(p?.open_ap ?? 0)} tone="amber" />
        <Metric label="Projected profit" value={money(p?.projected_net_profit ?? 0)} tone="blue" />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="h-4 w-4" />Controlled invoice register</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-10 text-center text-muted-foreground">Loading vendor invoices…</div> : active.length === 0 ? (
            <div className="p-12 text-center"><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-semibold">No vendor invoices yet</p><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">Request an invoice using a secure one-time link, or create a clearly labeled administrative draft on the vendor's behalf.</p></div>
          ) : (
            <div className="divide-y">
              {active.map((cost) => {
                const isExpanded = expanded.has(cost.id);
                return <div key={cost.id} className="p-4 sm:p-5">
                  <div className="grid items-center gap-4 lg:grid-cols-[minmax(220px,1.45fr)_minmax(150px,.8fr)_repeat(3,minmax(105px,.6fr))_auto]">
                    <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{cost.vendor_name}</p><StatusBadge status={cost.status} /></div><p className="mt-1 text-xs text-muted-foreground">{TYPE_LABEL[cost.cost_type]} · {cost.source_kind === 'vendor_upload' || cost.source_kind === 'vendor_portal' ? 'Vendor attested' : cost.source_kind === 'historical_exception' ? 'Historical exception' : 'Prepared by APAS'}</p></div>
                    <div><p className="font-mono text-xs">{cost.reference_no || 'No reference'}</p><p className="mt-1 text-xs text-muted-foreground">{format(new Date(`${cost.bill_date}T00:00:00`), 'MMM d, yyyy')}</p></div>
                    <Amount label="Approved" value={cost.amount} />
                    <Amount label="Paid" value={cost.paid_to_date} tone="emerald" />
                    <Amount label="Balance" value={cost.balance_due} tone={cost.balance_due > 0 ? 'amber' : 'default'} />
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {isAdmin && ['draft', 'submitted', 'rejected'].includes(cost.status) && <Button size="sm" onClick={() => approve.mutate(cost.id)} disabled={approve.isPending}><BadgeCheck className="mr-1 h-4 w-4" />Approve</Button>}
                      {isAdmin && ['draft', 'submitted'].includes(cost.status) && <Button size="sm" variant="outline" onClick={() => { setRejecting(cost); setRejectReason(''); }}><XCircle className="mr-1 h-4 w-4" />Return</Button>}
                      {isAdmin && cost.balance_due > 0 && ['approved', 'partially_paid'].includes(cost.status) && <Button size="sm" onClick={() => setPaying(cost)}><CircleDollarSign className="mr-1 h-4 w-4" />Prepare payment</Button>}
                      {isAdmin && cost.paid_to_date === 0 && cost.status === 'draft' && <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Void draft" onClick={() => setStatus.mutate({ id: cost.id, status: 'void' })}><XCircle className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggle(cost.id)} title="Invoice details">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                  {cost.status === 'paid' && cost.paid_at && <div className="mt-4"><ProcessedPaidStamp processedDate={cost.approved_at} paidDate={cost.paid_at} totalPaid={cost.paid_to_date} latestReference={cost.payments.at(0)?.reference} /></div>}
                  {cost.rejection_reason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><span className="font-semibold">Returned:</span> {cost.rejection_reason}</p>}
                  {isExpanded && <InvoiceDetail cost={cost} canReconcile={isAdmin} onReconcile={(paymentId) => reconcilePayment.mutate({ paymentId })} />}
                </div>;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button asChild variant="outline"><Link to={`/projects/${projectId}/financials/closeout`}>Review financial closeout</Link></Button></div>
      <ConsultingInvoiceDraftDialog open={draftOpen} onOpenChange={setDraftOpen} projectId={projectId} projectName={project?.name ?? 'Consulting project'} />
      <ConsultingInvoiceRequestDialog open={requestOpen} onOpenChange={setRequestOpen} projectId={projectId} />
      <InviteSubDialog open={portalOpen} onOpenChange={setPortalOpen} projectId={projectId} />
      <ConsultingPaymentDialog cost={paying} projectId={projectId} organization={organizationFor(paying)} onOpenChange={(value) => !value && setPaying(null)} />
      <Dialog open={!!rejecting} onOpenChange={(value) => !value && setRejecting(null)}><DialogContent><DialogHeader><DialogTitle>Return invoice for correction</DialogTitle><DialogDescription>The reason becomes part of the permanent invoice history.</DialogDescription></DialogHeader><div className="space-y-1.5"><Label>Reason *</Label><Textarea rows={4} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Explain exactly what must be corrected" /></div><DialogFooter><Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="destructive" disabled={reject.isPending || rejectReason.trim().length < 5} onClick={async () => { if (!rejecting) return; await reject.mutateAsync({ id: rejecting.id, reason: rejectReason }); setRejecting(null); }}>Return invoice</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'amber' | 'emerald' | 'blue' }) {
  const border = tone === 'amber' ? 'border-amber-200' : tone === 'emerald' ? 'border-emerald-200' : tone === 'blue' ? 'border-blue-200' : '';
  return <Card className={border}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>;
}

function Amount({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'amber' | 'emerald' }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className={`font-semibold tabular-nums ${tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : ''}`}>{money(value)}</p></div>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'approved' || status === 'partially_paid' ? 'border-blue-200 bg-blue-50 text-blue-700' : status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <Badge variant="outline" className={cls}>{status === 'paid' ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <FileClock className="mr-1 h-3 w-3" />}{STATUS_LABEL[status] || status}</Badge>;
}

function InvoiceDetail({ cost, canReconcile, onReconcile }: { cost: ConsultingCostWithPayments; canReconcile: boolean; onReconcile: (id: string) => void }) {
  return <div className="mt-4 grid gap-4 rounded-xl border bg-muted/15 p-4 lg:grid-cols-2">
    <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice source</p><p className="text-sm">{cost.description || 'No description provided.'}</p><ArtifactLink artifactId={cost.invoice_artifact_id} label="Open invoice document" />{cost.source_note && <p className="text-xs text-muted-foreground">{cost.source_note}</p>}</div>
    <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment history</p>{cost.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : cost.payments.map((payment) => <PaymentLine key={payment.id} payment={payment} canReconcile={canReconcile} onReconcile={onReconcile} />)}</div>
  </div>;
}

function PaymentLine({ payment, canReconcile, onReconcile }: { payment: ConsultingCostPayment; canReconcile: boolean; onReconcile: (id: string) => void }) {
  return <div className="rounded-lg border bg-background p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">{money(payment.amount)} · {payment.method?.toUpperCase() || 'PAYMENT'}</p><p className="text-xs text-muted-foreground">{payment.paid_date} · {payment.reference || 'No reference'}</p></div><Badge variant="outline" className={payment.payment_status === 'reconciled' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}>{payment.payment_status === 'reconciled' ? 'Reconciled' : payment.payment_status === 'historical_unverified' ? 'Historical—verify' : 'Evidence pending review'}</Badge></div><div className="mt-2 flex flex-wrap items-center gap-2"><ArtifactLink artifactId={payment.proof_artifact_id} label="Open bank evidence" />{canReconcile && payment.payment_status === 'recorded' && <Button size="sm" variant="outline" onClick={() => onReconcile(payment.id)}><Link2 className="mr-1 h-3.5 w-3.5" />Mark reconciled</Button>}</div></div>;
}

function ArtifactLink({ artifactId, label }: { artifactId: string | null; label: string }) {
  const artifact = useQuery<{ file_path: string } | null>({
    queryKey: ['consulting-artifact-path', artifactId], enabled: !!artifactId,
    queryFn: async () => { const { data, error } = await supabase.from('project_artifacts' as never).select('file_path').eq('id', artifactId).maybeSingle(); if (error) throw error; return data as unknown as { file_path: string } | null; },
  });
  const url = useArtifactUrl(artifact.data?.file_path ?? null);
  if (!artifactId) return <span className="text-xs text-muted-foreground">No document attached</span>;
  if (!url.data) return <span className="text-xs text-muted-foreground">Opening evidence…</span>;
  return <a href={url.data} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--apas-sapphire)] hover:underline"><Link2 className="h-3.5 w-3.5" />{label}</a>;
}
