import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourseProgressRing } from './CourseProgressRing';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TrainingCourse } from '@/hooks/useTrainingCourses';
import type { CourseProgress } from '@/hooks/useCourseProgress';
import { getCourseContentUrl } from '@/hooks/useTrainingCourses';
import { useCompleteCourse, useUpdateCourseProgress } from '@/hooks/useCourseProgress';

interface CoursePlayerProps {
  course: TrainingCourse;
  progress: CourseProgress | null;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CoursePlayer({
  course,
  progress,
  open,
  onClose,
  onComplete,
}: CoursePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const completeCourse = useCompleteCourse();
  const updateProgress = useUpdateCourseProgress();

  const courseUrl = getCourseContentUrl(course);
  const currentProgress = progress?.progress_percent || 0;

  // Handle fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setShowExitDialog(true);
      }
    };
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Prevent body scroll when player is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleMarkComplete = async () => {
    try {
      await completeCourse.mutateAsync({ courseId: course.id });
      setShowCompleteDialog(false);
      onComplete();
    } catch (error) {
      console.error('Failed to mark complete:', error);
    }
  };

  const handleClose = () => {
    // Save progress on close
    if (progress?.status === 'in_progress') {
      updateProgress.mutate({
        courseId: course.id,
        progress_percent: currentProgress,
      });
    }
    onClose();
  };

  const handleExitConfirm = () => {
    setShowExitDialog(false);
    handleClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black"
      >
        {/* Header Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'absolute top-0 left-0 right-0 z-10',
            'bg-gradient-to-b from-black/80 to-transparent',
            'p-4 flex items-center justify-between'
          )}
        >
          {/* Course Info */}
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold text-lg">{course.title}</h2>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Progress Ring */}
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-1">
              <CourseProgressRing progress={currentProgress} size="sm" />
            </div>

            {/* Mark Complete Button */}
            {progress?.status !== 'completed' && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => setShowCompleteDialog(true)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setShowExitDialog(true)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Course Content (iframe) */}
        <div className="absolute inset-0 pt-16 bg-white">
          <iframe
            ref={iframeRef}
            src={courseUrl}
            className="w-full h-full border-0 bg-white"
            title={course.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
          />
        </div>

        {/* Complete Confirmation Dialog */}
        <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Complete this course?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you've finished all the course content? This will mark the
                course as completed and you'll receive your certificate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not Yet</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMarkComplete}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Course
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Exit course?</AlertDialogTitle>
              <AlertDialogDescription>
                Your progress will be saved and you can continue later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Course</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>
                Exit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AnimatePresence>
  );
}
