import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionProgressProps {
  current: number;
  total: number;
  okCount: number;
  attentionCount: number;
  defectCount: number;
  className?: string;
}

export function InspectionProgress({
  current,
  total,
  okCount,
  attentionCount,
  defectCount,
  className,
}: InspectionProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  const checkedCount = okCount + attentionCount + defectCount;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {current} of {total} assets
        </span>
        <span className="text-muted-foreground">
          {Math.round(progress)}% complete
        </span>
      </div>
      
      <Progress value={progress} className="h-3" />
      
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">{okCount}</span>
          <span className="text-muted-foreground">OK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">{attentionCount}</span>
          <span className="text-muted-foreground">Attention</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="font-medium">{defectCount}</span>
          <span className="text-muted-foreground">Defect</span>
        </div>
      </div>
    </div>
  );
}
