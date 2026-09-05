import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Check, CircleAlert, LockKeyhole, Scale, Sparkles } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useConsultingFinancialPosition } from '@/hooks/useConsultingCashFlow';
import { consultingReconciliationChecks } from '@/lib/consulting/financialPosition';
import { money } from '@/components/projects/invoicing/invoiceMeta';

export default function ConsultingCloseoutPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { position, closeout, closeProject } = useConsultingFinancialPosition(projectId);
  const [notes, setNotes] = useState('');
  const p = position.data;
  const final = closeout.data;
  const checks = useMemo(() => p && projectId ? consultingReconciliationChecks(p, projectId) : [], [p, projectId]);
  const reconciled = Boolean(p?.is_reconciled && checks.every((check) => check.complete));
  const netProfit = final?.net_profit ?? p?.net_profit ?? 0;
  const margin = final?.margin_pct ?? p?.margin_pct ?? 0;

  return <div className="container mx-auto max-w-5xl space-y-6 p-6"><FinancialSubNav />
    <div className="flex items-start gap-3"><Scale className="mt-1 h-6 w-6 text-[var(--apas-sapphire)]" /><div><h1 className="text-2xl font-bold">Reconcile &amp; close</h1><p className="text-sm text-muted-foreground">Complete the proposal-to-cash and cost-to-payment check before closing the engagement.</p></div></div>

    <Card className={final || reconciled ? 'overflow-hidden border-emerald-300 bg-gradient-to-br from-emerald-50 via-card to-amber-50' : 'overflow-hidden'}>
      <CardContent className="relative p-7 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-double border-emerald-600 bg-white text-emerald-700 shadow-sm"><Award className="h-8 w-8" /></div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">{final ? 'Reconciled final result' : 'Current cash-basis result'}</p>
        <h2 className="mt-1 font-[Playfair_Display] text-4xl font-bold text-emerald-950">Net Profit</h2>
        <p className="mt-2 text-4xl font-bold tabular-nums text-emerald-700">{money(netProfit)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{Number(margin).toFixed(1)}% margin · client cash received minus all project cash paid</p>
        {final && <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><Sparkles className="h-4 w-4" />Financially reconciled &amp; closed</div>}
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[
      ['Executed proposals', p?.approved_revenue], ['Client invoiced', p?.invoiced_revenue], ['Cash received', p?.cash_received], ['Total costs', p?.total_costs], ['Cash paid', p?.cash_paid],
    ].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(Number(value ?? 0))}</p></CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle className="text-base">Closeout checks</CardTitle></CardHeader><CardContent className="space-y-3">{checks.map((check) => <div key={check.key} className={`flex items-start gap-3 rounded-lg border p-3 ${check.complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${check.complete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>{check.complete ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{check.label}</p><p className="text-sm text-muted-foreground">{check.detail}</p></div>{!check.complete && check.amount != null && check.amount > 0 && <span className="font-semibold tabular-nums text-amber-800">{money(check.amount)}</span>}{!check.complete && check.href && <Button asChild size="sm" variant="outline"><Link to={check.href}>Resolve</Link></Button>}</div>)}</CardContent></Card>

    {!final && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4" />Final certification</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Closing captures an immutable financial snapshot and marks the project closed. It becomes available only after every check above is green.</p><Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional closeout note or reconciliation reference" /><Button className="w-full" disabled={!reconciled || closeProject.isPending} onClick={() => closeProject.mutate(notes)}>{closeProject.isPending ? 'Closing…' : reconciled ? 'Certify reconciliation & close project' : 'Resolve financial checks before closing'}</Button></CardContent></Card>}
  </div>;
}
