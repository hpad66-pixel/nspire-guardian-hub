import { isActiveProject } from '@/lib/projects';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  FolderKanban, Plus, Calendar, DollarSign, FileText, Building2, Briefcase,
  LayoutGrid, List, Table2, Search, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle, AlertTriangle, XCircle, PauseCircle, MoreHorizontal,
  Edit, Archive, Trash2, Filter, X, FolderTree, ChevronDown, ChevronRight,
} from 'lucide-react';
import { buildProjectTree } from '@/lib/projectTree';
import { useProjects, useProjectStats } from '@/hooks/useProjects';
import { useClient } from '@/hooks/useClients';
import { useAllProjectFinancials } from '@/hooks/useAllProjectFinancials';
import { useAllApprovedProposalTotals } from '@/hooks/useAllApprovedProposalTotals';
import { projectKind, projectKindTileClass, type ProjectKind } from '@/lib/projectKind';
import { resolveProjectTileAmounts } from '@/lib/projectTileAmounts';
import { useProperties } from '@/hooks/useProperties';
import { usePendingChangeOrders, useChangeOrderStats } from '@/hooks/useChangeOrders';
import { useUpcomingMilestones } from '@/hooks/useMilestones';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectCloseDialog } from '@/components/projects/ProjectCloseDialog';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { ProjectKindBadge } from '@/components/projects/ProjectKindBadge';
import { ProjectOwnerBadge } from '@/components/projects/ProjectOwnerBadge';
import { ProjectClosedCardStamp } from '@/components/projects/ProjectClosedCardStamp';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/usePermissions';
import { computeHealth, HEALTH_CONFIG, type HealthStatus } from '@/lib/projectHealth';
import {
  getProjectSector, SECTOR_CONFIG, SECTOR_ORDER, type ProjectSector,
} from '@/lib/projectSector';
import { cn } from '@/lib/utils';
import type { Project } from '@/hooks/useProjects';
import { usePlatformSuperAdmin } from '@/hooks/usePlatformAdmin';
import {
  compareClosedProjectsFirst,
  matchesPortfolioStatus,
  type PortfolioStatusFilter,
} from '@/lib/projects/portfolioProjectVisibility';
import {
  resolveClientPortfolioProjects,
  shouldIncludeProjectForClientFilter,
} from '@/lib/projects/clientPortfolio';

type ViewMode = 'cards' | 'list' | 'table';
type StatusFilter = PortfolioStatusFilter;
type HealthFilter = HealthStatus | 'all';
type SectorFilter = ProjectSector | 'all';
type SortBy = 'name' | 'created' | 'due_date' | 'budget' | 'health';

const LS_VIEW_KEY = 'projects_view_preference';
const GLORIETA_CONVEYANCE_PROJECT_ID = '4b168bb0-a0a0-4c0a-bcd8-eb56ec2f413d';

const normalizeKindParam = (value: string | null): 'all' | ProjectKind =>
  value === 'construction' || value === 'consulting' ? value : 'all';

function getInitialView(): ViewMode {
  try {
    const stored = localStorage.getItem(LS_VIEW_KEY);
    if (stored === 'cards' || stored === 'list' || stored === 'table') return stored;
  } catch {}
  return 'cards';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount);

const HEALTH_ORDER: Record<HealthStatus, number> = { overdue: 0, at_risk: 1, stalled: 2, on_track: 3 };

