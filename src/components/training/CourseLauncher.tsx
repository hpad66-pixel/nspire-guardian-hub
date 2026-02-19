import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { generateSSOUrl } from '@/services/learnworlds/learnworldsService';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseLauncherProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export function CourseLauncher({ courseId, courseTitle, onClose }: CourseLauncherProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpened, setMobileOpened] = useState(false);

  useEffect(() => {
    if (!user) return;

    setIsGenerating(true);
    generateSSOUrl(user.id, courseId, window.location.href)
      .then((url) => {
        setSsoUrl(url);
        if (isMobile) {
          // Auto-open on mobile
          const opened = window.open(url, '_blank');
          setMobileOpened(!!opened);
        }
      })
      .catch(() => setError('Failed to generate course link. Please try again.'))
      .finally(() => setIsGenerating(false));
  }, [user, courseId, isMobile]);

  // ── Mobile confirmation screen ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg space-y-4 text-center">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing your course…</p>
            </div>
          ) : error ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Opening in a new tab</h3>
                <p className="mt-1 text-sm text-muted-foreground">{courseTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Complete the course there and your progress will sync automatically.
              </p>
              <div className="space-y-2">
                {!mobileOpened && ssoUrl && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      const w = window.open(ssoUrl, '_blank');
                      setMobileOpened(!!w);
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Course
                  </Button>
                )}
                <Button variant="outline" onClick={onClose} className="w-full">Done</Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop iframe modal ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-[#0f0f0f] px-4 py-2.5 border-b border-white/10 flex-shrink-0">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">APAS OS</span>
        <span className="text-sm font-medium text-white truncate max-w-md">{courseTitle}</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-7 w-7 rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close course"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Iframe area */}
      <div className="relative flex-1 overflow-hidden">
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-white/50">Preparing your course…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#111]">
            <p className="text-sm text-red-400">{error}</p>
            {ssoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(ssoUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in new tab instead
              </Button>
            )}
          </div>
        )}

        {ssoUrl && !error && (
          <>
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <iframe
              src={ssoUrl}
              className={cn('w-full h-full border-0', iframeLoading && 'opacity-0')}
              title={courseTitle}
              allow="fullscreen; autoplay; camera; microphone"
              onLoad={() => setIframeLoading(false)}
              onError={() => setError('Course couldn\'t load in-app.')}
            />
          </>
        )}
      </div>
    </div>
  );
}
