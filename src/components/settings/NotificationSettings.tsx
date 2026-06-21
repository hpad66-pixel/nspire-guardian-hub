import { Bell, BellRing } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Per-device push-notification toggle. Re-accessible home for enabling /
 * disabling push after the one-time banner has been dismissed. Subscription
 * state lives on the browser/SW, so this reflects (and controls) THIS device.
 */
export function NotificationSettings() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant alerts on this device for work orders, inspections, mentions, and approvals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            This browser or device doesn&apos;t support push notifications. On iPhone or iPad, install the app to your
            Home Screen (Share → Add to Home Screen) and open it from there first.
          </p>
        ) : permission === 'denied' ? (
          <div className="rounded-lg border border-[var(--apas-amber)]/40 bg-[var(--apas-amber)]/5 px-4 py-3 text-sm">
            <p className="font-medium">Notifications are blocked for this site.</p>
            <p className="text-muted-foreground mt-0.5">
              Click the lock icon in your browser&apos;s address bar → <span className="font-medium">Notifications → Allow</span>,
              then reload this page to turn them on.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Push notifications on this device</p>
                <p className="text-xs text-muted-foreground">
                  {isLoading
                    ? 'Updating…'
                    : isSubscribed
                      ? "You're subscribed — alerts will arrive on this device."
                      : 'Off — turn on to receive alerts here.'}
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              disabled={isLoading}
              onCheckedChange={(checked) => { if (checked) { subscribe(); } else { unsubscribe(); } }}
              aria-label="Toggle push notifications"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Subscription is per device and browser — enable it on each device where you want alerts.
        </p>
      </CardContent>
    </Card>
  );
}
