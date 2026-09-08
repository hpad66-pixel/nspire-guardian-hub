import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Check, CircleAlert, LockKeyhole, Scale, Sparkles } from 'lucide-react';
import { FinancialSubNav } from '@/components/financial/FinancialSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConsultingFinancialPosition } from '@/hooks/useConsultingCashFlow';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import { useUserPermissions } from '@/hooks/usePermissions';
import { consultingReconciliationChecks } from '@/lib/consulting/financialPosition';
import { money } from '@/components/projects/invoicing/invoiceMeta';

export default function ConsultingCloseoutPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { position, closeout, closeProject } = useConsultingFinancialPosition(projectId);
  const { isAdmin, currentRole } = useUserPermissions();
  const { isSuperAdmin } = usePlatformSuperAdmin();
  const [notes, setNotes] = useState('');
  const [allowException, setAllowException] = useState(false);
  const p = position.data;
  const final = closeout.data;
  const checks = useMemo(() => p && projectId ? consultingReconciliationChecks(p, projectId) : [], [p, projectId]);
  const reconciled = Boolean(p?.is_reconciled && checks.every((check) => check.complete));
  const netProfit = final?.net_profit ?? p?.net_profit ?? 0;
  const margin = final?.margin_pct ?? p?.margin_pct ?? 0;
  const isLoss = netProfit < 0;
  const canClose = notes.trim().length >= 5 && (reconciled || allowException);
  const canCloseProject = isSuperAdmin || isAdmin || currentRole === 'owner' || currentRole === 'administrator';

  return <div className="container mx-auto max-w-5xl space-y-6 p-6"><FinancialSubNav />
    <div className="flex items-start gap-3"><Scale className="mt-1 h-6 w-6 text-[var(--apas-sapphire)]" /><div><h1 className="text-2xl font-bold">Reconcile &amp; close</h1><p className="text-sm text-muted-foreground">Review the proposal-to-cash and cost-to-payment position, then reconcile it or record an administrator closeout exception.</p></div></div>

    <Card className={final || reconciled
      ? isLoss
        ? 'overflow-hidden border-rose-300 bg-gradient-to-br from-rose-50 via-card to-amber-50'
        : 'overflow-hidden border-emerald-300 bg-gradient-to-br from-emerald-50 via-card to-amber-50'
      : 'overflow-hidden'}>
      <CardContent className="relative p-7 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-double bg-white shadow-sm ${isLoss ? 'border-rose-600 text-rose-700' : 'border-emerald-600 text-emerald-700'}`}><Award className="h-8 w-8" /></div>
        <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.22em] ${isLoss ? 'text-rose-700' : 'text-emerald-700'}`}>{final ? 'Certified final result' : 'Current cash-basis result'}</p>
        <h2 className={`mt-1 font-[Playfair_Display] text-4xl font-bold ${isLoss ? 'text-rose-950' : 'text-emerald-950'}`}>Net {isLoss ? 'Loss' : 'Profit'}</h2>
        <p className={`mt-2 text-4xl font-bold tabular-nums ${isLoss ? 'text-rose-700' : 'text-emerald-700'}`}>{money(Math.abs(netProfit))}</p>
        <p className="mt-1 text-sm text-muted-foreground">{Number(margin).toFixed(1)}% margin · client cash received minus all project cash paid</p>
        {final && <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white ${isLoss ? 'bg-rose-700' : 'bg-emerald-700'}`}><Sparkles className="h-4 w-4" />{final.closed_with_exception ? 'Administrator exception · project closed' : isLoss ? 'Loss recorded · project closed' : 'Financially reconciled &amp; closed'}</div>}
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[
      ['Executed proposals', p?.approved_revenue], ['Client invoiced', p?.invoiced_revenue], ['Cash received', p?.cash_received], ['Total costs', p?.total_costs], ['Cash paid', p?.cash_paid],
    ].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(Number(value ?? 0))}</p></CardContent></Card>)}</div>

    <Card><CardHeader><CardTitle className="text-base">Closeout checks</CardTitle></CardHeader><CardContent className="space-y-3">{checks.map((check) => <div key={check.key} className={`flex items-start gap-3 rounded-lg border p-3 ${check.complete ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}><div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${check.complete ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>{check.complete ? <Check className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="font-medium">{check.label}</p><p className="text-sm text-muted-foreground">{check.detail}</p></div>{!check.complete && check.amount != null && check.amount > 0 && <span className="font-semibold tabular-nums text-amber-800">{money(check.amount)}</span>}{!check.complete && check.href && <Button asChild size="sm" variant="outline"><Link to={check.href}>Resolve</Link></Button>}</div>)}</CardContent></Card>

    {!final && canCloseProject && <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4" />Final certification</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Closing captures the current financial position, creates the permanent closure stamp, and locks every project record against further changes.</p><div className="space-y-2"><Label htmlFor="consulting-close-reason">Closeout reason *</Label><Textarea id="consulting-close-reason" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Example: Engagement closed with a sustained net loss; all current balances and records are frozen as of this date." /><p className="text-xs text-muted-foreground">This reason will appear on the closure certificate and audit trail.</p></div>{!reconciled && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4"><div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div className="space-y-3"><div><p className="text-sm font-semibold text-amber-950">Administrator closeout exception</p><p className="mt-1 text-xs leading-relaxed text-amber-900/80">Some financial checks remain open. You can close anyway; the current balances, the exception, and your reason will be stamped into the final record.</p></div><label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium text-amber-950"><Checkbox checked={allowException} onCheckedChange={(checked) => setAllowException(checked === true)} /><span>I authorize closure with the current unreconciled financial position.</span></label></div></div></div>}<Button className="w-full" disabled={!canClose || closeProject.isPending} onClick={() => closeProject.mutate({ reason: notes, allowUnreconciled: !reconciled && allowException })}>{closeProject.isPending ? 'Closing and locking…' : reconciled ? 'Certify reconciliation & close project' : allowException ? 'Close with administrator exception' : 'Acknowledge the exception to close'}</Button></CardContent></Card>}
    {!final && !canCloseProject && <Card><CardContent className="flex items-start gap-3 p-5"><LockKeyhole className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Administrator closeout required</p><p className="mt-1 text-sm text-muted-foreground">You can review the financial position, but only an authorized administrator can certify and lock the project.</p></div></CardContent></Card>}
  </div>;
}
