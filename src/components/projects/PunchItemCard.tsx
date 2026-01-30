import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  Wrench,
  CheckCircle2,
  MoreHorizontal,
  Camera,
  User,
} from 'lucide-react';
import { type PunchItem, useUpdatePunchItem, useCompletePunchItem, useVerifyPunchItem } from '@/hooks/usePunchItems';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PunchItemCardProps {
  item: PunchItem;
}

const statusConfig = {
  open: { label: 'Open', icon: Clock, className: 'border-l-warning' },
  in_progress: { label: 'In Progress', icon: Wrench, className: 'border-l-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'border-l-orange-500' },
  verified: { label: 'Verified', icon: CheckCircle2, className: 'border-l-success' },
};

const priorityConfig = {
  high: { label: 'High', className: 'bg-destructive/10 text-destructive' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
};

export function PunchItemCard({ item }: PunchItemCardProps) {
  const { user } = useAuth();
  const updatePunchItem = useUpdatePunchItem();
  const completePunchItem = useCompletePunchItem();
  const verifyPunchItem = useVerifyPunchItem();
  
  const statusInfo = statusConfig[item.status];
  const priorityInfo = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const StatusIcon = statusInfo.icon;
  
  const handleStartWork = async () => {
    await updatePunchItem.mutateAsync({
      id: item.id,
      status: 'in_progress',
    });
  };
  
  const handleComplete = async () => {
    await completePunchItem.mutateAsync({ id: item.id });
  };
  
  const handleVerify = async () => {
    if (!user) return;
    await verifyPunchItem.mutateAsync({ id: item.id, verifiedBy: user.id });
  };
  
  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card border-l-4",
      statusInfo.className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-medium">{item.description}</p>
          
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
            
            <Badge variant="secondary" className={priorityInfo.className}>
              {priorityInfo.label}
            </Badge>
            
            {item.assigned_to && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assigned</span>
              </div>
            )}
          </div>
          
          {/* Photos */}
          {(item.before_photos?.length > 0 || item.after_photos?.length > 0) && (
            <div className="flex gap-4 mt-3">
              {item.before_photos && item.before_photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Before</p>
                  <div className="flex gap-1">
                    {item.before_photos.slice(0, 2).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Before ${i + 1}`}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ))}
                    {item.before_photos.length > 2 && (
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        +{item.before_photos.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {item.after_photos && item.after_photos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">After</p>
                  <div className="flex gap-1">
                    {item.after_photos.slice(0, 2).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`After ${i + 1}`}
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ))}
                    {item.after_photos.length > 2 && (
                      <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        +{item.after_photos.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(item.created_at), 'MMM d, yyyy')}
            {item.completed_at && (
              <> • Completed {format(new Date(item.completed_at), 'MMM d, yyyy')}</>
            )}
            {item.verified_at && (
              <> • Verified {format(new Date(item.verified_at), 'MMM d, yyyy')}</>
            )}
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.status === 'open' && (
              <DropdownMenuItem onClick={handleStartWork}>
                <Wrench className="h-4 w-4 mr-2" />
                Start Work
              </DropdownMenuItem>
            )}
            
            {item.status === 'in_progress' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Completed
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Punch Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Mark this punch item as completed? It will then require verification.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleComplete}>Complete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {item.status === 'completed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Verify Punch Item</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirm that this punch item has been satisfactorily completed?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleVerify}>Verify</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
