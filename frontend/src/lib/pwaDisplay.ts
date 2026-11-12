/**
 * Helpers for detecting an installed Wevsoft PWA window + controlled SW lifecycle.
 * Registration is intentional (main.tsx) — not auto-injected — so LAN/dev never
 * leave a ghost offline shell after terminals are stopped.
 */

/** True when running as an installed standalone / fullscreen PWA window. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia(
    '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)',
  );
  const legacy =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Some Android "Add to Home screen" / TWA shells omit display-mode but set referrer.
  const androidApp =
    typeof document !== 'undefined' &&
    /android/i.test(navigator.userAgent) &&
    document.referrer.startsWith('android-app://');
  return mq.matches || legacy || androidApp;
}

/**
 * Phones (and installed PWAs) need an in-app refresh control — browser chrome
 * refresh is missing in standalone, and display-mode detection is unreliable.
 */
export function needsInAppRefreshChrome(): boolean {
  if (typeof window === 'undefined') return false;
  if (isStandaloneDisplay()) return true;
  // Device screen (not window resize) or a coarse pointer in a narrow viewport.
  return window.matchMedia(
    '(max-device-width: 767px), (max-width: 767px) and (pointer: coarse)',
  ).matches;
}

/** True for public tunnels used for phone preview (ngrok, Cloudflare, localtunnel). */
export function isTunnelHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  const host = (hostname || '').toLowerCase();
  if (!host) return false;
  return (
    host.endsWith('.ngrok-free.dev') ||
    host.endsWith('.ngrok-free.app') ||
    host.endsWith('.ngrok.app') ||
    host.endsWith('.ngrok.io') ||
    host.endsWith('.loca.lt') ||
    host.endsWith('.trycloudflare.com')
  );
}

/**
 * Localhost or RFC1918 / link-local — phone LAN preview & laptop dev.
 * Tunnel hosts are NOT local: they are HTTPS public URLs used to Install App
 * on Android (Chrome requires HTTPS + a real SW on many builds).
 */
export function isLocalOrLanHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  const host = (hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
  if (host.endsWith('.local')) return true;
  // IPv4 private / link-local
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(host)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true;
  return false;
}

/**
 * True only where a SW is useful and safe.
 * - Production build + HTTPS (public domain OR tunnel)
 * - Never on Vite DEV / HTTP LAN — that left a ghost offline SPA after
 *   `preview:lan` / `dev` was killed
 */
export function shouldRegisterServiceWorker(
  opts: {
    prod?: boolean;
    hostname?: string;
    protocol?: string;
    hasServiceWorker?: boolean;
  } = {},
): boolean {
  const prod = opts.prod ?? (typeof import.meta !== 'undefined' ? Boolean(import.meta.env?.PROD) : false);
  const hostname =
    opts.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const protocol =
    opts.protocol ?? (typeof window !== 'undefined' ? window.location.protocol : '');
  const hasSw =
    opts.hasServiceWorker ??
    (typeof navigator !== 'undefined' && 'serviceWorker' in navigator);

  if (!prod) return false;
  if (!hasSw) return false;
  // Never on laptop/phone LAN HTTP preview hosts.
  if (isLocalOrLanHost(hostname)) return false;
  // Production / tunnel installs need a secure context (HTTPS).
  // Tunnels (ngrok, Cloudflare) are HTTPS + public → installable on Android.
  return protocol === 'https:';
}

/** Unregister every SW + wipe Cache Storage for this origin. */
export async function purgeServiceWorkersAndCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const keepPushSw =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY);
    await Promise.all(
      regs.map((r) => {
        const script = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || '';
        // Keep the push-only worker used for local VAPID subscribe testing.
        if (keepPushSw && script.includes('/push-sw.js')) return Promise.resolve(false);
        return r.unregister();
      }),
    );
  } catch {
    /* ignore */
  }
  // Cache Storage often throws net::ERR_CACHE_OPERATION_NOT_SUPPORTED on
  // localhost / LAN HTTP and in embedded Chromium (Cursor browser, some
  // phone WebViews). Unregistering the SW already stops ghost offline shells;
  // do not touch caches on local hosts.
  if (isLocalOrLanHost()) return;
  try {
    if (!('caches' in window) || typeof caches.keys !== 'function') return;
    const keys = await caches.keys();
    await Promise.all(
      keys.map(async (k) => {
        try {
          await caches.delete(k);
        } catch {
          /* ignore per-key failures */
        }
      }),
    );
  } catch {
    /* Cache Storage unavailable — ignore */
  }
}

const SW_CLAIM_RELOAD_KEY = 'wev_sw_claim_reload';

/**
 * Call once at boot (before React). On LAN/dev: always purge leftover SW from
 * an earlier preview build. On production HTTPS (incl. tunnels): register `/sw.js`.
 * After first register, Chrome often needs one reload before the page is
 * controlled — without a controller Android shows only “Create shortcut”.
 */
export async function bootstrapServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!shouldRegisterServiceWorker()) {
    try {
      sessionStorage.removeItem(SW_CLAIM_RELOAD_KEY);
    } catch {
      /* ignore */
    }
    await purgeServiceWorkersAndCaches();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // Activate waiting worker immediately (sw.ts also calls skipWaiting).
    if (reg.waiting) {
      try {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } catch {
        /* ignore */
      }
    }

    // Service worker is registered and ready.
    // In sw.ts, self.skipWaiting() and clientsClaim() immediately activate and claim all clients.
    // We never call window.location.reload() here because doing so causes a disruptive
    // full-page reload on boot that flashes duplicate splash screens.
    try {
      sessionStorage.removeItem(SW_CLAIM_RELOAD_KEY);
    } catch {
      /* ignore */
    }
  } catch {
    /* installability is best-effort */
  }
}
