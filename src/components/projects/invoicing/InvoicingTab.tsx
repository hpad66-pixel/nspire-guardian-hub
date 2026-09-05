import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Receipt, MoreHorizontal, Trash2, Eye, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useConsultingInvoices, useConsultingArLedger } from '@/hooks/useConsultingInvoices';
import { useProjectScopes, summarizeScopes } from '@/hooks/useProjectScopes';
import { useFinancialProposals } from '@/hooks/useFinancialProposals';
import { proposalTotals } from '@/lib/financial/proposalPricing';
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
  const { data: invoices, isLoading, remove } = useConsultingInvoices(projectId);
  const { data: ledger } = useConsultingArLedger(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [handledAutoCreate, setHandledAutoCreate] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 font-[Playfair_Display]">
            <Receipt className="h-5 w-5 text-[var(--apas-sapphire)]" />
            Client invoices
          </h2>
          <p className="text-sm text-muted-foreground">
            Corporate invoices against approved proposals with a running payment tab. Branded PDF · client sign-off · email.
          </p>
        </div>
        <Button onClick={() => { setEditId(null); setBuilderOpen(true); }} className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
          <Plus className="h-4 w-4" />New invoice
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
          <div className="overflow-x-auto">
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
          <div className="overflow-x-auto">
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
                              <DropdownMenuItem onClick={() => { setEditId(inv.id); setBuilderOpen(true); }}>
                                <Pencil className="h-4 w-4 mr-2" />Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove.mutate(inv.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
      />
      <InvoiceDetailDialog
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        projectId={projectId}
        invoiceId={detailId}
        projectName={projectName}
        clientName={clientName}
        clientSeed={clientSeed}
      />
    </div>
  );
}
