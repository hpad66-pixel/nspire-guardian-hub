import { useState } from 'react';
import { BookOpen, Maximize2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { TrainingResource } from '@/hooks/useTrainingResources';

interface EBookCardProps {
  ebook: TrainingResource;
}

export function EBookCard({ ebook }: EBookCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const embedUrl = ebook.embed_code || '';
  
  return (
    <>
      <div 
        className={cn(
          "group relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10",
          "border border-border/50 hover:border-primary/30 transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/5"
        )}
      >
        {/* Thumbnail/Preview Area */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {ebook.thumbnail_url ? (
            <img 
              src={ebook.thumbnail_url} 
              alt={ebook.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-6 rounded-full bg-primary/10">
                <BookOpen className="h-12 w-12 text-primary/60" />
              </div>
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Read Now
            </Button>
          </div>
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
          {ebook.duration_minutes && (
            <p className="text-xs text-muted-foreground">
              ~{ebook.duration_minutes} min read
            </p>
          )}
        </div>
      </div>

      {/* Fullscreen Reader Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              {ebook.title}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(embedUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </DialogHeader>
          <div className="flex-1 bg-muted/30 min-h-0">
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              title={ebook.title}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
