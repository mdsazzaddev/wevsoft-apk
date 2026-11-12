import { useEffect, useId, useRef } from 'react';
import { loadCaptchaConfig, loadTurnstileScript } from '../../lib/captcha';

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action?: string;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'flexible' | 'compact';
      appearance?: 'always' | 'execute' | 'interaction-only';
      callback?: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      'timeout-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

export type TurnstileWidgetProps = {
  /** Must match server `requireBotCaptcha(action)` */
  action: string;
  onToken: (token: string | null) => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  /** Force remount (e.g. after submit clears the token). */
  remountKey?: number | string;
};

function resolveTheme(explicit?: 'light' | 'dark' | 'auto'): 'light' | 'dark' | 'auto' {
  if (explicit && explicit !== 'auto') return explicit;
  if (typeof document === 'undefined') return 'auto';
  const root = document.documentElement;
  if (root.classList.contains('dark') || root.dataset.theme === 'dark' || root.dataset.theme === 'oled') {
    return 'dark';
  }
  if (root.classList.contains('light') || root.dataset.theme === 'light') return 'light';
  return 'auto';
}

/**
 * Managed Cloudflare Turnstile widget. Renders only when the server has
 * Turnstile keys armed (`GET /api/auth/captcha` → provider turnstile).
 * Uses `appearance: always` so the CF checkbox/checkmark stays visible.
 */
export function TurnstileWidget({
  action,
  onToken,
  className,
  theme = 'auto',
  remountKey = 0,
}: TurnstileWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const reactId = useId();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const config = await loadCaptchaConfig();
      if (cancelled || !config.enabled || config.provider !== 'turnstile' || !hostRef.current) {
        onTokenRef.current(null);
        return;
      }

      const ok = await loadTurnstileScript();
      if (cancelled || !ok || !hostRef.current) {
        onTokenRef.current(null);
        return;
      }

      const turnstile = (window as { turnstile?: TurnstileApi }).turnstile;
      if (!turnstile?.render) {
        onTokenRef.current(null);
        return;
      }

      if (widgetIdRef.current) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }

      hostRef.current.innerHTML = '';
      const id = turnstile.render(hostRef.current, {
        sitekey: config.siteKey,
        action,
        theme: resolveTheme(theme),
        size: 'flexible',
        // Always show the widget so local + production users can see the CF check.
        // (interaction-only hid the checkbox and looked like "verification missing".)
        appearance: 'always',
        callback: (token) => onTokenRef.current(token || null),
        'error-callback': () => onTokenRef.current(null),
        'expired-callback': () => onTokenRef.current(null),
        'timeout-callback': () => onTokenRef.current(null),
      });
      widgetIdRef.current = id;
    })();

    return () => {
      cancelled = true;
      const turnstile = (window as { turnstile?: TurnstileApi }).turnstile;
      if (widgetIdRef.current && turnstile?.remove) {
        try {
          turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null;
    };
  }, [action, theme, reactId, remountKey]);

  return (
    <div
      className={className}
      data-testid={`turnstile-${action}`}
      ref={hostRef}
      aria-label="Bot verification"
    />
  );
}
