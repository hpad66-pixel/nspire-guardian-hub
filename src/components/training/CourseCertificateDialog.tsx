import { useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Award, Download, Share2, Printer, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TrainingCourse } from '@/hooks/useTrainingCourses';
import type { CourseProgress } from '@/hooks/useCourseProgress';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';

interface CourseCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: TrainingCourse;
  progress: CourseProgress;
}

export function CourseCertificateDialog({
  open,
  onOpenChange,
  course,
  progress,
}: CourseCertificateDialogProps) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const { data: branding } = useCompanyBranding();
  
  const userProfile = profiles?.find(p => p.user_id === user?.id);
  const userName = userProfile?.full_name || user?.email || 'Learner';
  const completionDate = progress.completed_at
    ? format(new Date(progress.completed_at), 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');

  const companyName = branding?.company_name || 'Glorieta Gardens';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    // For now, just trigger print as PDF
    // In future, could use html2canvas + jspdf for actual PDF
    handlePrint();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Course Certificate</DialogTitle>
        </DialogHeader>

        {/* Certificate Preview */}
        <motion.div
          ref={certificateRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-8 border-4 border-double border-amber-500/50 shadow-xl overflow-hidden print:shadow-none"
        >
          {/* Decorative corners */}
          <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-amber-500/30 rounded-tl-xl" />
          <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-amber-500/30 rounded-tr-xl" />
          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-amber-500/30 rounded-bl-xl" />
          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-amber-500/30 rounded-br-xl" />

          {/* Certificate Content */}
          <div className="relative text-center space-y-6 py-8">
            {/* Award Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
                <Award className="h-16 w-16 text-amber-500 relative" />
              </div>
            </motion.div>

            {/* Title */}
            <div>
              <h2 className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Certificate of Completion
              </h2>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
            </div>

            {/* This certifies */}
            <p className="text-muted-foreground">This is to certify that</p>

            {/* Name */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-serif font-semibold text-foreground"
            >
              {userName}
            </motion.h3>

            {/* Has completed */}
            <p className="text-muted-foreground">has successfully completed</p>

            {/* Course Name */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-2xl font-semibold text-primary">
                {course.title}
              </h4>
              {course.duration_minutes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {course.duration_minutes} minutes of training
                </p>
              )}
            </motion.div>

            {/* Score if available */}
            {progress.score && (
              <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-full">
                <span className="font-semibold">Score: {progress.score}%</span>
              </div>
            )}

            {/* Date */}
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">Completed on</p>
              <p className="font-medium">{completionDate}</p>
            </div>

            {/* Company */}
            <div className="pt-6 border-t border-border/50 mt-8">
              <p className="text-lg font-semibold">{companyName}</p>
              <p className="text-sm text-muted-foreground">Training Academy</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-3 pt-4 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
