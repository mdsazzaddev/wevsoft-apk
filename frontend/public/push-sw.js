/* Wevsoft local/dev push-only service worker.
 * Intentionally does NOT intercept navigations or cache the SPA shell.
 * Used when the production /sw.js is not registered (Vite DEV / localhost).
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Wevsoft', body: event.data.text(), icon: '/icon-192.png' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Wevsoft', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: '/favicon-32.png',
      tag: data.tag || 'wevsoft-notification',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => {
        try {
          return new URL(c.url).pathname === new URL(url, self.location.origin).pathname;
        } catch {
          return c.url === url;
        }
      });
      if (existing && 'focus' in existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
