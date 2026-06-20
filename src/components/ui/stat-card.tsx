import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'severe' | 'moderate' | 'low' | 'success';
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: 'border-border',
  severe: 'border-l-4 border-l-severity-severe border-border',
  moderate: 'border-l-4 border-l-severity-moderate border-border',
  low: 'border-l-4 border-l-severity-low border-border',
  success: 'border-l-4 border-l-success border-border',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'stat-card rounded-lg border bg-card p-6',
        variantStyles[variant],
        onClick && 'cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/30',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
