import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, BellRing, Building2, CheckCircle2, ChevronRight, ClipboardCheck,
  Eye, FolderKanban, MailCheck, Plus, Search, Settings2, ShieldCheck, Sparkles,
  TimerReset, Users,
} from 'lucide-react';
import { useContractorAutomation, useContractorCases, type ContractorCase } from '@/hooks/useContractorReadiness';
import { buildContractorPortfolio, type ContractorPortfolioCompany } from '@/lib/contractors/portfolio';
import { useProject } from '@/hooks/useProjects';
import { useClient } from '@/hooks/useClients';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import { UpgradeRequired } from '@/components/portal/UpgradeRequired';
import { AddContractorDialog } from '@/components/contractors/AddContractorDialog';
import { ReadinessBadge } from '@/components/contractors/ReadinessBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ContractorReadinessPage() {
  const { projectId, clientId } = useParams<{ projectId: string; clientId: string }>();
  const { isModuleEnabled } = useModules();
  const { currentRole } = useUserPermissions();
  const { isSuperAdmin } = usePlatformSuperAdmin();
  const { data: project } = useProject(projectId ?? null);
  const { data: client } = useClient(clientId);
  const { data: cases = [], isLoading } = useContractorCases(projectId, clientId);
  const automation = useContractorAutomation(cases.map((item) => item.id));
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const globalView = !projectId && !clientId;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((item) => !q || [item.organization?.name, item.project?.name, item.client?.name, item.status, ...(item.profile?.trade_categories ?? [])]
      .some((value) => value?.toLowerCase().includes(q)));
  }, [cases, search]);
  const portfolio = useMemo(
    () => buildContractorPortfolio(filtered, automation.data?.links ?? []),
    [filtered, automation.data?.links],
  );
  const stats = useMemo(() => ({
    companies: new Set(cases.map((item) => item.organization_id)).size,
    qualified: cases.filter((item) => item.status === 'qualified').length,
    review: cases.filter((item) => item.status === 'under_review').length,
    blocked: cases.filter((item) => ['blocked', 'correction_needed', 'suspended', 'rejected'].includes(item.status)).length,
  }), [cases]);

  if (!isModuleEnabled('contractorReadinessEnabled')) return <UpgradeRequired feature="contractor_readiness" featureLabel="Contractor Readiness" />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-700"><ShieldCheck className="h-4 w-4" />Qualification &amp; compliance</div>
          <h1 className="text-3xl font-bold tracking-tight">{projectId ? `${project?.name ?? 'Project'} contractors` : clientId ? `${client?.name ?? 'Client'} contractors` : 'Contractor Readiness'}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">One reusable company portfolio, passwordless onboarding, expiration monitoring, and deterministic work, contract, and payment gates.</p>
        </div>
        <div className="flex gap-2">{(isSuperAdmin || ['admin', 'owner'].includes(currentRole ?? '')) && <Button variant="outline" asChild><Link to="/contractor-readiness/settings"><Settings2 className="mr-2 h-4 w-4" />Checklist settings</Link></Button>}<Button onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" />Onboard contractor</Button></div>
      </div>

      <AutomationPanel
        invitations={automation.data?.links.length ?? 0}
        opened={automation.data?.links.filter((link) => link.use_count > 0).length ?? 0}
        reminders={automation.data?.reminders.filter((event) => event.status === 'sent').length ?? 0}
        expiring={automation.data?.expiringCount ?? 0}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Companies in portfolio" value={stats.companies} tone="bg-slate-100 text-slate-700" />
        <Metric icon={CheckCircle2} label="Qualified scopes" value={stats.qualified} tone="bg-emerald-100 text-emerald-700" />
        <Metric icon={TimerReset} label="Ready for review" value={stats.review} tone="bg-blue-100 text-blue-700" />
        <Metric icon={AlertTriangle} label="Needs attention" value={stats.blocked} tone="bg-red-100 text-red-700" />
      </div>

      <Card><CardContent className="p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, trade, client, project, or status" /></div></CardContent></Card>

      {isLoading ? <LoadingGrid /> : globalView ? (
        <Tabs defaultValue="portfolio" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="portfolio">Company portfolio</TabsTrigger><TabsTrigger value="queue">Onboarding queue</TabsTrigger></TabsList>
          <TabsContent value="portfolio" className="mt-0"><SectionIntro title="Master contractor portfolio" body="Each company appears once here, even when it is qualified for several clients or projects." /><CompanyGrid companies={portfolio} onAdd={() => setAddOpen(true)} /></TabsContent>
          <TabsContent value="queue" className="mt-0"><SectionIntro title="Qualification and renewal queue" body="Every scoped checklist, review, correction, and expiration remains traceable here." /><QualificationGrid cases={filtered} onAdd={() => setAddOpen(true)} /></TabsContent>
        </Tabs>
      ) : <QualificationGrid cases={filtered} onAdd={() => setAddOpen(true)} />}

      <AddContractorDialog open={addOpen} onOpenChange={setAddOpen} fixedProjectId={projectId} fixedClientId={clientId} />
    </div>
  );
}

