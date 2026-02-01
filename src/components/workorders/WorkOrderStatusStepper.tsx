import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkOrderStatus = 
  | 'draft'
  | 'pending'
  | 'pending_approval'
  | 'rejected'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'verified'
  | 'closed';

const WORKFLOW_STEPS: { status: WorkOrderStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'pending_approval', label: 'Pending Approval' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
  { status: 'verified', label: 'Verified' },
  { status: 'closed', label: 'Closed' },
];

interface WorkOrderStatusStepperProps {
  currentStatus: string;
  className?: string;
}

export function WorkOrderStatusStepper({ currentStatus, className }: WorkOrderStatusStepperProps) {
  // Map legacy statuses to workflow steps
  const normalizedStatus = (() => {
    if (currentStatus === 'pending' || currentStatus === 'assigned') return 'pending_approval';
    return currentStatus;
  })();
  
  const currentIndex = WORKFLOW_STEPS.findIndex((step) => step.status === normalizedStatus);
  const isRejected = currentStatus === 'rejected';
  
  return (
    <div className={cn('space-y-1', className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        
        return (
          <div
            key={step.status}
            className={cn(
              'flex items-center gap-3 py-1.5 px-2 rounded-md transition-colors',
              isCurrent && 'bg-primary/10',
              isRejected && isCurrent && 'bg-destructive/10'
            )}
          >
            {/* Status icon */}
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : isCurrent ? (
              <div className={cn(
                'h-4 w-4 rounded-full border-2 shrink-0',
                isRejected ? 'border-destructive bg-destructive/20' : 'border-primary bg-primary/20'
              )} />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            
            {/* Label */}
            <span
              className={cn(
                'text-sm',
                isCompleted && 'text-muted-foreground',
                isCurrent && 'font-medium',
                isCurrent && isRejected && 'text-destructive',
                isPending && 'text-muted-foreground/50'
              )}
            >
              {step.label}
              {isCurrent && ' ← Current'}
            </span>
          </div>
        );
      })}
      
      {/* Rejected state */}
      {isRejected && (
        <div className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-destructive/10">
          <div className="h-4 w-4 rounded-full border-2 border-destructive bg-destructive/20 shrink-0" />
          <span className="text-sm font-medium text-destructive">
            Rejected ← Revise & Resubmit
          </span>
        </div>
      )}
    </div>
  );
}
