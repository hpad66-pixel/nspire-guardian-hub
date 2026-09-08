import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getProjectOwnerInitials,
  getProjectOwnerLabel,
  type ProjectCardRecord,
} from '@/lib/projects/projectCardPresentation';

export function ProjectOwnerBadge({
  project,
  compact = false,
  className,
}: {
  project: ProjectCardRecord;
  compact?: boolean;
  className?: string;
}) {
  const label = getProjectOwnerLabel(project);
  const unassigned = label === 'Unassigned';

  return (
    <div
      aria-label={`Project owner: ${label}`}
      className={cn(
        'inline-flex min-w-0 items-center rounded-full border bg-background/80 shadow-sm backdrop-blur-sm',
        compact ? 'gap-1.5 py-0.5 pl-0.5 pr-2' : 'gap-2 py-1 pl-1 pr-3',
        unassigned ? 'border-dashed text-muted-foreground' : 'border-amber-300/70 text-foreground',
        className,
      )}
      title={unassigned ? 'No accountable project owner has been assigned yet' : `Project owner: ${label}`}
    >
      <Avatar className={compact ? 'h-5 w-5' : 'h-7 w-7'}>
        {project.owner?.avatar_url && <AvatarImage src={project.owner.avatar_url} alt={label} />}
        <AvatarFallback className={cn(
          'font-bold',
          compact ? 'text-[8px]' : 'text-[10px]',
          unassigned ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-900',
        )}>
          {unassigned ? <UserRound className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> : getProjectOwnerInitials(project)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        {!compact && <span className="block text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Project owner</span>}
        <span className={cn('block max-w-[150px] truncate font-semibold', compact ? 'text-[11px]' : 'text-xs')}>
          {label}
        </span>
      </span>
    </div>
  );
}
