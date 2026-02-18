import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWA';
import { Link } from 'react-router-dom';

export function PWAInstallBanner() {
  const { isInstallable, isIOS, isInstalled, showBanner, install, dismiss } = usePWAInstall();

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card shadow-lg p-3.5">
        <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
          <img src="/icons/apas-os-192.png" alt="APAS OS" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Install APAS OS</p>
          {isIOS ? (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>.{' '}
              <Link to="/install" className="underline">View full guide →</Link>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Add to your home screen for fast, offline access.
            </p>
          )}
          {!isIOS && isInstallable && (
            <Button
              size="sm"
              className="mt-2 h-7 text-xs gap-1.5"
              onClick={install}
            >
              <Download className="h-3 w-3" />
              Install
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
