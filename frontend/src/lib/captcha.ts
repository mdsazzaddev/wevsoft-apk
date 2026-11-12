/**
 * Bot captcha client — Cloudflare Turnstile (preferred) or Google reCAPTCHA v3.
 *
 * Site key comes from `GET /api/auth/captcha` (never baked into the bundle).
 * Guard stays off until the server has both site + secret keys.
 */

import { apiUrl, getMediaApiOrigin } from './apiBase';

export type CaptchaProvider = 'turnstile' | 'recaptcha';

export type CaptchaConfig = {
  enabled: boolean;
  siteKey: string;
  provider: CaptchaProvider | null;
};

const RECAPTCHA_SCRIPT = 'https://www.google.com/recaptcha/api.js?render=explicit';
const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_TIMEOUT_MS = 8000;
const TOKEN_TIMEOUT_MS = 8000;

/** www/Pages has no /api proxy — resolve to api.wevsoft.com when needed. */
function captchaConfigUrl(): string {
  const viaBase = apiUrl('/api/auth/captcha');
  if (/^https?:\/\//i.test(viaBase)) return viaBase;
  const origin = getMediaApiOrigin();
  if (origin) return `${origin.replace(/\/$/, '')}/api/auth/captcha`;
  return '/api/auth/captcha';
}

let configPromise: Promise<CaptchaConfig> | null = null;
let recaptchaScriptPromise: Promise<boolean> | null = null;
let turnstileScriptPromise: Promise<boolean> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export function loadCaptchaConfig(): Promise<CaptchaConfig> {
  if (configPromise) return configPromise;
  configPromise = withTimeout(
    fetch(captchaConfigUrl(), { credentials: 'omit' })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          return { enabled: false, siteKey: '', provider: null };
        }
        const data = (await res.json()) as Partial<CaptchaConfig> | null;
        const siteKey = typeof data?.siteKey === 'string' ? data.siteKey.trim() : '';
        const provider =
          data?.provider === 'turnstile' || data?.provider === 'recaptcha' ? data.provider : null;
        const enabled = data?.enabled === true && siteKey.length > 0 && !!provider;
        return { enabled, siteKey, provider: enabled ? provider : null };
      })
      .catch(() => ({ enabled: false, siteKey: '', provider: null })),
    SCRIPT_TIMEOUT_MS,
    { enabled: false, siteKey: '', provider: null },
  );
  return configPromise;
}

function loadRecaptchaScript(): Promise<boolean> {
  if (recaptchaScriptPromise) return recaptchaScriptPromise;
  recaptchaScriptPromise = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return resolve(false);
    const existing = (window as { grecaptcha?: { execute?: unknown } }).grecaptcha;
    if (existing && typeof existing.execute === 'function') return resolve(true);

    const script = document.createElement('script');
    script.src = RECAPTCHA_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return withTimeout(recaptchaScriptPromise, SCRIPT_TIMEOUT_MS, false);
}

/** Load Turnstile api.js once (explicit render). */
export function loadTurnstileScript(): Promise<boolean> {
  if (turnstileScriptPromise) return turnstileScriptPromise;
  turnstileScriptPromise = new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return resolve(false);
    const w = window as { turnstile?: { render?: unknown } };
    if (w.turnstile && typeof w.turnstile.render === 'function') return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SCRIPT.split('?')[0]}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return withTimeout(turnstileScriptPromise, SCRIPT_TIMEOUT_MS, false);
}

/**
 * Invisible reCAPTCHA v3 token. For Turnstile, use `<TurnstileWidget />` instead —
 * this returns null when the active provider is Turnstile.
 */
export async function getCaptchaToken(action: string): Promise<string | null> {
  try {
    const config = await loadCaptchaConfig();
    if (!config.enabled || config.provider !== 'recaptcha') return null;

    const loaded = await loadRecaptchaScript();
    if (!loaded) return null;

    const grecaptcha = (
      window as {
        grecaptcha?: {
          ready?: (cb: () => void) => void;
          execute: (siteKey: string, opts: { action: string }) => Promise<string>;
        };
      }
    ).grecaptcha;
    if (!grecaptcha?.execute) return null;

    const ready = new Promise<void>((resolve) => {
      if (typeof grecaptcha.ready !== 'function') return resolve();
      grecaptcha.ready(() => resolve());
    });
    await withTimeout(ready, SCRIPT_TIMEOUT_MS, undefined);

    const token = await withTimeout(grecaptcha.execute(config.siteKey, { action }), TOKEN_TIMEOUT_MS, '');
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Body field name the API accepts for either provider. */
export function captchaBodyField(provider: CaptchaProvider | null | undefined): 'turnstileToken' | 'recaptchaToken' {
  return provider === 'turnstile' ? 'turnstileToken' : 'recaptchaToken';
}

export function resetCaptchaCache(): void {
  configPromise = null;
  recaptchaScriptPromise = null;
  turnstileScriptPromise = null;
}

/** @deprecated use loadCaptchaConfig / getCaptchaToken from captcha.ts */
export { loadCaptchaConfig as loadRecaptchaConfig };