export default function ProjectsDashboard() {
  const navigate = useNavigate();
  const { isSuperAdmin: canDeleteProjects } = usePlatformSuperAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyFilterId = searchParams.get('propertyId');
  const clientFilterId = searchParams.get('clientId');
  const kindFilterFromUrl = normalizeKindParam(searchParams.get('kind'));

  // --- UI state ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [closeTarget, setCloseTarget] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialView);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<'all' | ProjectKind>(kindFilterFromUrl);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<string>>(new Set());

  // --- Data ---
  const { data: projects, isLoading } = useProjects();
  const { data: selectedClient } = useClient(clientFilterId ?? undefined);
  const { financials } = useAllProjectFinancials();
  const { consultingTotals } = useAllApprovedProposalTotals();
  const { data: stats } = useProjectStats();
  const { data: changeOrderStats } = useChangeOrderStats();
  const { data: upcomingMilestones } = useUpcomingMilestones(7);
  const { data: properties } = useProperties();
  const { canCreate, isAdmin, currentRole } = useUserPermissions();
  const canCreateProjects = canCreate('projects');
  const canCloseProjects = canDeleteProjects || isAdmin || currentRole === 'owner' || currentRole === 'administrator';
  const portfolioProjects = useMemo(
    () => resolveClientPortfolioProjects(projects ?? []),
    [projects],
  );

  const filteredProperty = propertyFilterId
    ? properties?.find((p) => p.id === propertyFilterId) ?? null
    : null;
  const filteredClient = clientFilterId
    ? selectedClient ?? portfolioProjects.find((p: any) => p.client_id === clientFilterId)?.client ?? null
    : null;
  const filteredClientName = filteredClient?.name ?? null;

  const clearPropertyFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('propertyId');
    setSearchParams(next, { replace: true });
  };
  const clearClientFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('clientId');
    setSearchParams(next, { replace: true });
  };
  const handleKindFilterChange = (nextKind: 'all' | ProjectKind) => {
    setKindFilter(nextKind);
    const next = new URLSearchParams(searchParams);
    if (nextKind === 'all') next.delete('kind');
    else next.set('kind', nextKind);
    setSearchParams(next, { replace: true });
  };

  // Persist view preference
  const handleViewChange = (v: string) => {
    if (!v) return;
    const mode = v as ViewMode;
    setViewMode(mode);
    try { localStorage.setItem(LS_VIEW_KEY, mode); } catch {}
  };

  useEffect(() => {
    setKindFilter(kindFilterFromUrl);
  }, [kindFilterFromUrl]);

  // --- Computed health counts ---
  const healthCounts = useMemo(() => {
    if (!projects) return { on_track: 0, at_risk: 0, overdue: 0, stalled: 0 };
    const activeProjects = projects.filter(isActiveProject);
    return activeProjects.reduce((acc, p) => {
      acc[computeHealth(p)]++;
      return acc;
    }, { on_track: 0, at_risk: 0, overdue: 0, stalled: 0 } as Record<HealthStatus, number>);
  }, [projects]);

  // --- Computed sector counts (over active projects) ---
  const sectorCounts = useMemo(() => {
    const empty = { government: 0, private: 0, property_mgmt: 0, internal: 0, property: 0, other: 0 } as Record<ProjectSector, number>;
    if (!projects) return empty;
    return projects.filter(isActiveProject).reduce((acc, p) => {
      acc[getProjectSector(p)]++;
      return acc;
    }, empty);
  }, [projects]);

  // --- Filtered & sorted projects ---
  const displayProjects = useMemo(() => {
    if (!projects) return [];
    let filtered = [...portfolioProjects];

    // Property filter (from URL ?propertyId=…)
    if (propertyFilterId) {
      filtered = filtered.filter((p: any) => p.property_id === propertyFilterId);
    }

    // Client filter (from dashboard portfolio cards)
    if (clientFilterId) {
      const selectedClientName =
        selectedClient?.name ?? portfolioProjects.find((p: any) => p.client_id === clientFilterId)?.client?.name ?? null;
      filtered = filtered.filter((p: any) =>
        shouldIncludeProjectForClientFilter(p, clientFilterId, selectedClientName),
      );
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    // The main portfolio stays focused on current work. A client-filtered
    // portfolio is a record of that client's complete work, so closed projects
    // remain visible there unless the user chooses a specific status.
    filtered = filtered.filter((project) =>
      matchesPortfolioStatus(project, statusFilter, { includeClosedInAll: Boolean(clientFilterId) }),
    );

    // Kind filter (construction vs consulting) — they measure different things.
    if (kindFilter !== 'all') {
      filtered = filtered.filter(p => projectKind(p) === kindFilter);
    }

    // Health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter(p => computeHealth(p) === healthFilter);
    }

    // Sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(p => getProjectSector(p) === sectorFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (statusFilter === 'all') {
        const closeoutOrder = compareClosedProjectsFirst(a, b);
        if (closeoutOrder !== 0) return closeoutOrder;
      }

      let av: any, bv: any;
      switch (sortBy) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'created': av = a.created_at; bv = b.created_at; break;
        case 'due_date': av = a.target_end_date || '9999'; bv = b.target_end_date || '9999'; break;
        case 'budget':
          av = resolveProjectTileAmounts({
            project: a,
            construction: financials.get(a.id),
            consulting: consultingTotals.get(a.id),
          }).budget;
          bv = resolveProjectTileAmounts({
            project: b,
            construction: financials.get(b.id),
            consulting: consultingTotals.get(b.id),
          }).budget;
          break;
        case 'health': av = HEALTH_ORDER[computeHealth(a)]; bv = HEALTH_ORDER[computeHealth(b)]; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, portfolioProjects, financials, consultingTotals, propertyFilterId, clientFilterId, selectedClient?.name, search, statusFilter, kindFilter, healthFilter, sectorFilter, sortBy, sortDir]);

  // ── Hierarchy (shared rollup layer) ────────────────────────────────────────
  const tree = useMemo(() => buildProjectTree((projects ?? []) as Project[]), [projects]);
  const ownBudget = (id: string) => {
    const p = tree.byId.get(id) as Project | undefined;
    return resolveProjectTileAmounts({
      project: p ?? { budget: 0 },
      construction: financials.get(id),
      consulting: consultingTotals.get(id),
    }).budget;
  };
  const ownBilled = (id: string) => {
    const p = tree.byId.get(id) as Project | undefined;
    return resolveProjectTileAmounts({
      project: p ?? { budget: 0 },
      construction: financials.get(id),
      consulting: consultingTotals.get(id),
    }).spent;
  };
  const rolledBudget = (id: string) => tree.rollup(id, (n) => ownBudget(n.id));
  const rolledBilled = (id: string) => tree.rollup(id, (n) => ownBilled(n.id));

  // Portfolio money: construction financials + consulting approved-proposal fees.
  const portfolioMoney = useMemo(() => {
    let budget = 0, billed = 0;
    const seen = new Set<string>();
    (projects ?? []).forEach((p) => {
      seen.add(p.id);
      const amt = resolveProjectTileAmounts({
        project: p,
        construction: financials.get(p.id),
        consulting: consultingTotals.get(p.id),
      });
      budget += amt.budget;
      billed += amt.spent;
    });
    consultingTotals.forEach((c, id) => {
      if (seen.has(id)) return;
      budget += c.approvedFee;
      billed += c.invoiced;
    });
    return { budget, billed };
  }, [projects, financials, consultingTotals]);

  const visibleIds = useMemo(() => new Set(displayProjects.map((p) => p.id)), [displayProjects]);
  const childrenOf = (id: string) => displayProjects.filter((p) => (p as any).parent_project_id === id);
  const rootProjects = displayProjects.filter((p) => { const pid = (p as any).parent_project_id; return !pid || !visibleIds.has(pid); });
  const toggleProgram = (pid: string) => setCollapsedPrograms((prev) => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });

  const handleArchive = (project: Project) => {
    if (project.status === 'closed') {
      navigate(`/projects/${project.id}`);
      return;
    }
    if (projectKind(project) === 'consulting') {
      navigate(`/projects/${project.id}/financials/closeout`);
      return;
    }
    setCloseTarget(project);
  };

  // --- Card sub-component (inline to avoid prop-drilling) ---
  const ProjectCard = ({ project }: { project: Project }) => {
    // Construction → prime + COs; consulting → sum of approved proposals
    // (e.g. Larkin MRI $3,369 + $14,500).
    const amounts = resolveProjectTileAmounts({
      project,
      construction: financials.get(project.id),
      consulting: consultingTotals.get(project.id),
    });
    const budgetVal = amounts.budget;
    const spentVal = amounts.spent;
    const progress = budgetVal ? Math.round((spentVal / budgetVal) * 100) : 0;
    const kind = projectKind(project);
    const isClientProject = (project as any).project_type === 'client';
    const parentName = isClientProject ? (project as any).client?.name : project.property?.name;
    const health = computeHealth(project);
    const hc = HEALTH_CONFIG[health];
    const HIcon = hc.icon;
    const sc = SECTOR_CONFIG[getProjectSector(project)];
    const SIcon = sc.icon;
    const isClosed = project.status === 'closed';

    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border border-l-4 p-4 cursor-pointer transition-all duration-200',
          'hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/30',
          projectKindTileClass(kind),
          isClosed && 'border-amber-300/80 bg-gradient-to-br from-amber-50/70 via-card to-emerald-50/50 shadow-sm',
        )}
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <div
          className={cn(
            'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-30',
            kind === 'consulting' ? 'bg-[var(--kind-consulting-accent)]' : 'bg-[var(--kind-construction-accent)]',
          )}
        />
        {/* More actions */}
        <div
          className="absolute top-3 right-3 z-10 opacity-80 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/40 shadow-sm backdrop-blur-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {project.status !== 'closed' && (
                <DropdownMenuItem onClick={() => setEditProject(project)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
              )}
              {(project.status === 'closed' || canCloseProjects) && (
                <DropdownMenuItem onClick={() => handleArchive(project)}>
                  <Archive className="h-4 w-4 mr-2" />{project.status === 'closed' ? 'View closeout' : 'Close & lock'}
                </DropdownMenuItem>
              )}
              {canDeleteProjects && project.status !== 'closed' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget(project)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative flex min-h-[144px] flex-col gap-4">
          <div className="flex items-start gap-3 pr-8">
            <div
              className={cn(
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                kind === 'consulting'
                  ? 'border-white/25 bg-white/10 text-[var(--kind-consulting-accent)]'
                  : 'border-[var(--kind-construction-accent)]/30 bg-white/70 text-[var(--kind-construction-accent)]',
              )}
            >
              {kind === 'consulting' ? <Briefcase className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ProjectKindBadge project={project} />
                <Badge
                  variant={project.status === 'active' ? 'default' : 'secondary'}
                  className={cn('text-xs capitalize', isClosed && 'border border-amber-300 bg-amber-100 text-amber-950')}
                >
                  {project.status === 'active' ? 'Active' : project.status}
                </Badge>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                  sc.bg, sc.text, sc.border,
                )}>
                  <SIcon className="h-3 w-3" />
                  {sc.label}
                </span>
              </div>
              <h4 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">{project.name}</h4>
              {parentName && (
                <div className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  {isClientProject ? <Briefcase className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                  <span className="truncate">{parentName}</span>
                </div>
              )}
            </div>
          </div>

          {isClosed ? (
            <div className="space-y-3">
              <ProjectClosedCardStamp project={project} />
              <div className="rounded-xl border border-current/10 bg-background/45 px-3 py-2 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                      {kind === 'consulting' ? 'Approved fees' : 'Revised contract'}
                    </p>
                    <p className="text-base font-black tabular-nums">{formatCurrency(budgetVal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Billed</p>
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(spentVal)}</p>
                  </div>
                </div>
                {project.id === GLORIETA_CONVEYANCE_PROJECT_ID && (
                  <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                    D&apos;SHIN Plumbing · SC-001 sewer extension commitment
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <ProjectOwnerBadge project={project} prominent className="max-w-full justify-start" />
                <div
                  className={cn(
                    'flex min-h-[52px] items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm backdrop-blur-sm',
                    kind === 'consulting'
                      ? 'border-white/15 bg-white/10 text-white'
                      : 'border-[var(--kind-construction-ink)]/10 bg-white/60 text-[var(--kind-construction-ink)]',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] opacity-65">Health</span>
                    <span className="block truncate font-bold">{hc.label}</span>
                  </span>
                  <span className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-medium',
                    hc.bg, hc.text, hc.border,
                  )}>
                    <HIcon className="h-3 w-3" />
                  </span>
                </div>
              </div>

              <div className="flex items-end gap-3 border-t border-current/10 pt-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                      {kind === 'consulting' ? 'Approved fees' : 'Budget'}
                    </span>
                    <span className="text-xs font-bold tabular-nums">
                      {formatCurrency(spentVal)} / {formatCurrency(budgetVal)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
                {project.target_end_date && (
                  <div className="shrink-0 rounded-xl border border-current/10 bg-background/20 px-2.5 py-1.5 text-right shadow-sm backdrop-blur-sm">
                    <span className="block text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Due</span>
                    <p className="text-xs font-bold tabular-nums">
                      {new Date(project.target_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // --- Program group: a project with visible children, rolled up + expandable ---
  const ProgramNode = ({ project, depth = 0 }: { project: Project; depth?: number }) => {
    const kids = childrenOf(project.id);
    const leaves = kids.filter((k) => childrenOf(k.id).length === 0);
    const subPrograms = kids.filter((k) => childrenOf(k.id).length > 0);
    const collapsed = collapsedPrograms.has(project.id);
    const rBudget = rolledBudget(project.id);
    const rBilled = rolledBilled(project.id);
    const pct = rBudget > 0 ? Math.round((rBilled / rBudget) * 100) : 0;
    const health = computeHealth(project);
    const hc = HEALTH_CONFIG[health];

    return (
      <div className={cn('rounded-xl border bg-muted/20', depth > 0 && 'mt-3')}>
        {/* Program header */}
        <div className="flex items-center gap-2.5 p-3">
          <button onClick={() => toggleProgram(project.id)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted shrink-0" title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="h-8 w-8 rounded-lg bg-module-projects/90 flex items-center justify-center shrink-0"><FolderTree className="h-4 w-4 text-white" /></div>
          <button onClick={() => navigate(`/projects/${project.id}`)} className="min-w-0 text-left group">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate group-hover:underline">{project.name}</span>
              <Badge variant="secondary" className="text-[10px] shrink-0">Program</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">{kids.length} subproject{kids.length !== 1 ? 's' : ''}</div>
          </button>
          <ProjectOwnerBadge project={project} compact className="hidden lg:inline-flex" />
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="hidden sm:block w-40">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5"><span>{formatCurrency(rBilled)}</span><span>{formatCurrency(rBudget)}</span></div>
              <Progress value={pct} className="h-1.5" />
            </div>
            <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', hc.bg, hc.text, hc.border)}>{hc.label}</span>
          </div>
        </div>

        {/* Children */}
        {!collapsed && (
          <div className="px-3 pb-3 pl-6 border-l-2 border-border/60 ml-4 space-y-3">
            {leaves.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {leaves.map((k) => <ProjectCard key={k.id} project={k} />)}
              </div>
            )}
            {subPrograms.map((sp) => <ProgramNode key={sp.id} project={sp} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const grouped = false;
  const standaloneRoots = rootProjects.filter((p) => childrenOf(p.id).length === 0);
  const programRoots = rootProjects.filter((p) => childrenOf(p.id).length > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-module-projects flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Capital improvements, client engagements, and construction project management
          </p>
        </div>
        {canCreateProjects && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
      </div>

      {/* ── Property filter banner ── */}
      {filteredProperty && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Filtered to property</span>
            <span className="font-semibold text-foreground">{filteredProperty.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearPropertyFilter}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      {/* ── Client filter banner ── */}
      {clientFilterId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--apas-sapphire)]/30 bg-[var(--apas-sapphire)]/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-[var(--apas-sapphire)]" />
            <span className="text-muted-foreground">Filtered to client</span>
            <span className="font-semibold text-foreground">{filteredClientName ?? 'Selected client'}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearClientFilter}
            className="h-7 gap-1 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Projects" value={stats?.active || 0} subtitle={`${stats?.planning || 0} in planning`} icon={FolderKanban} />
        <StatCard title="Total Budget" value={formatCurrency(portfolioMoney.budget || stats?.totalBudget || 0)} subtitle={`${formatCurrency(portfolioMoney.billed || stats?.totalSpent || 0)} billed`} icon={DollarSign} />
        <StatCard title="On Schedule" value={stats?.active || 0} subtitle={`${stats?.onHold || 0} on hold`} icon={Calendar} variant="success" />
        <StatCard title="Open Change Orders" value={changeOrderStats?.pendingCount || 0} subtitle={changeOrderStats ? formatCurrency(changeOrderStats.pendingAmount) + ' pending' : '$0 pending'} icon={FileText} variant="moderate" />
      </div>

      {/* ── Portfolio Health Strip ── */}
      {projects && projects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Portfolio Health</span>
          {(['on_track', 'at_risk', 'overdue', 'stalled'] as HealthStatus[]).map(h => {
            const hc = HEALTH_CONFIG[h];
            const HIcon = hc.icon;
            const count = healthCounts[h];
            const isActive = healthFilter === h;
            return (
              <button
                key={h}
                onClick={() => setHealthFilter(isActive ? 'all' : h)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  isActive
                    ? cn(hc.bg, hc.text, hc.border, 'ring-2 ring-offset-1 ring-current')
                    : 'border-border text-muted-foreground hover:border-current',
                  !isActive && count > 0 && cn(hc.text)
                )}
              >
                <HIcon className="h-3.5 w-3.5" />
                <span>{count} {hc.label}</span>
              </button>
            );
          })}
          {healthFilter !== 'all' && (
            <button
              onClick={() => setHealthFilter('all')}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Sector Strip ── */}
      {projects && projects.length > 0 && SECTOR_ORDER.some(s => sectorCounts[s] > 0) && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Sector</span>
          {SECTOR_ORDER.filter(s => sectorCounts[s] > 0).map(s => {
            const sc = SECTOR_CONFIG[s];
            const SIcon = sc.icon;
            const isActive = sectorFilter === s;
            return (
              <button
                key={s}
                onClick={() => setSectorFilter(isActive ? 'all' : s)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  isActive
                    ? cn(sc.bg, sc.text, sc.border, 'ring-2 ring-offset-1 ring-current')
                    : cn(sc.text, 'border-border hover:border-current'),
                )}
              >
                <SIcon className="h-3.5 w-3.5" />
                <span>{sectorCounts[s]} {sc.label}</span>
              </button>
            );
          })}
          {sectorFilter !== 'all' && (
            <button
              onClick={() => setSectorFilter('all')}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Projects Section ── */}
      <div className="space-y-4">
        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-36">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Kind: construction vs consulting */}
          <ToggleGroup
            type="single"
            value={kindFilter}
            onValueChange={(v) => handleKindFilterChange((v as 'all' | ProjectKind) || 'all')}
            className="border rounded-lg p-0.5 bg-muted/30 h-9"
          >
            <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="construction" className="h-7 px-2.5 text-xs">Construction</ToggleGroupItem>
            <ToggleGroupItem value="consulting" className="h-7 px-2.5 text-xs">Consulting</ToggleGroupItem>
          </ToggleGroup>

          {/* Sort by */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 w-36">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="health">Health</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort direction */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          >
            {sortDir === 'asc'
              ? <ArrowUp className="h-4 w-4" />
              : <ArrowDown className="h-4 w-4" />}
          </Button>

          <div className="flex-1" />

          {/* View toggle */}
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewChange} className="border rounded-lg p-0.5 bg-muted/30">
            <ToggleGroupItem value="cards" aria-label="Card view" className="h-8 w-8 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0">
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Result count */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {displayProjects.length} project{displayProjects.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-card">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-1">No projects found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || healthFilter !== 'all' || sectorFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            {canCreateProjects && !search && statusFilter === 'all' && (
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create Project
              </Button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          grouped ? (
            <div className="space-y-3">
              {programRoots.map((p) => <ProgramNode key={p.id} project={p} />)}
              {standaloneRoots.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {standaloneRoots.map((project) => <ProjectCard key={project.id} project={project} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )
        ) : viewMode === 'list' ? (
          <ProjectListView
            projects={displayProjects}
            isAdmin={canDeleteProjects}
            canClose={canCloseProjects}
            onEdit={setEditProject}
            onDelete={setDeleteTarget}
            onArchive={handleArchive}
          />
        ) : (
          <ProjectTableView
            projects={displayProjects}
            isAdmin={canDeleteProjects}
            canClose={canCloseProjects}
            onEdit={setEditProject}
            onDelete={setDeleteTarget}
            onArchive={handleArchive}
          />
        )}
      </div>

      {/* Dialogs */}
      {canCreateProjects && (
        <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
      {editProject && (
        <ProjectDialog
          open={!!editProject}
          onOpenChange={(open) => { if (!open) setEditProject(null); }}
          project={editProject}
        />
      )}
      {deleteTarget && (
        <DeleteProjectDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          projectId={deleteTarget.id}
          projectName={deleteTarget.name}
          navigateAfter={false}
        />
      )}
      {closeTarget && (
        <ProjectCloseDialog
          open={!!closeTarget}
          onOpenChange={(open) => { if (!open) setCloseTarget(null); }}
          projectId={closeTarget.id}
          projectName={closeTarget.name}
          consulting={projectKind(closeTarget) === 'consulting'}
        />
      )}
    </div>
  );
}
