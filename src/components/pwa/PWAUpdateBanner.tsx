import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWA';

export function PWAUpdateBanner() {
  const { needRefresh, updateServiceWorker } = usePWAUpdate();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-3 bg-primary text-primary-foreground px-4 py-2.5 shadow-md">
      <div className="flex items-center gap-2 text-sm">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span className="font-medium">APAS OS has been updated.</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs shrink-0"
        onClick={updateServiceWorker}
      >
        Reload now
      </Button>
    </div>
  );
}
