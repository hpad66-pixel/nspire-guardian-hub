import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

const DISMISSED_KEY = 'apas_push_banner_dismissed';

export function NotificationPermissionBanner() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
  });

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1'); } catch {}
    setDismissed(true);
  };

  // Only show on supported browsers when not yet asked/subscribed and not dismissed
  if (!isSupported) return null;
  if (permission === 'granted' || isSubscribed) return null;
  if (permission === 'denied') return null;
  if (dismissed) return null;

  return (
    <div className="w-full border-b border-border bg-muted/40 px-4 py-2.5">
      <div className="flex items-center gap-3 max-w-5xl mx-auto">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <p className="flex-1 text-sm text-foreground">
          <span className="font-medium">Enable push notifications</span>
          <span className="text-muted-foreground"> — get instant alerts for work orders, inspections, and mentions.</span>
        </p>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5 shrink-0"
          onClick={subscribe}
          disabled={isLoading}
        >
          <Bell className="h-3 w-3" />
          {isLoading ? 'Enabling…' : 'Enable'}
        </Button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dismiss notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
