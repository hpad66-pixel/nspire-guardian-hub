import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWA';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { MOBILE_FLOAT_ABOVE_NAV_CLASS } from '@/lib/mobileShell';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function PWAInstallBanner() {
  const { isInstallable, isIOS, isInstalled, showBanner, install, dismiss } = usePWAInstall();
  const showMobileNav = useIsCompactNav();

  if (isInstalled || !showBanner) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[55] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-4 md:max-w-sm md:p-0',
        // Sit above the bottom nav on phones/tablets; desktop floats in the corner.
        showMobileNav ? MOBILE_FLOAT_ABOVE_NAV_CLASS : 'bottom-0 md:bottom-4',
      )}
      data-testid="pwa-install-banner"
    >
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-lg">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          <img src="/icons/apas-os-192.png" alt="APAS Project Controls" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-foreground">Install APAS Project Controls</p>
          {isIOS ? (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Tap <strong>Share</strong> then <strong>&quot;Add to Home Screen&quot;</strong>.{' '}
              <Link to="/install" className="underline">
                View full guide →
              </Link>
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Add to your home screen for fast, offline access — no app store required.
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!isIOS && isInstallable && (
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void install()}>
                <Download className="h-3 w-3" />
                Install
              </Button>
            )}
            {isIOS && (
              <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                <Link to="/install">How to install</Link>
              </Button>
            )}
          </div>
        </div>
        <button
          onClick={dismiss}
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground inline-flex items-center justify-center"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
