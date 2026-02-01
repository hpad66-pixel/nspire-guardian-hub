import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  ExternalLink,
  Clock,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import type { TrainingResource } from '@/hooks/useTrainingResources';
import type { TrainingProgress } from '@/hooks/useTrainingProgress';
import { cn } from '@/lib/utils';

interface TrainingResourceCardProps {
  resource: TrainingResource;
  progress?: TrainingProgress | null;
  onStart?: () => void;
  onView?: () => void;
}

const RESOURCE_ICONS = {
  course: GraduationCap,
  ebook: BookOpen,
  video: Video,
  guide: FileText,
  document: FileText,
};

const CATEGORY_COLORS = {
  onboarding: 'bg-blue-500',
  maintenance: 'bg-orange-500',
  safety: 'bg-red-500',
  compliance: 'bg-purple-500',
  operations: 'bg-green-500',
  emergency: 'bg-rose-500',
};

const CATEGORY_LABELS = {
  onboarding: 'Onboarding',
  maintenance: 'Maintenance',
  safety: 'Safety',
  compliance: 'Compliance',
  operations: 'Operations',
  emergency: 'Emergency',
};

export function TrainingResourceCard({
  resource,
  progress,
  onStart,
  onView,
}: TrainingResourceCardProps) {
  const Icon = RESOURCE_ICONS[resource.resource_type] || FileText;
  const status = progress?.status || 'not_started';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  return (
    <Card className={cn(
      'transition-all hover:shadow-md group',
      isCompleted && 'border-green-200 dark:border-green-900'
    )}>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                'text-xs text-white',
                CATEGORY_COLORS[resource.category]
              )}
            >
              {CATEGORY_LABELS[resource.category]}
            </Badge>
            {resource.is_required && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          {isCompleted && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {resource.title}
            </h3>
            {resource.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {resource.description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {resource.duration_minutes && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{resource.duration_minutes} min</span>
          </div>
        )}

        {isInProgress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">In Progress</span>
            </div>
            <Progress value={50} className="h-1.5" />
          </div>
        )}

        <Button
          variant={isCompleted ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={resource.resource_type === 'ebook' ? onView : onStart}
        >
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Review
            </>
          ) : isInProgress ? (
            <>
              <PlayCircle className="h-4 w-4 mr-1" />
              Continue
            </>
          ) : resource.external_url ? (
            <>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Course
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4 mr-1" />
              Start
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
