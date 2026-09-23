import { useState } from 'react';
import { X, Download, Smartphone, MonitorDown, Wifi, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWA';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { MOBILE_FLOAT_ABOVE_NAV_CLASS } from '@/lib/mobileShell';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function PWAInstallBanner() {
  const { isInstallable, isIOS, isInstalled, showBanner, install, dismiss } = usePWAInstall();
  const showMobileNav = useIsCompactNav();
  const [expanded, setExpanded] = useState(false);

  if (isInstalled || !showBanner) return null;

  if (!expanded) {
    return (
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 z-[55] flex justify-end px-3 md:left-auto md:right-4 md:max-w-md md:px-0',
          showMobileNav ? MOBILE_FLOAT_ABOVE_NAV_CLASS : 'bottom-3 md:bottom-4',
        )}
        data-testid="pwa-install-banner"
      >
        <div className="pointer-events-auto flex max-w-[min(100%,26rem)] items-center gap-2 rounded-2xl border border-[rgba(213,170,82,0.38)] bg-[#10151f]/95 p-2 text-white shadow-[0_18px_48px_rgba(16,21,31,0.28)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 text-left transition-colors hover:bg-white/8"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
              <Download className="h-4 w-4 text-[#f2d997]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Install Proj OS</span>
              <span className="block truncate text-[11px] text-white/70">Fast mobile and desktop access</span>
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 text-white/55" />
          </button>
          {!isIOS && isInstallable && (
            <Button size="sm" className="h-10 shrink-0 bg-[#d5aa52] px-3 text-[#10151f] hover:bg-[#f2d997]" onClick={() => void install()}>
              Install
            </Button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed left-0 right-0 z-[55] flex justify-end p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:left-auto md:right-4 md:max-w-[27rem] md:p-0',
        // Sit above the bottom nav on phones/tablets; desktop floats in the corner.
        showMobileNav ? MOBILE_FLOAT_ABOVE_NAV_CLASS : 'bottom-0 md:bottom-4',
      )}
      data-testid="pwa-install-banner"
    >
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[rgba(213,170,82,0.42)] bg-[linear-gradient(135deg,#10151f_0%,#1d2533_52%,#243f68_100%)] text-white shadow-[0_24px_70px_rgba(16,21,31,0.34)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#d5aa52,#f2d997,#71a8cf)]" />
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-inner">
            <img src="/icons/apas-os-192.png" alt="Proj OS" className="h-9 w-9 rounded-xl object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f2d997]">
                Mobile and desktop app
              </span>
            </div>
            <p className="mt-2 text-base font-semibold leading-tight text-white">Install Proj OS for faster field access</p>
            {isIOS ? (
              <p className="mt-1 text-xs leading-relaxed text-white/78">
                Tap <strong>Share</strong> then <strong>&quot;Add to Home Screen&quot;</strong>.{' '}
                <Link to="/install" className="font-semibold text-[#f2d997] underline underline-offset-4">
                  View full guide →
                </Link>
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-white/78">
                Add the app to your phone, tablet, or desktop for one-tap access, camera workflows, and offline-ready project work.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/82">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <Smartphone className="h-3.5 w-3.5 text-[#71a8cf]" />
                iPhone and Android
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <MonitorDown className="h-3.5 w-3.5 text-[#f2d997]" />
                Desktop app
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <Wifi className="h-3.5 w-3.5 text-[#d5aa52]" />
                Offline ready
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!isIOS && isInstallable ? (
                <Button size="sm" className="h-9 gap-1.5 bg-[#d5aa52] text-[#10151f] hover:bg-[#f2d997]" onClick={() => void install()}>
                  <Download className="h-3 w-3" />
                  Install app
                </Button>
              ) : !isIOS ? (
                <Button size="sm" className="h-9 bg-[#d5aa52] text-[#10151f] hover:bg-[#f2d997]" asChild>
                  <Link to="/install">How to install</Link>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" className="h-9 border-white/25 bg-white/8 text-white hover:bg-white/14 hover:text-white" asChild>
                <Link to="/install">{isIOS ? 'iPhone steps' : 'Mobile steps'}</Link>
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-white/72 hover:bg-white/10 hover:text-white" onClick={dismiss}>
                Not now
              </Button>
            </div>
            {!isInstallable && !isIOS && (
              <p className="mt-2 text-[11px] leading-snug text-white/58">
                If your browser hides the install button, the guide shows the menu path.
              </p>
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-white/72 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Collapse install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
