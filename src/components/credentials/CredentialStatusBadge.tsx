import { cn } from '@/lib/utils';
import { type CredentialStatus } from '@/hooks/useCredentials';

interface CredentialStatusBadgeProps {
  status: CredentialStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<CredentialStatus, { label: string; className: string }> = {
  current: {
    label: 'Current',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  },
  no_expiry: {
    label: 'No Expiry',
    className: 'bg-muted text-muted-foreground border border-border',
  },
};

const SIZE_CLASS = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function CredentialStatusBadge({ status, size = 'md', className }: CredentialStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium leading-none',
        config.className,
        SIZE_CLASS[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}

// Color dot for matrix view
export function CredentialStatusDot({ status }: { status: CredentialStatus | null }) {
  if (!status) {
    return <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" title="Not on file" />;
  }
  const colors: Record<CredentialStatus, string> = {
    current: 'bg-green-500',
    expiring_soon: 'bg-amber-500',
    expired: 'bg-red-500',
    no_expiry: 'bg-muted-foreground/40',
  };
  const labels: Record<CredentialStatus, string> = {
    current: 'Current',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    no_expiry: 'No Expiry Date',
  };
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full', colors[status])}
      title={labels[status]}
    />
  );
}
