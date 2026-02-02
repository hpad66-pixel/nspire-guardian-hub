import { useState, useEffect } from 'react';
import { BookOpen, Maximize2, X, Check, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GeneratedBookCover } from './GeneratedBookCover';
import { EBookProgressBadge } from './EBookProgressBadge';
import { useResourceProgress, useUpdateProgress } from '@/hooks/useTrainingProgress';
import type { TrainingResource } from '@/hooks/useTrainingResources';

interface EBookCardProps {
  ebook: TrainingResource;
}

export function EBookCard({ ebook }: EBookCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: progress, isLoading: progressLoading } = useResourceProgress(ebook.id);
  const updateProgress = useUpdateProgress();

  const embedValue = ebook.embed_code || '';
  const isHtmlEmbed = embedValue.includes('<iframe') || embedValue.includes('<embed');
  
  // Extract src from iframe if it's HTML embed code
  const getIframeSrc = (html: string): string | null => {
    const match = html.match(/src=["']([^"']+)["']/);
    return match ? match[1] : null;
  };

  const embedUrl = isHtmlEmbed ? getIframeSrc(embedValue) : embedValue;

  // Mark as in_progress when opened
  const handleOpen = () => {
    setIsFullscreen(true);
    if (!progress || progress.status === 'not_started') {
      updateProgress.mutate({ resourceId: ebook.id, status: 'in_progress' });
    }
  };

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateProgress.mutate({ resourceId: ebook.id, status: 'completed' });
  };

  const currentStatus = progress?.status || 'not_started';
  const isCompleted = currentStatus === 'completed';
  
  return (
    <>
      <div 
        className={cn(
          "group relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10",
          "border border-border/50 hover:border-primary/30 transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/5",
          isCompleted && "ring-2 ring-green-500/30"
        )}
      >
        {/* Progress Badge */}
        <EBookProgressBadge status={currentStatus} />

        {/* Thumbnail/Preview Area */}
        <div className="aspect-[3/4] relative overflow-hidden">
          {ebook.thumbnail_url ? (
            <img 
              src={ebook.thumbnail_url} 
              alt={ebook.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <GeneratedBookCover 
              title={ebook.title} 
              category={ebook.category} 
            />
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={handleOpen}
              className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              {currentStatus === 'not_started' ? 'Start Reading' : 'Continue'}
            </Button>
            
            {currentStatus !== 'completed' && currentStatus !== 'not_started' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleMarkComplete}
                disabled={updateProgress.isPending}
                className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </div>

          {/* Completed checkmark */}
          {isCompleted && (
            <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-green-500 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
            {ebook.title}
          </h3>
          {ebook.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ebook.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            {ebook.duration_minutes && (
              <p className="text-xs text-muted-foreground">
                ~{ebook.duration_minutes} min read
              </p>
            )}
            {ebook.is_required && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Immersive Fullscreen Reader */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent 
          className="max-w-none w-screen h-screen p-0 m-0 rounded-none border-0 bg-black"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Floating Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {currentStatus !== 'completed' && (
              <button
                onClick={() => {
                  updateProgress.mutate({ resourceId: ebook.id, status: 'completed' });
                }}
                disabled={updateProgress.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
              >
                <Check className="h-4 w-4" />
                Mark Complete
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
              aria-label="Close reader"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Full-viewport Iframe */}
          <div className="relative flex-1" style={{ minHeight: 0 }}>
            <iframe
              src={embedUrl || ''}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              title={ebook.title}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
