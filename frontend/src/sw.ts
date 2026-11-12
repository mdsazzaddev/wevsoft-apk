/// <reference lib="webworker" />
/**
 * Wevsoft service worker (injectManifest via vite-plugin-pwa).
 *
 * Goals: installability + push on production HTTPS.
 * Never keep a usable offline SPA shell — that made LAN/preview look "alive"
 * after terminals were stopped (ghost WevSpace / Home).
 * - Hashed build assets are precached (content-hash = safe CacheFirst).
 * - Navigations are NetworkOnly — no HTML offline fallback.
 * - API, uploads, media, and range requests are never intercepted.
 */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
clientsClaim();

// When this worker REPLACES an older one, tabs still running the previous build lose
// their (non-precached) route chunks the moment `cleanupOutdatedCaches` runs — Pages
// deletes old hashed files on deploy. Those pages would turn blank, so reload them
// onto the new build. Pages where the user may be mid-draft are left alone (they
// self-heal via staleChunkReload on the next failed import).
let replacedPreviousWorker = false;
const KEEP_OPEN_PATHS = [/^\/create/, /^\/story-studio/, /^\/messages/, /^\/studio/, /^\/live/, /^\/watch-party/];

self.addEventListener('install', () => {
  replacedPreviousWorker = Boolean(self.registration.active);
});

self.addEventListener('activate', (event) => {
  if (!replacedPreviousWorker) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) =>
      Promise.all(
        windows.map((client) => {
          try {
            const path = new URL(client.url).pathname;
            if (KEEP_OPEN_PATHS.some((re) => re.test(path))) return undefined;
            return client.navigate(client.url).catch(() => undefined);
          } catch {
            return undefined;
          }
        }),
      ),
    ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const DENY_PREFIXES = ['/api/', '/uploads/', '/media/', '/socket.io/', '/src/', '/@'];

function shouldBypass(url: URL, request: Request): boolean {
  if (request.method !== 'GET') return true;
  if (!url.protocol.startsWith('http')) return true;
  if (request.headers.has('range')) return true;
  if (DENY_PREFIXES.some((p) => url.pathname.startsWith(p))) return true;
  if (url.pathname.includes('node_modules')) return true;
  if (/\.(mp4|webm|mkv|m3u8|ts)$/i.test(url.pathname)) return true;
  return false;
}

registerRoute(
  ({ request, url }) => {
    if (!url.protocol.startsWith('http')) return false;
    if (request.method !== 'GET') return false;
    return (
      request.destination === 'script' ||
      request.destination === 'style' ||
      /^\/assets\/.+\.(js|css)$/i.test(url.pathname)
    );
  },
  new CacheFirst({
    cacheName: 'wevsoft-hashed-chunks',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 250,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) => {
    if (!url.protocol.startsWith('http')) return false;
    if (request.method !== 'GET') return false;
    return (
      request.destination === 'image' ||
      /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(url.pathname)
    );
  },
  new CacheFirst({
    cacheName: 'wevsoft-static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

// HTML documents: network only — do not resurrect the app when the server is down.
registerRoute(
  new NavigationRoute(new NetworkOnly(), {
    denylist: [/^\/api\//, /^\/uploads\//, /^\/media\//, /^\/socket\.io\//],
  }),
);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (shouldBypass(url, request)) return;

  const isManifest =
    url.pathname === '/manifest.json' || url.pathname.endsWith('.webmanifest');
  if (!isManifest) return;

  // Manifest: network only — no stale offline copy.
  event.respondWith(fetch(request));
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  // Notification actions/vibrate are valid in service workers but missing from TS's DOM NotificationOptions typings.
  type SwNotificationAction = { action: string; title: string; icon?: string };
  let data: { title?: string; body?: string; icon?: string; tag?: string; url?: string; actions?: SwNotificationAction[] };
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
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: false,
    } as NotificationOptions & { actions?: SwNotificationAction[]; vibrate?: number[] }),
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
