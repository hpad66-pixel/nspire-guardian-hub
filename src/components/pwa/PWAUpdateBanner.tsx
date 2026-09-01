import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWA';

export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-3 bg-primary px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] text-primary-foreground shadow-md">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span className="truncate font-medium">APAS Project Controls has been updated.</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 min-h-[36px] shrink-0 text-xs"
        onClick={updateServiceWorker}
      >
        Reload now
      </Button>
    </div>
  );
}
