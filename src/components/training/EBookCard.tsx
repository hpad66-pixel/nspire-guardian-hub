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

  const embedValue = ebook.embed_code || '';
  const isHtmlEmbed = embedValue.includes('<iframe') || embedValue.includes('<embed');
  
  // Extract src from iframe if it's HTML embed code
  const getIframeSrc = (html: string): string | null => {
    const match = html.match(/src=["']([^"']+)["']/);
    return match ? match[1] : null;
  };

  const embedUrl = isHtmlEmbed ? getIframeSrc(embedValue) : embedValue;
  
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
        <DialogContent 
          className="max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden border-0"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Compact Header */}
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between bg-background">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-semibold text-base">{ebook.title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(embedUrl || '', '_blank')}
              className="mr-8"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in New Tab
            </Button>
          </div>
          
          {/* Fullscreen Iframe Container */}
          <div className="relative flex-1 bg-muted/20" style={{ minHeight: 0 }}>
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