function AutomationPanel({ invitations, opened, reminders, expiring }: { invitations: number; opened: number; reminders: number; expiring: number }) {
  return <Card className="overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-950 to-emerald-800 text-white shadow-lg shadow-emerald-950/10">
    <CardContent className="p-0"><div className="grid lg:grid-cols-[1.2fr_2fr]">
      <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-amber-300"><Sparkles className="h-4 w-4" />Automation is active</div><h2 className="mt-2 text-xl font-bold">From invitation to renewal—without chasing spreadsheets.</h2><p className="mt-2 text-sm leading-6 text-emerald-100">Send one secure link. The contractor updates its reusable company record, uploads required documents, and receives scheduled missing-item and expiration reminders.</p></div>
      <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4">
        <AutomationMetric icon={MailCheck} label="Portals issued" value={invitations} />
        <AutomationMetric icon={Eye} label="Portals opened" value={opened} />
        <AutomationMetric icon={BellRing} label="Reminders sent" value={reminders} />
        <AutomationMetric icon={AlertTriangle} label="Expiring ≤90 days" value={expiring} />
      </div>
    </div></CardContent>
  </Card>;
}

function AutomationMetric({ icon: Icon, label, value }: { icon: typeof MailCheck; label: string; value: number }) {
  return <div className="bg-emerald-900/45 p-4"><Icon className="h-4 w-4 text-amber-300" /><p className="mt-4 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[11px] leading-4 text-emerald-100">{label}</p></div>;
}

function SectionIntro({ title, body }: { title: string; body: string }) {
  return <div className="mb-4"><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-muted-foreground">{body}</p></div>;
}

function CompanyGrid({ companies, onAdd }: { companies: ContractorPortfolioCompany[]; onAdd: () => void }) {
  if (!companies.length) return <EmptyState title="No contractors in the company portfolio" body="Onboard the first company to create its reusable record and secure document portal." action="Onboard first contractor" onAdd={onAdd} />;
  return <div className="grid gap-3 lg:grid-cols-2">{companies.map((company) => <Link key={company.organizationId} to={`/contractor-readiness/${company.primaryCase.id}`} className="group"><Card className="h-full transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"><CardContent className="p-5">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-bold">{company.name}</h3>{company.needsAttention ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Attention</span> : company.readyScopes > 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Ready</span> : null}</div><p className="mt-1 truncate text-xs text-muted-foreground">{company.email ?? company.phone ?? 'Contact details pending'}</p></div><ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
    {company.trades.length > 0 && <p className="mt-3 truncate text-xs font-semibold text-emerald-800">{company.trades.join(' · ')}</p>}
    <div className="mt-5 flex items-center justify-between text-xs"><span>{company.cases.length} qualification scope{company.cases.length === 1 ? '' : 's'}</span><span className="font-bold tabular-nums">{company.averageScore}% avg.</span></div><Progress value={company.averageScore} className="mt-2 h-2" />
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-[11px] text-muted-foreground"><FolderKanban className="h-3.5 w-3.5" /><span>{company.readyScopes}/{company.cases.length} scopes fully ready</span><span>·</span>{company.latestPortal ? <span>{portalActivity(company.latestPortal)}</span> : <span>No portal issued yet</span>}</div>
  </CardContent></Card></Link>)}</div>;
}

function portalActivity(link: ContractorPortfolioCompany['latestPortal']) {
  if (!link) return 'No portal issued yet';
  if (link.last_used_at) return `Opened ${formatDistanceToNow(new Date(link.last_used_at), { addSuffix: true })}`;
  if (link.delivery_status === 'sent') return `Sent ${formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}`;
  if (link.delivery_status === 'failed') return 'Email failed · secure link available';
  return 'Secure link ready';
}

function QualificationGrid({ cases, onAdd }: { cases: ContractorCase[]; onAdd: () => void }) {
  if (!cases.length) return <EmptyState title="No qualification cases yet" body="Start with an existing company or add a new subcontractor, consultant, or vendor." action="Create first qualification" onAdd={onAdd} />;
  return <div className="grid gap-3 lg:grid-cols-2">{cases.map((item) => <Link key={item.id} to={`/contractor-readiness/${item.id}`} className="group"><Card className="h-full transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"><CardContent className="p-5">
    <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white"><ClipboardCheck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold">{item.organization?.name ?? 'Contractor'}</h2><ReadinessBadge status={item.status} /></div><p className="mt-1 text-xs text-muted-foreground">{item.project?.name ?? item.client?.name ?? 'Company-wide qualification'} · {item.risk_tier} risk</p>{(item.profile?.trade_categories ?? []).length > 0 && <p className="mt-1 truncate text-xs font-medium text-emerald-800">{item.profile?.trade_categories.join(' · ')}</p>}</div><ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></div>
    <div className="mt-5 flex items-center justify-between text-xs"><span className="font-medium">Readiness score</span><span className="font-bold tabular-nums">{Math.round(Number(item.score))}%</span></div><Progress value={Number(item.score)} className="mt-2 h-2" /><div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]"><Gate label="Work" ready={item.work_ready} /><Gate label="Contract" ready={item.contract_ready} /><Gate label="Payment" ready={item.payment_ready} /></div>
  </CardContent></Card></Link>)}</div>;
}

function EmptyState({ title, body, action, onAdd }: { title: string; body: string; action: string; onAdd: () => void }) {
  return <Card className="border-dashed"><CardContent className="py-16 text-center"><ClipboardCheck className="mx-auto h-11 w-11 text-muted-foreground/40" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p><Button className="mt-5" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{action}</Button></CardContent></Card>;
}

function LoadingGrid() { return <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44 rounded-xl" /><Skeleton className="h-44 rounded-xl" /></div>; }
function Metric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) { return <Card><CardContent className="flex items-center gap-3 p-4"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><div><p className="text-2xl font-bold leading-none">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
function Gate({ label, ready }: { label: string; ready: boolean }) { return <div className={`rounded-lg border px-2 py-2 font-semibold ${ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{ready ? '✓ ' : '○ '}{label}</div>; }
