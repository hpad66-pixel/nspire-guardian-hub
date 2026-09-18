// Web-push handlers, imported into the generated workbox service worker via
// VitePWA workbox.importScripts. The SW lifecycle (install/activate/precache/
// SKIP_WAITING) is owned by the generated worker — this file ONLY adds the
// push display + click behavior. Payload shape must match the
// send-push-notification edge function: { title, body, url, icon }.

self.addEventListener('push', (event) => {
  let data = { title: 'Proj OS', body: 'You have a new notification.', url: '/dashboard', icon: '/icons/apas-os-192.png' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/apas-os-192.png',
    badge: '/icons/apas-os-192.png',
    data: { url: data.url || '/dashboard' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
