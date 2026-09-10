import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getProjectOwnerInitials,
  getProjectOwnerLabel,
  type ProjectCardRecord,
} from '@/lib/projects/projectCardPresentation';
import { identityColor } from '@/lib/people/identityColor';

export function ProjectOwnerBadge({
  project,
  compact = false,
  prominent = false,
  className,
}: {
  project: ProjectCardRecord;
  compact?: boolean;
  prominent?: boolean;
  className?: string;
}) {
  const label = getProjectOwnerLabel(project);
  const unassigned = label === 'Unassigned';
  const color = identityColor(label);

  return (
    <div
      aria-label={`Project owner: ${label}`}
      className={cn(
        'inline-flex min-w-0 items-center rounded-full border bg-background/80 shadow-sm backdrop-blur-sm',
        compact ? 'gap-1.5 py-0.5 pl-0.5 pr-2' : prominent ? 'gap-2 py-1.5 pl-1.5 pr-3.5' : 'gap-2 py-1 pl-1 pr-3',
        unassigned && 'border-dashed',
        className,
      )}
      style={{
        borderColor: color.border,
        backgroundColor: color.soft,
        color: color.accent,
        boxShadow: prominent ? `0 0 0 1px ${color.border}, 0 5px 18px ${color.glow}` : undefined,
      }}
      title={unassigned ? 'No accountable project owner has been assigned yet' : `Project owner: ${label}`}
    >
      <Avatar className={compact ? 'h-5 w-5' : prominent ? 'h-8 w-8' : 'h-7 w-7'}>
        {project.owner?.avatar_url && <AvatarImage src={project.owner.avatar_url} alt={label} />}
        <AvatarFallback className={cn(
          'font-bold',
          compact ? 'text-[8px]' : 'text-[10px]',
          'border border-current bg-white/70',
        )}>
          {unassigned ? <UserRound className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> : getProjectOwnerInitials(project)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        {!compact && <span className="block text-[8px] font-extrabold uppercase tracking-[0.18em] opacity-70">Project owner</span>}
        <span className={cn('block max-w-[170px] truncate font-extrabold uppercase tracking-[0.08em]', compact ? 'text-[10px]' : prominent ? 'text-xs' : 'text-[11px]')}>
          {label}
        </span>
      </span>
    </div>
  );
}
