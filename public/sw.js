// Custom service worker for APAS OS
// Handles: push notifications + standard precache passthrough

// This file is used as the custom SW entry for vite-plugin-pwa injectManifest mode.
// It must self.skipWaiting() and claim clients for immediate activation.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Push notification handler ---
self.addEventListener('push', (event) => {
  let data = { title: 'APAS OS', body: 'You have a new notification.', url: '/dashboard', icon: '/icons/apas-os-192.png' };

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

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// --- Notification click: focus or open app ---
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
