import { isActiveProject } from '@/lib/projects';
import { useState, useMemo } from 'react';
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
  Edit, Archive, Trash2, Filter, X, FolderTree, ChevronDown, ChevronRight, Network,
} from 'lucide-react';
import { buildProjectTree } from '@/lib/projectTree';
import { useProjects, useProjectStats, useUpdateProject } from '@/hooks/useProjects';
import { useAllProjectFinancials } from '@/hooks/useAllProjectFinancials';
import { projectKind, type ProjectKind } from '@/lib/projectKind';
import { useProperties } from '@/hooks/useProperties';
import { usePendingChangeOrders, useChangeOrderStats } from '@/hooks/useChangeOrders';
import { useUpcomingMilestones } from '@/hooks/useMilestones';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/usePermissions';
import { computeHealth, HEALTH_CONFIG, type HealthStatus } from '@/lib/projectHealth';
import {
  getProjectSector, SECTOR_CONFIG, SECTOR_ORDER, type ProjectSector,
} from '@/lib/projectSector';
import { cn } from '@/lib/utils';
import type { Project } from '@/hooks/useProjects';

type ViewMode = 'cards' | 'list' | 'table';
type StatusFilter = 'all' | 'active' | 'planning' | 'on_hold' | 'completed';
type HealthFilter = HealthStatus | 'all';
type SectorFilter = ProjectSector | 'all';
type SortBy = 'name' | 'created' | 'due_date' | 'budget' | 'health';

