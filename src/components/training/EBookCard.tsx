import { useState } from 'react';
import { BookOpen, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GeneratedBookCover } from './GeneratedBookCover';
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

      {/* Immersive Fullscreen Reader */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent 
          className="max-w-none w-screen h-screen p-0 m-0 rounded-none border-0 bg-black"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Floating Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
            aria-label="Close reader"
          >
            <X className="h-5 w-5" />
          </button>
          
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
