import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Edit, Archive, Trash2, Filter,
} from 'lucide-react';
import { useProjects, useProjectStats, useUpdateProject } from '@/hooks/useProjects';
import { usePendingChangeOrders, useChangeOrderStats } from '@/hooks/useChangeOrders';
import { useUpcomingMilestones } from '@/hooks/useMilestones';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { DeleteProjectDialog } from '@/components/projects/DeleteProjectDialog';
import { ProjectListView } from '@/components/projects/ProjectListView';
import { ProjectTableView } from '@/components/projects/ProjectTableView';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserPermissions } from '@/hooks/usePermissions';
import { computeHealth, HEALTH_CONFIG, type HealthStatus } from '@/lib/projectHealth';
import { cn } from '@/lib/utils';
import type { Project } from '@/hooks/useProjects';

type ViewMode = 'cards' | 'list' | 'table';
type StatusFilter = 'all' | 'active' | 'planning' | 'on_hold' | 'completed';
type HealthFilter = HealthStatus | 'all';
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

  // --- UI state ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialView);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // --- Data ---
  const { data: projects, isLoading } = useProjects();
  const { data: stats } = useProjectStats();
  const { data: changeOrderStats } = useChangeOrderStats();
  const { data: upcomingMilestones } = useUpcomingMilestones(7);
  const { canCreate, isAdmin } = useUserPermissions();
  const updateProject = useUpdateProject();
  const canCreateProjects = canCreate('projects');

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
    const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'closed');
    return activeProjects.reduce((acc, p) => {
      acc[computeHealth(p)]++;
      return acc;
    }, { on_track: 0, at_risk: 0, overdue: 0, stalled: 0 } as Record<HealthStatus, number>);
  }, [projects]);

  // --- Filtered & sorted projects ---
  const displayProjects = useMemo(() => {
    if (!projects) return [];
    let filtered = [...projects];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    } else {
      // Default: hide completed/closed unless explicitly filtering
      filtered = filtered.filter(p => p.status !== 'completed' && p.status !== 'closed');
    }

    // Health filter
    if (healthFilter !== 'all') {
      filtered = filtered.filter(p => computeHealth(p) === healthFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let av: any, bv: any;
      switch (sortBy) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'created': av = a.created_at; bv = b.created_at; break;
        case 'due_date': av = a.target_end_date || '9999'; bv = b.target_end_date || '9999'; break;
        case 'budget': av = Number(a.budget) || 0; bv = Number(b.budget) || 0; break;
        case 'health': av = HEALTH_ORDER[computeHealth(a)]; bv = HEALTH_ORDER[computeHealth(b)]; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [projects, search, statusFilter, healthFilter, sortBy, sortDir]);

  const handleArchive = (project: Project) => {
    updateProject.mutate({ id: project.id, status: 'closed' });
  };

  // --- Card sub-component (inline to avoid prop-drilling) ---
  const ProjectCard = ({ project }: { project: Project }) => {
    const progress = project.budget && project.spent
      ? Math.round((Number(project.spent) / Number(project.budget)) * 100)
      : 0;
    const isClientProject = (project as any).project_type === 'client';
    const parentName = isClientProject ? (project as any).client?.name : project.property?.name;
    const health = computeHealth(project);
    const hc = HEALTH_CONFIG[health];
    const HIcon = hc.icon;

    return (
      <div
        className="p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative"
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
                {project.spent ? formatCurrency(Number(project.spent)) : '$0'} / {project.budget ? formatCurrency(Number(project.budget)) : '$0'}
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

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Projects" value={stats?.active || 0} subtitle={`${stats?.planning || 0} in planning`} icon={FolderKanban} />
        <StatCard title="Total Budget" value={stats ? formatCurrency(stats.totalBudget) : '$0'} subtitle={stats ? `${formatCurrency(stats.totalSpent)} spent` : '$0 spent'} icon={DollarSign} />
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
              {search || statusFilter !== 'all' || healthFilter !== 'all'
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
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
