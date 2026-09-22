import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Receipt, MoreHorizontal, Trash2, Eye, Pencil, RotateCcw, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { invoiceLifecycleActions, useConsultingInvoices, useConsultingArLedger, type ConsultingInvoice } from '@/hooks/useConsultingInvoices';
import { useProject } from '@/hooks/useProjects';
import { useProjectScopes, summarizeScopes } from '@/hooks/useProjectScopes';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import { proposalTotals } from '@/lib/financial/proposalPricing';
import { billingWorkflowDescriptorForProjectType, companyBrandForProject } from '@/lib/financial/apasCompanyBranding';
import { ConsultingInvoiceBuilder, type InvoiceClientSeed } from './ConsultingInvoiceBuilder';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { INVOICE_STATUS_META, money } from './invoiceMeta';
import { cn } from '@/lib/utils';

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function InvoicingTab({
  projectId,
  projectName,
  clientName,
  clientSeed,
  autoCreateProposalId,
}: {
  projectId: string;
  projectName: string;
  clientName?: string | null;
  clientSeed?: InvoiceClientSeed | null;
  autoCreateProposalId?: string | null;
}) {
  const { data: invoices, isLoading, remove, returnToDraft, setStatus } = useConsultingInvoices(projectId);
  const { data: project } = useProject(projectId);
  const { data: ledger } = useConsultingArLedger(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [handledAutoCreate, setHandledAutoCreate] = useState<string | null>(null);
  const billingBrand = companyBrandForProject(project as { project_type?: string | null; program_meta?: unknown } | null);
  const workflow = billingWorkflowDescriptorForProjectType(project?.project_type, billingBrand);

  useEffect(() => {
    if (!autoCreateProposalId || handledAutoCreate === autoCreateProposalId) return;
    setEditId(null);
    setBuilderOpen(true);
    setHandledAutoCreate(autoCreateProposalId);
  }, [autoCreateProposalId, handledAutoCreate]);

  const summary = useMemo(() => summarizeScopes(scopes), [scopes]);
  const approvedFee = useMemo(
    () => proposals
      .filter((p) => p.status === 'approved')
      .reduce((sum, p) => sum + proposalTotals(p.proposal_lines ?? [], p).total, 0),
    [proposals],
  );
  const invoiced = ledger?.totalInvoiced ?? 0;
  const cashReceived = ledger?.totalPaid ?? 0;
  const openAr = ledger?.openAr ?? 0;
  const unbilledApproved = Math.max(0, approvedFee - invoiced);
  const paidByInvoice = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of ledger?.entries ?? []) {
      map[entry.invoice_id] = Number(entry.paid) || 0;
    }
    return map;
  }, [ledger?.entries]);

  function actionsFor(inv: ConsultingInvoice) {
    return invoiceLifecycleActions(inv, paidByInvoice[inv.id] ?? 0);
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 font-[Playfair_Display]">
            <Receipt className="h-5 w-5 text-[var(--apas-sapphire)]" />
            {workflow.workflowLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            Corporate invoices against approved proposals with a running payment tab. Branded PDF · report package · client email.
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setBuilderOpen(true); }} className="w-full gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90 sm:w-auto">
          <Plus className="h-4 w-4" />New invoice
        </Button>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: `${billingBrand.accent}66`,
          background: billingBrand.surface,
          color: billingBrand.ink,
          fontFamily: billingBrand.fontFamily,
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: billingBrand.accent }}>
              {billingBrand.wordmark}
            </p>
            <h3 className="mt-1 text-lg font-black">{workflow.documentLabel}</h3>
            <p className="max-w-3xl text-sm" style={{ color: billingBrand.muted }}>
              This project bills under {billingBrand.legalName}. Invoice PDFs, report backup, sender identity, and the running A/R tab use that project billing profile.
            </p>
            {billingBrand.senderEmailStatus === 'pending_domain' && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {billingBrand.senderEmail} is staged. Verify APASBuild.com with the sending provider before emails leave directly from that mailbox.
              </p>
            )}
          </div>
          <div className="grid gap-1 text-xs">
            {billingBrand.packageIncludes.slice(0, 3).map((item) => (
              <span key={item} className="rounded bg-white/80 px-2 py-1 font-semibold" style={{ color: billingBrand.primary }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-5">
        <Metric label="Approved proposals" value={money(approvedFee)} sub={`${proposals.filter((p) => p.status === 'approved').length} approved`} />
        <Metric label="Invoiced" value={money(invoiced)} sub={`${(invoices ?? []).filter((i) => i.status !== 'void').length} invoices`} />
        <Metric label="Cash received" value={money(cashReceived)} sub="all payments" />
        <Metric label="Open A/R" value={money(openAr)} sub="invoiced − paid" />
        <Metric label="Unbilled" value={money(unbilledApproved || summary.unbilled)} sub={unbilledApproved > 0 ? 'approved − invoiced' : 'scope unbilled'} />
      </div>

      {(ledger?.entries?.length ?? 0) > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Running A/R ledger</h3>
            <p className="text-xs text-muted-foreground">Every invoice and payment on this engagement — continuous accounting tab.</p>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {ledger!.entries.map((e) => {
              const meta = INVOICE_STATUS_META[e.status as keyof typeof INVOICE_STATUS_META] ?? INVOICE_STATUS_META.draft;
              return (
                <button
                  key={e.invoice_id}
                  type="button"
                  className="rounded-lg border bg-card p-3 text-left shadow-sm active:bg-muted/40"
                  onClick={() => setDetailId(e.invoice_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Invoice #{e.invoice_no}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.subject || e.proposal_nos.join(', ') || 'No subject'}</p>
                    </div>
                    <span className={cn('inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', meta.className)}>{meta.label}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Invoiced</span><span className="font-mono font-semibold">{money(e.total)}</span></div>
                    <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Paid</span><span className="font-mono font-semibold">{money(e.paid)}</span></div>
                    <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Balance</span><span className="font-mono font-semibold text-[var(--apas-sapphire)]">{money(e.balance)}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="font-medium px-4 py-2">Inv</th>
                  <th className="font-medium px-3 py-2">Date</th>
                  <th className="font-medium px-3 py-2">Subject / proposals</th>
                  <th className="font-medium px-3 py-2">Status</th>
                  <th className="font-medium px-3 py-2 text-right">Invoiced</th>
                  <th className="font-medium px-3 py-2 text-right">Paid</th>
                  <th className="font-medium px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger!.entries.map((e) => {
                  const meta = INVOICE_STATUS_META[e.status as keyof typeof INVOICE_STATUS_META] ?? INVOICE_STATUS_META.draft;
                  return (
                    <tr
                      key={e.invoice_id}
                      className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setDetailId(e.invoice_id)}
                    >
                      <td className="px-4 py-2.5 font-medium">#{e.invoice_no}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.issue_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="line-clamp-1">{e.subject || e.proposal_nos.join(', ') || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(e.total)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{money(e.paid)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[var(--apas-sapphire)]">{money(e.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20 font-medium">
                  <td colSpan={4} className="px-4 py-2.5 text-right text-muted-foreground">Totals</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(invoiced)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(cashReceived)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[var(--apas-sapphire)]">{money(openAr)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading invoices…</div>
      ) : (invoices ?? []).length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--apas-sapphire)]/10">
            <Receipt className="h-6 w-6 text-[var(--apas-sapphire)]" />
          </div>
          <p className="font-medium font-[Playfair_Display] text-lg">No invoices yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Create a branded client invoice from approved proposals. Each successive invoice carries prior billed and paid amounts forward.
          </p>
          <Button onClick={() => setBuilderOpen(true)} className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
            <Plus className="h-4 w-4" />Create first invoice
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/20">
            <h3 className="text-sm font-semibold">All invoices</h3>
          </div>
          <div className="grid gap-2 p-3 md:hidden">
            {(invoices ?? []).map((inv) => {
              const meta = INVOICE_STATUS_META[inv.status] ?? INVOICE_STATUS_META.draft;
              const actions = actionsFor(inv);
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-3 shadow-sm">
                  <button type="button" className="w-full text-left" onClick={() => setDetailId(inv.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Invoice #{inv.invoice_no}</p>
                        {inv.subject && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{inv.subject}</p>}
                      </div>
                      <span className={cn('inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', meta.className)}>{meta.label}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Issued</span><span className="font-medium">{format(new Date(inv.issue_date + 'T00:00:00'), 'MMM d')}</span></div>
                      <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Due</span><span className="font-medium">{inv.due_date ? format(new Date(inv.due_date + 'T00:00:00'), 'MMM d') : '—'}</span></div>
                      <div className="rounded-md bg-muted/40 p-2"><span className="block text-muted-foreground">Total</span><span className="font-mono font-semibold">{money(Number(inv.total))}</span></div>
                    </div>
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-9" onClick={() => setDetailId(inv.id)}><Eye className="mr-1.5 h-3.5 w-3.5" />View</Button>
                    {actions.has('edit') ? (
                      <Button size="sm" className="h-9 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90" onClick={() => { setEditId(inv.id); setBuilderOpen(true); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                    ) : actions.has('return_to_draft') ? (
                      <Button variant="outline" size="sm" className="h-9" onClick={() => returnToDraft.mutate(inv.id)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Draft</Button>
                    ) : actions.has('delete') ? (
                      <Button variant="outline" size="sm" className="h-9 text-destructive hover:text-destructive" onClick={() => remove.mutate(inv.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 text-muted-foreground" onClick={() => setDetailId(inv.id)}><Receipt className="mr-1.5 h-3.5 w-3.5" />Audit</Button>
                    )}
                  </div>
                  {actions.has('delete') && (
                    <Button variant="ghost" size="sm" className="mt-2 h-9 w-full text-destructive hover:text-destructive" onClick={() => remove.mutate(inv.id)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete eligible invoice
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="font-medium px-4 py-2.5">Invoice</th>
                  <th className="font-medium px-3 py-2.5 whitespace-nowrap">Issued</th>
                  <th className="font-medium px-3 py-2.5 whitespace-nowrap">Due</th>
                  <th className="font-medium px-3 py-2.5">Status</th>
                  <th className="font-medium px-3 py-2.5 text-right whitespace-nowrap">Total</th>
                  <th className="px-2 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {(invoices ?? []).map((inv) => {
                  const meta = INVOICE_STATUS_META[inv.status] ?? INVOICE_STATUS_META.draft;
                  const actions = actionsFor(inv);
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setDetailId(inv.id)}>
                      <td className="px-4 py-3">
                        <div className="font-medium">#{inv.invoice_no}</div>
                        {inv.subject && <div className="text-xs text-muted-foreground line-clamp-1">{inv.subject}</div>}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(inv.issue_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{inv.due_date ? format(new Date(inv.due_date + 'T00:00:00'), 'MMM d') : '—'}</td>
                      <td className="px-3 py-3"><span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span></td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{money(Number(inv.total))}</td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailId(inv.id)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            {inv.status === 'draft' && (
                              <>
                              <DropdownMenuItem onClick={() => { setEditId(inv.id); setBuilderOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove.mutate(inv.id)}><Trash2 className="h-4 w-4 mr-2" />Delete draft</DropdownMenuItem>
                              </>
                            )}
                            {actions.has('return_to_draft') && (
                              <DropdownMenuItem onClick={() => returnToDraft.mutate(inv.id)}><RotateCcw className="h-4 w-4 mr-2" />Return to draft</DropdownMenuItem>
                            )}
                            {actions.has('void') && (
                              <DropdownMenuItem onClick={() => setStatus.mutate({ id: inv.id, status: 'void' })}><XCircle className="h-4 w-4 mr-2" />Void invoice</DropdownMenuItem>
                            )}
                            {inv.status === 'void' && actions.has('delete') && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove.mutate(inv.id)}><Trash2 className="h-4 w-4 mr-2" />Delete void draft</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConsultingInvoiceBuilder
        open={builderOpen}
        onOpenChange={(v) => { setBuilderOpen(v); if (!v) setEditId(null); }}
        projectId={projectId}
        projectName={projectName}
        clientSeed={clientSeed}
        editInvoiceId={editId}
        initialProposalId={autoCreateProposalId}
        billingBrand={billingBrand}
      />
      <InvoiceDetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        projectId={projectId}
        invoiceId={detailId}
        projectName={projectName}
        clientName={clientName}
        clientSeed={clientSeed}
        billingBrand={billingBrand}
      />
    </div>
  );
}
