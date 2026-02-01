import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickAccessCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  count: number;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function QuickAccessCard({
  icon: Icon,
  title,
  subtitle,
  count,
  color,
  onClick,
  isActive,
}: QuickAccessCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]',
        isActive && 'ring-2 ring-primary shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl',
              color
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            <p className="text-lg font-bold mt-1">{count} modules</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
