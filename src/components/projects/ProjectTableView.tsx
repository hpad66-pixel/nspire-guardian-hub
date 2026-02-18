import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2, Briefcase, MoreHorizontal, Edit, Archive, Trash2,
  ArrowUp, ArrowDown, ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeHealth, HEALTH_CONFIG } from '@/lib/projectHealth';
import { format } from 'date-fns';
import type { Project } from '@/hooks/useProjects';

type SortKey = 'name' | 'status' | 'budget' | 'spent_pct' | 'start_date' | 'end_date' | 'health';
type SortDir = 'asc' | 'desc';

interface ProjectTableViewProps {
  projects: Project[];
  isAdmin: boolean;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onArchive: (project: Project) => void;
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  closed: 'Closed',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  planning: 'secondary',
  on_hold: 'outline',
  completed: 'outline',
  closed: 'outline',
};

const HEALTH_ORDER: Record<string, number> = { overdue: 0, at_risk: 1, stalled: 2, on_track: 3 };

const formatCurrency = (amount: number | string | null | undefined) => {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
    notation: 'compact',
  }).format(Number(amount));
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
}

export function ProjectTableView({ projects, isAdmin, onEdit, onDelete, onArchive }: ProjectTableViewProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...projects].sort((a, b) => {
    let av: any, bv: any;
    switch (sortKey) {
      case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
      case 'status': av = a.status; bv = b.status; break;
      case 'budget': av = Number(a.budget) || 0; bv = Number(b.budget) || 0; break;
      case 'spent_pct':
        av = a.budget ? (Number(a.spent) / Number(a.budget)) : 0;
        bv = b.budget ? (Number(b.spent) / Number(b.budget)) : 0;
        break;
      case 'start_date': av = a.start_date || ''; bv = b.start_date || ''; break;
      case 'end_date': av = a.target_end_date || ''; bv = b.target_end_date || ''; break;
      case 'health':
        av = HEALTH_ORDER[computeHealth(a)]; bv = HEALTH_ORDER[computeHealth(b)]; break;
      default: av = ''; bv = '';
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const Th = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </TableHead>
  );

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <Th col="name">Name</Th>
            <TableHead>Type / Parent</TableHead>
            <Th col="status">Status</Th>
            <Th col="budget">Budget</Th>
            <Th col="spent_pct">Spent %</Th>
            <Th col="start_date">Start</Th>
            <Th col="end_date">End</Th>
            <Th col="health">Health</Th>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((project) => {
            const isClientProject = (project as any).project_type === 'client';
            const parentName = isClientProject
              ? (project as any).client?.name
              : project.property?.name;
            const budget = Number(project.budget) || 0;
            const spent = Number(project.spent) || 0;
            const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
            const health = computeHealth(project);
            const hc = HEALTH_CONFIG[health];
            const HIcon = hc.icon;

            return (
              <TableRow
                key={project.id}
                className="cursor-pointer group"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {project.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {isClientProject
                      ? <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      : <Building2 className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate max-w-[120px]">{parentName || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[project.status ?? 'planning'] ?? 'outline'} className="text-xs">
                    {STATUS_LABELS[project.status ?? 'planning'] ?? project.status}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums text-sm">{formatCurrency(project.budget)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <Progress value={spentPct} className="h-1.5 flex-1" />
                    <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{spentPct}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {project.start_date ? format(new Date(project.start_date), 'MMM d, yy') : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground tabular-nums">
                  {project.target_end_date ? format(new Date(project.target_end_date), 'MMM d, yy') : '—'}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    hc.bg, hc.text, hc.border
                  )}>
                    <HIcon className="h-3 w-3" />
                    {hc.label}
                  </span>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(project)}>
                        <Edit className="h-4 w-4 mr-2" />Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onArchive(project)}>
                        <Archive className="h-4 w-4 mr-2" />Archive
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(project)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
