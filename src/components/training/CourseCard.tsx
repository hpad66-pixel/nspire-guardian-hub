import { motion } from 'framer-motion';
import { Clock, Star, Play, RotateCcw, Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CourseProgressRing } from './CourseProgressRing';
import type { TrainingCourse } from '@/hooks/useTrainingCourses';
import type { CourseProgress } from '@/hooks/useCourseProgress';

interface CourseCardProps {
  course: TrainingCourse;
  progress?: CourseProgress | null;
  onStart: () => void;
  onContinue: () => void;
  onViewCertificate?: () => void;
}

export function CourseCard({
  course,
  progress,
  onStart,
  onContinue,
  onViewCertificate,
}: CourseCardProps) {
  const progressPercent = progress?.progress_percent || 0;
  const status = progress?.status || 'not_started';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const isNotStarted = status === 'not_started' || !progress;

  // Generate a gradient based on category
  const categoryGradients: Record<string, string> = {
    safety: 'from-red-500/80 to-orange-600/80',
    operations: 'from-blue-500/80 to-indigo-600/80',
    nspire: 'from-purple-500/80 to-violet-600/80',
    maintenance: 'from-green-500/80 to-emerald-600/80',
    'customer-service': 'from-pink-500/80 to-rose-600/80',
    leadership: 'from-amber-500/80 to-yellow-600/80',
    onboarding: 'from-teal-500/80 to-cyan-600/80',
    software: 'from-slate-500/80 to-zinc-600/80',
  };

  const gradient = categoryGradients[course.category] || 'from-primary/80 to-primary/60';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-shadow">
        {/* Thumbnail Area */}
        <div className="relative aspect-video overflow-hidden">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className={cn(
              'w-full h-full bg-gradient-to-br flex items-center justify-center',
              gradient
            )}>
              <div className="text-white/90 text-center p-4">
                <div className="text-4xl font-bold mb-1">
                  {course.title.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm opacity-75">{course.category}</div>
              </div>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          {/* Progress Ring */}
          <div className="absolute top-3 right-3">
            <div className="bg-background/90 backdrop-blur-sm rounded-full p-1">
              <CourseProgressRing progress={progressPercent} size="sm" />
            </div>
          </div>
          
          {/* Required Badge */}
          {course.is_required && (
            <Badge 
              variant="destructive" 
              className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-sm"
            >
              <Star className="h-3 w-3 mr-1" />
              Required
            </Badge>
          )}
          
          {/* Status indicator */}
          {isCompleted && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
              <Award className="h-3 w-3" />
              Completed
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            {course.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {course.description}
              </p>
            )}
          </div>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {course.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {course.duration_minutes} min
              </span>
            )}
            <Badge variant="secondary" className="text-xs capitalize">
              {course.category.replace('-', ' ')}
            </Badge>
          </div>
          
          {/* Action Button */}
          <div className="pt-2">
            {isCompleted ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onContinue();
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                {onViewCertificate && (
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCertificate();
                    }}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Certificate
                  </Button>
                )}
              </div>
            ) : isInProgress ? (
              <Button
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onContinue();
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Continue ({progressPercent}%)
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Course
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
