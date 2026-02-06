import { BookOpen, CheckCircle2, Clock, BookMarked } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useProgressStats } from '@/hooks/useTrainingProgress';

interface ProgressStatsCardProps {
  totalResources: number;
}

export function ProgressStatsCard({ totalResources }: ProgressStatsCardProps) {
  const { data: stats, isLoading } = useProgressStats();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const completed = stats?.completed || 0;
  const inProgress = stats?.inProgress || 0;
  const percentage = totalResources > 0 ? Math.round((completed / totalResources) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Your Progress</h3>
            <p className="text-sm text-muted-foreground">
              Track your learning journey
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">{percentage}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        <Progress value={percentage} className="h-2 mb-4" />

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-xl font-semibold">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xl font-semibold">{inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold">{totalResources - completed - inProgress}</p>
            <p className="text-xs text-muted-foreground">Not Started</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
