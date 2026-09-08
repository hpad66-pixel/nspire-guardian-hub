import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  Images,
  Loader2,
  ScanEye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccountabilityPortfolio, type AccountabilityProjectSummary } from '@/hooks/useFieldAccountability';
import { useProjects, type Project } from '@/hooks/useProjects';
import {
  isDedicatedSiteAccountabilityProject,
  staffSiteAccountabilityPath,
} from '@/lib/accountability/accountabilityNavigation';
import { ownerPortalPath } from '@/lib/portal/ownerPortalPaths';

type ProjectWithProgram = Project & { program_meta?: Record<string, unknown> | null };

function emptySummary(projectId: string): AccountabilityProjectSummary {
  return { projectId, items: 0, photos: 0, open: 0, ownerReview: 0, overdue: 0, verified: 0, lastActivityAt: null };
}

export default function SiteAccountabilityHomePage() {
  const { data: rawProjects = [], isLoading: projectsLoading } = useProjects();
  const projects = rawProjects as ProjectWithProgram[];
  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const { data: summaries = [], isLoading: summariesLoading, error } = useAccountabilityPortfolio(projectIds);
  const summaryByProject = useMemo(
    () => new Map(summaries.map((summary) => [summary.projectId, summary])),
    [summaries],
  );
  const programs = useMemo(() => projects
    .filter((project) => {
      const summary = summaryByProject.get(project.id);
      return isDedicatedSiteAccountabilityProject(project) || Boolean(summary && (summary.items || summary.photos));
    })
    .sort((a, b) => {
      const dedicated = Number(isDedicatedSiteAccountabilityProject(b)) - Number(isDedicatedSiteAccountabilityProject(a));
      if (dedicated) return dedicated;
      return (summaryByProject.get(b.id)?.photos ?? 0) - (summaryByProject.get(a.id)?.photos ?? 0);
    }), [projects, summaryByProject]);
  const featured = programs[0] ?? null;
  const featuredSummary = featured ? summaryByProject.get(featured.id) ?? emptySummary(featured.id) : null;
  const loading = projectsLoading || summariesLoading;

  return (
    <div className="min-h-full bg-[#f7f8f6]" data-testid="site-accountability-home">
      <section className="relative overflow-hidden border-b bg-[#082b23] text-white">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="container relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="grid gap-7 lg:grid-cols-[1.3fr_.7fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Owner evidence center</p>
              <h1 className="mt-2 font-display text-4xl font-medium sm:text-5xl">Site Accountability</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-50/75 sm:text-base">
                One visible home for owner walks, AI-assisted photograph review, responsible parties,
                before-and-after proof, questions, and verified closeout—across the whole property.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-amber-300" /> Evidence stays project-controlled</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">AI drafts the starting assessment. A person reviews the finding, responsibility, and final proof.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border bg-white p-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading photographic records…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
            <AlertTriangle className="mx-auto h-7 w-7" />
            <h2 className="mt-3 text-xl font-semibold">Site Accountability could not be loaded</h2>
            <p className="mt-1 text-sm">The project records remain intact. Refresh to try the secure evidence index again.</p>
          </div>
        ) : featured && featuredSummary ? (
          <>
            <FeaturedProgram project={featured} summary={featuredSummary} />
            {programs.length > 1 && (
              <section className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Other evidence programs</p>
                  <h2 className="mt-1 font-display text-3xl text-[#082b23]">All accountable site records</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {programs.slice(1).map((project) => (
                    <ProgramCard key={project.id} project={project} summary={summaryByProject.get(project.id) ?? emptySummary(project.id)} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed bg-white p-12 text-center">
            <ScanEye className="mx-auto h-9 w-9 text-emerald-700" />
            <h2 className="mt-4 font-display text-2xl text-[#082b23]">No site-accountability record is available yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Enable Field Accountability inside a project and complete the first site walk. It will appear here automatically.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function FeaturedProgram({ project, summary }: { project: ProjectWithProgram; summary: AccountabilityProjectSummary }) {
  const source = typeof project.program_meta?.source_label === 'string'
    ? project.program_meta.source_label
    : project.name.toLowerCase().includes('glorieta')
      ? 'Chris Sullivan owner walk'
      : 'Property-wide site record';
  return (
    <section className="overflow-hidden rounded-[2rem] border border-emerald-200 bg-white shadow-[0_24px_70px_rgba(8,43,35,.10)]" data-testid="featured-site-accountability">
      <div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="bg-gradient-to-br from-[#0d6b57] to-[#082b23] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-300 text-amber-950 hover:bg-amber-300">Featured property record</Badge>
            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">{source}</Badge>
          </div>
          <h2 className="mt-5 font-display text-3xl sm:text-4xl">{project.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-50/75">
            The imported photographs, AI starting assessments, editable captions, issue ownership,
            questions, annotations, and completion evidence are preserved together here.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="h-11 rounded-xl bg-amber-300 text-amber-950 hover:bg-amber-200">
              <Link to={staffSiteAccountabilityPath(project.id)}>Open photo intelligence <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link to={ownerPortalPath(project.id, '/accountability')}>Preview the owner view <Eye className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-2">
          <SummaryMetric icon={Images} label="Photographs" value={summary.photos} tone="sky" />
          <SummaryMetric icon={Sparkles} label="Condition groups" value={summary.items} tone="violet" />
          <SummaryMetric icon={Clock3} label="Open" value={summary.open} tone="slate" />
          <SummaryMetric icon={Eye} label="Owner review" value={summary.ownerReview} tone="amber" />
          <SummaryMetric icon={AlertTriangle} label="Overdue" value={summary.overdue} tone="rose" />
          <SummaryMetric icon={CheckCircle2} label="Verified" value={summary.verified} tone="emerald" />
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-900', violet: 'bg-violet-50 text-violet-900', slate: 'bg-white text-slate-800',
    amber: 'bg-amber-50 text-amber-900', rose: 'bg-rose-50 text-rose-900', emerald: 'bg-emerald-50 text-emerald-900',
  };
  return <div className={`${colors[tone]} min-h-32 p-5 sm:p-6`}><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.14em] opacity-65">{label}</p><Icon className="h-4 w-4" /></div><p className="mt-3 text-4xl font-bold tabular-nums">{value}</p></div>;
}

function ProgramCard({ project, summary }: { project: ProjectWithProgram; summary: AccountabilityProjectSummary }) {
  return (
    <Link to={staffSiteAccountabilityPath(project.id)} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Camera className="h-5 w-5" /></span><ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div>
      <h3 className="mt-4 text-lg font-semibold text-[#082b23]">{project.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{project.property?.name || project.client?.name || 'Project evidence record'}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700"><span>{summary.photos} photos</span><span>·</span><span>{summary.open} open</span><span>·</span><span>{summary.verified} verified</span></div>
      {summary.lastActivityAt && <p className="mt-2 text-[11px] text-slate-400">Updated {formatDistanceToNow(new Date(summary.lastActivityAt), { addSuffix: true })}</p>}
    </Link>
  );
}
