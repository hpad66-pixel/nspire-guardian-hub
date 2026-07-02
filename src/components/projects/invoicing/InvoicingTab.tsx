import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Receipt, MoreHorizontal, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useConsultingInvoices } from '@/hooks/useConsultingInvoices';
import { useProjectScopes, summarizeScopes } from '@/hooks/useProjectScopes';
import { ConsultingInvoiceBuilder } from './ConsultingInvoiceBuilder';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';
import { INVOICE_STATUS_META, money } from './invoiceMeta';
import { cn } from '@/lib/utils';

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-card border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function InvoicingTab({ projectId, projectName, clientName }: { projectId: string; projectName: string; clientName?: string | null }) {
  const { data: invoices, isLoading, remove } = useConsultingInvoices(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeScopes(scopes), [scopes]);
  const invoiced = useMemo(
    () => (invoices ?? []).filter((i) => i.status !== 'void').reduce((s, i) => s + (Number(i.total) || 0), 0),
    [invoices],
  );

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Receipt className="h-5 w-5 text-muted-foreground" />Invoicing</h2>
          <p className="text-sm text-muted-foreground">Bill against scope completion. Each invoice charges the progress since the last one.</p>
        </div>
        <Button onClick={() => setBuilderOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />New invoice</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Invoices" value={String((invoices ?? []).length)} />
        <Metric label="Invoiced" value={money(invoiced)} />
        <Metric label="Earned to date" value={money(summary.earned)} sub={`${summary.pctComplete}% complete`} />
        <Metric label="Unbilled" value={money(summary.unbilled)} sub="earned − billed" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading invoices…</div>
      ) : (invoices ?? []).length === 0 ? (
        <Card className="p-10 text-center">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create an invoice to bill the completion recorded on your scopes.</p>
          <Button onClick={() => setBuilderOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Create first invoice</Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
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
                      <td className="px-4 py-3 font-medium">#{inv.invoice_no}</td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(inv.issue_date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{inv.due_date ? format(new Date(inv.due_date + 'T00:00:00'), 'MMM d') : '—'}</td>
                      <td className="px-3 py-3"><span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-medium', meta.className)}>{meta.label}</span></td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">{money(Number(inv.total))}</td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailId(inv.id)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
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

      <ConsultingInvoiceBuilder open={builderOpen} onOpenChange={setBuilderOpen} projectId={projectId} />
      <InvoiceDetailDialog open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} projectId={projectId} invoiceId={detailId} projectName={projectName} clientName={clientName} />
    </div>
  );
}
