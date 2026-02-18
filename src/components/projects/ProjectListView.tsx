import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Briefcase, MoreHorizontal, Edit, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeHealth, HEALTH_CONFIG } from '@/lib/projectHealth';
import type { Project } from '@/hooks/useProjects';

interface ProjectListViewProps {
  projects: Project[];
  isAdmin: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onArchive: (project: Project) => void;
}

const STATUS_DOT: Record<string, string> = {
  planning: 'bg-blue-500',
  active: 'bg-green-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-slate-400',
  closed: 'bg-slate-300',
};

const formatCurrency = (amount: number | string | null | undefined) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
    notation: 'compact',
  }).format(Number(amount));
};

export function ProjectListView({ projects, isAdmin, onEdit, onDelete, onArchive }: ProjectListViewProps) {
  const navigate = useNavigate();

  return (
    <div className="divide-y divide-border rounded-lg border bg-card">
      {projects.map((project) => {
        const isClientProject = (project as any).project_type === 'client';
        const parentName = isClientProject
          ? (project as any).client?.name
          : project.property?.name;
        const progress = project.budget && project.spent
          ? Math.round((Number(project.spent) / Number(project.budget)) * 100)
          : 0;
        const health = computeHealth(project);
        const hc = HEALTH_CONFIG[health];
        const HIcon = hc.icon;
        const dot = STATUS_DOT[project.status ?? 'planning'] ?? 'bg-slate-400';
        const isDone = project.status === 'completed' || project.status === 'closed';

        return (
          <div
            key={project.id}
            className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            {/* Status dot */}
            <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dot)} />

            {/* Name & parent */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('font-medium text-sm truncate', isDone && 'line-through text-muted-foreground')}>
                  {project.name}
                </span>
                {parentName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    {isClientProject ? <Briefcase className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                    {parentName}
                  </span>
                )}
              </div>
            </div>

            {/* Budget */}
            <div className="hidden md:flex items-center gap-2 w-40 shrink-0">
              <div className="flex-1">
                <Progress value={progress} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
                {formatCurrency(project.spent)}/{formatCurrency(project.budget)}
              </span>
            </div>

            {/* Due date */}
            {project.target_end_date ? (
              <span className="hidden lg:block text-xs text-muted-foreground tabular-nums w-20 text-right shrink-0">
                {new Date(project.target_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            ) : (
              <span className="hidden lg:block w-20 shrink-0" />
            )}

            {/* Health badge */}
            <span className={cn(
              'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0',
              hc.bg, hc.text, hc.border
            )}>
              <HIcon className="h-3 w-3" />
              {hc.label}
            </span>

            {/* Actions */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(project)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(project)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
