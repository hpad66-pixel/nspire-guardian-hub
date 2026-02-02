import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Maximize2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EBookViewerProps {
  embedUrl: string;
  title: string;
  description?: string;
}

export function EBookViewer({ embedUrl, title, description }: EBookViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Fullscreen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(embedUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full aspect-[4/3] bg-muted">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              title={title}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent 
          className="max-w-[95vw] w-full h-[90vh] p-0 overflow-hidden border-0"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between bg-background">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="font-semibold">{title}</span>
            </div>
          </div>
          <div className="relative flex-1" style={{ minHeight: 0 }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0"
              allowFullScreen
              title={title}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
