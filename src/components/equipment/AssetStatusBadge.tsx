import { cn } from '@/lib/utils';
import { CheckCircle2, ArrowUpRight, Wrench, Archive } from 'lucide-react';

interface AssetStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

const config: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  available: {
    label: 'Available',
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  checked_out: {
    label: 'Checked Out',
    icon: <ArrowUpRight className="h-3 w-3" />,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  in_maintenance: {
    label: 'In Maintenance',
    icon: <Wrench className="h-3 w-3" />,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  retired: {
    label: 'Retired',
    icon: <Archive className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function AssetStatusBadge({ status, size = 'md', className }: AssetStatusBadgeProps) {
  const c = config[status] ?? config.available;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      c.className,
      className
    )}>
      {c.icon}
      {c.label}
    </span>
  );
}

interface ComplianceDotProps {
  status: string;
  className?: string;
}

export function ComplianceDot({ status, className }: ComplianceDotProps) {
  if (status === 'no_docs') return null;

  const colors: Record<string, string> = {
    current: 'bg-emerald-500',
    expiring_soon: 'bg-amber-400',
    expired: 'bg-red-500',
  };

  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full flex-shrink-0',
        colors[status] ?? 'bg-muted-foreground',
        className
      )}
    />
  );
}
