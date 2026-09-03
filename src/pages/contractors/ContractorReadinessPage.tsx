import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, ChevronRight, ClipboardCheck, Plus, Search, Settings2, ShieldCheck, TimerReset, Users } from 'lucide-react';
import { useContractorCases } from '@/hooks/useContractorReadiness';
import { useProject } from '@/hooks/useProjects';
import { useClient } from '@/hooks/useClients';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { UpgradeRequired } from '@/components/portal/UpgradeRequired';
import { AddContractorDialog } from '@/components/contractors/AddContractorDialog';
import { ReadinessBadge } from '@/components/contractors/ReadinessBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContractorReadinessPage() {
  const { projectId, clientId } = useParams<{ projectId: string; clientId: string }>();
  const { isModuleEnabled } = useModules();
  const { currentRole } = useUserPermissions();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(clientId);
  const { data: cases = [], isLoading } = useContractorCases(projectId, clientId);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => !q || [c.organization?.name, c.project?.name, c.client?.name, c.status, ...(c.profile?.trade_categories ?? [])]
      .some((v) => v?.toLowerCase().includes(q)));
  }, [cases, search]);
  const stats = useMemo(() => ({
    total: cases.length,
    qualified: cases.filter((c) => c.status === 'qualified').length,
    review: cases.filter((c) => c.status === 'under_review').length,
    blocked: cases.filter((c) => ['blocked', 'correction_needed', 'suspended', 'rejected'].includes(c.status)).length,
  }), [cases]);

  if (!isModuleEnabled('contractorReadinessEnabled')) return <UpgradeRequired feature="contractor_readiness" featureLabel="Contractor Readiness" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700"><ShieldCheck className="h-4 w-4" />Qualification &amp; compliance</div>
          <h1 className="text-3xl font-bold tracking-tight">{projectId ? `${project?.name ?? 'Project'} contractors` : clientId ? `${client?.name ?? 'Client'} contractors` : 'Contractor Readiness'}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">One verified company record, scoped checklists, expiration controls, and deterministic work, contract, and payment gates.</p>
        </div>
        <div className="flex gap-2">{['admin', 'owner'].includes(currentRole ?? '') && <Button variant="outline" asChild><Link to="/contractor-readiness/settings"><Settings2 className="mr-2 h-4 w-4" />Policy</Link></Button>}<Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Qualify contractor</Button></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Companies screened" value={stats.total} tone="bg-slate-100 text-slate-700" />
        <Metric icon={CheckCircle2} label="Fully qualified" value={stats.qualified} tone="bg-emerald-100 text-emerald-700" />
        <Metric icon={TimerReset} label="Ready for review" value={stats.review} tone="bg-blue-100 text-blue-700" />
        <Metric icon={AlertTriangle} label="Needs attention" value={stats.blocked} tone="bg-red-100 text-red-700" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, client, project, or status" /></div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /></div>
      ) : filtered.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <Link key={item.id} to={`/contractor-readiness/${item.id}`} className="group">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white"><Building2 className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold">{item.organization?.name ?? 'Contractor'}</h2><ReadinessBadge status={item.status} /></div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.project?.name ?? item.client?.name ?? 'Company-wide qualification'} · {item.risk_tier} risk</p>
                      {(item.profile?.trade_categories ?? []).length > 0 && <p className="mt-1 truncate text-xs font-medium text-emerald-800">{item.profile?.trade_categories.join(' · ')}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs"><span className="font-medium">Readiness score</span><span className="font-bold tabular-nums">{Math.round(Number(item.score))}%</span></div>
                  <Progress value={Number(item.score)} className="mt-2 h-2" />
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <Gate label="Work" ready={item.work_ready} /><Gate label="Contract" ready={item.contract_ready} /><Gate label="Payment" ready={item.payment_ready} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><ClipboardCheck className="mx-auto h-11 w-11 text-muted-foreground/40" /><h2 className="mt-3 font-semibold">No contractor qualification cases yet</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Start with a company already in your project directory or add a new subcontractor, consultant, or vendor.</p><Button className="mt-5" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Create the first checklist</Button></CardContent></Card>
      )}

      <AddContractorDialog open={addOpen} onOpenChange={setAddOpen} fixedProjectId={projectId} fixedClientId={clientId} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}
function Gate({ label, ready }: { label: string; ready: boolean }) {
  return <div className={`rounded-lg border px-2 py-2 font-semibold ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{ready ? '✓ ' : '○ '}{label}</div>;
}
