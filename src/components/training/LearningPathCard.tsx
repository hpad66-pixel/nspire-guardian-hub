import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningPathCardProps {
  title: string;
  description: string;
  totalModules: number;
  completedModules: number;
  estimatedHours: number;
  isRequired?: boolean;
  onClick?: () => void;
}

export function LearningPathCard({
  title,
  description,
  totalModules,
  completedModules,
  estimatedHours,
  isRequired,
  onClick,
}: LearningPathCardProps) {
  const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
  const isComplete = completedModules === totalModules && totalModules > 0;

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      isComplete && 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base">{title}</CardTitle>
              {isRequired && (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              )}
              {isComplete && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            {totalModules} modules
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            ~{estimatedHours}h
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedModules}/{totalModules}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Button 
          variant={isComplete ? 'outline' : 'default'} 
          className="w-full"
          onClick={onClick}
        >
          {isComplete ? 'Review Path' : 'Continue Learning'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