const LS_VIEW_KEY = 'projects_view_preference';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyFilterId = searchParams.get('propertyId');

  // --- UI state ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialView);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<'all' | ProjectKind>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [groupByProgram, setGroupByProgram] = useState(true);
  const [collapsedPrograms, setCollapsedPrograms] = useState<Set<string>>(new Set());

  // --- Data ---
  const { data: projects, isLoading } = useProjects();
  const { financials } = useAllProjectFinancials();
  const { data: stats } = useProjectStats();
  const { data: changeOrderStats } = useChangeOrderStats();
  const { data: upcomingMilestones } = useUpcomingMilestones(7);
  const { data: properties } = useProperties();
  const { canCreate, isAdmin } = useUserPermissions();
  const updateProject = useUpdateProject();
  const canCreateProjects = canCreate('projects');

  const filteredProperty = propertyFilterId
    ? properties?.find((p) => p.id === propertyFilterId) ?? null
    : null;

  const clearPropertyFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('propertyId');
    setSearchParams(next, { replace: true });
  };

  // Persist view preference
  const handleViewChange = (v: string) => {
    if (!v) return;
    const mode = v as ViewMode;
    setViewMode(mode);
    try { localStorage.setItem(LS_VIEW_KEY, mode); } catch {}
  };

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
    let filtered = [...projects];

    // Property filter (from URL ?propertyId=…)
    if (propertyFilterId) {
      filtered = filtered.filter((p: any) => p.property_id === propertyFilterId);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    } else {
      // Default: show only active projects (shared selector — see lib/projects).
      filtered = filtered.filter(isActiveProject);
    }

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
      let av: any, bv: any;
      switch (sortBy) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'created': av = a.created_at; bv = b.created_at; break;
        case 'due_date': av = a.target_end_date || '9999'; bv = b.target_end_date || '9999'; break;
        case 'budget':
          av = financials.get(a.id)?.revised_contract || Number(a.budget) || 0;
          bv = financials.get(b.id)?.revised_contract || Number(b.budget) || 0;
          break;
        case 'health': av = HEALTH_ORDER[computeHealth(a)]; bv = HEALTH_ORDER[computeHealth(b)]; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, financials, propertyFilterId, search, statusFilter, kindFilter, healthFilter, sectorFilter, sortBy, sortDir]);

  // Real portfolio budget/billed from the financial view (projects.budget is never populated).
  const portfolioMoney = useMemo(() => {
    let budget = 0, billed = 0;
    financials.forEach((f) => { budget += f.revised_contract; billed += f.billed_to_date; });
    return { budget, billed };
  }, [financials]);

  // ── Hierarchy (shared rollup layer) ────────────────────────────────────────
  const tree = useMemo(() => buildProjectTree((projects ?? []) as Project[]), [projects]);
  const ownBudget = (id: string) => { const f = financials.get(id); return f && f.revised_contract > 0 ? f.revised_contract : Number((tree.byId.get(id) as any)?.budget) || 0; };
  const ownBilled = (id: string) => { const f = financials.get(id); return f && f.billed_to_date > 0 ? f.billed_to_date : Number((tree.byId.get(id) as any)?.spent) || 0; };
  const rolledBudget = (id: string) => tree.rollup(id, (n) => ownBudget(n.id));
  const rolledBilled = (id: string) => tree.rollup(id, (n) => ownBilled(n.id));

  const visibleIds = useMemo(() => new Set(displayProjects.map((p) => p.id)), [displayProjects]);
  const childrenOf = (id: string) => displayProjects.filter((p) => (p as any).parent_project_id === id);
  const rootProjects = displayProjects.filter((p) => { const pid = (p as any).parent_project_id; return !pid || !visibleIds.has(pid); });
  const hasHierarchy = displayProjects.some((p) => (p as any).parent_project_id && visibleIds.has((p as any).parent_project_id));
  const toggleProgram = (pid: string) => setCollapsedPrograms((prev) => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n; });

  const handleArchive = (project: Project) => {
    updateProject.mutate({ id: project.id, status: 'closed' });
  };

  // --- Card sub-component (inline to avoid prop-drilling) ---
  const ProjectCard = ({ project }: { project: Project }) => {
    // Real budget/billed comes from the financial view (prime + approved COs),
    // not the never-populated projects.budget column.
    const fin = financials.get(project.id);
    const budgetVal = fin && fin.revised_contract > 0 ? fin.revised_contract : Number(project.budget) || 0;
    const spentVal = fin && fin.billed_to_date > 0 ? fin.billed_to_date : Number(project.spent) || 0;
    const progress = budgetVal ? Math.round((spentVal / budgetVal) * 100) : 0;
    const isClientProject = (project as any).project_type === 'client';
    const parentName = isClientProject ? (project as any).client?.name : project.property?.name;
    const health = computeHealth(project);
    const hc = HEALTH_CONFIG[health];
    const HIcon = hc.icon;
    const sc = SECTOR_CONFIG[getProjectSector(project)];
    const SIcon = sc.icon;

    return (
      <div
        className={cn(
          'p-4 rounded-lg border border-l-4 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative',
          sc.accent,
        )}
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        {/* More actions */}
        <div
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditProject(project)}>
                <Edit className="h-4 w-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchive(project)}>
                <Archive className="h-4 w-4 mr-2" />Archive
              </DropdownMenuItem>
              {isAdmin && (
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

        <div className="flex items-start justify-between mb-3 pr-8">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-semibold">{project.name}</h4>
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
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
            {parentName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {isClientProject ? <Briefcase className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                <span>{parentName}</span>
              </div>
            )}
          </div>
          {/* Health badge */}
          <span className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0',
            hc.bg, hc.text, hc.border
          )}>
            <HIcon className="h-3 w-3" />
            {hc.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Budget</span>
              <span className="text-xs font-medium">
                {formatCurrency(spentVal)} / {formatCurrency(budgetVal)}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          {project.target_end_date && (
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground">Due</span>
              <p className="text-xs font-medium">
                {new Date(project.target_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
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

  const grouped = groupByProgram;
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
              <SelectItem value="all">All Active</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Kind: construction vs consulting */}
          <ToggleGroup type="single" value={kindFilter} onValueChange={(v) => setKindFilter((v as 'all' | ProjectKind) || 'all')} className="border rounded-lg p-0.5 bg-muted/30 h-9">
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

          {/* Group subprojects under their program (renders in cards view) */}
          {displayProjects.length > 0 && (
            <Button
              variant={groupByProgram ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => { const nv = !groupByProgram; setGroupByProgram(nv); if (nv && viewMode !== 'cards') handleViewChange('cards'); }}
              title={hasHierarchy ? 'Group subprojects under their program' : 'Once you add subprojects, they nest under their program here'}
            >
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Group by program</span>
            </Button>
          )}

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
            isAdmin={isAdmin}
            onEdit={setEditProject}
            onDelete={setDeleteTarget}
            onArchive={handleArchive}
          />
        ) : (
          <ProjectTableView
            projects={displayProjects}
            isAdmin={isAdmin}
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
    </div>
  );
}
