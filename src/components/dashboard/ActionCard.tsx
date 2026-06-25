import { useNavigate } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionTone = 'default' | 'danger' | 'warning' | 'success';

export interface ActionCardData {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Navigate here on click. */
  to?: string;
  /** Custom click handler (takes precedence over `to`). */
  onClick?: () => void;
  /** Optional count surfaced as a badge — the data-driven signal. */
  count?: number;
  tone?: ActionTone;
}

const TONE_ICON: Record<ActionTone, string> = {
  default: 'bg-accent/12 text-accent',
  danger: 'bg-destructive/12 text-destructive',
  warning: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
};

const TONE_BADGE: Record<ActionTone, string> = {
  default: 'bg-accent/15 text-accent',
  danger: 'bg-destructive/15 text-destructive',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

export function ActionCard({ card }: { card: ActionCardData }) {
  const navigate = useNavigate();
  const Icon = card.icon;
  const tone = card.tone ?? 'default';

  const handleClick = () => {
    if (card.onClick) return card.onClick();
    if (card.to) navigate(card.to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group flex items-start gap-3.5 rounded-xl border bg-card p-4 text-left',
        'transition-all duration-200 hover:border-accent/50 hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONE_ICON[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold leading-tight">{card.title}</h3>
          {card.count !== undefined && card.count > 0 && (
            <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-5', TONE_BADGE[tone])}>
              {card.count > 99 ? '99+' : card.count}
            </span>
          )}
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-snug">{card.description}</p>
      </div>
    </button>
  );
}
