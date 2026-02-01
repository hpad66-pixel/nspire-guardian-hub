import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useWorkOrderActivity, formatActivityAction } from '@/hooks/useWorkOrderActivity';

interface WorkOrderActivityLogProps {
  workOrderId: string;
}

export function WorkOrderActivityLog({ workOrderId }: WorkOrderActivityLogProps) {
  const { data: activities = [], isLoading } = useWorkOrderActivity(workOrderId);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (activities.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No activity recorded yet
      </p>
    );
  }
  
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Activity Log
      </h4>
      <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="shrink-0">
              {format(new Date(activity.created_at), 'MMM d, h:mm a')}
            </span>
            <span>•</span>
            <span>
              <span className="font-medium text-foreground">
                {activity.profile?.full_name || 'System'}
              </span>
              {' '}
              {formatActivityAction(activity.action)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
