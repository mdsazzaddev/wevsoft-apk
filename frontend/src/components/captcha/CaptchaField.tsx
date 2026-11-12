import { useEffect, useRef, useState } from 'react';
import { loadCaptchaConfig, type CaptchaProvider } from '../../lib/captcha';
import { TurnstileWidget } from './TurnstileWidget';

export type CaptchaFieldProps = {
  action: string;
  token: string | null;
  onToken: (token: string | null) => void;
  className?: string;
};

type Phase = 'idle' | 'challenge' | 'verified';

/** How long the verified checkmark stays visible before the field auto-hides. */
const VERIFIED_HIDE_DELAY_MS = 1200;

/**
 * Visible Cloudflare Turnstile field (`appearance: always`).
 * Parent clearing `token` remounts for a fresh single-use token (or server
 * `wev_cf_ok` pass cookie covers wrong-password retries).
 */
export function CaptchaField({ action, token, onToken, className }: CaptchaFieldProps) {
  const [provider, setProvider] = useState<CaptchaProvider | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [remountKey, setRemountKey] = useState(0);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const prevTokenRef = useRef<string | null>(token);
  const [collapsed, setCollapsed] = useState(false);
  const verified = phase === 'verified' && !!token;

  // Once verified, let the CF checkmark show briefly, then fold the field away.
  // The widget stays mounted (just collapsed) so the token and its expiry callbacks keep working.
  useEffect(() => {
    if (!verified) {
      setCollapsed(false);
      return;
    }
    const t = window.setTimeout(() => setCollapsed(true), VERIFIED_HIDE_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [verified]);

  useEffect(() => {
    let alive = true;
    void loadCaptchaConfig().then((cfg) => {
      if (!alive) return;
      if (cfg.enabled && cfg.provider === 'turnstile') {
        setProvider('turnstile');
        setPhase((p) => (p === 'verified' && token ? 'verified' : 'challenge'));
      } else {
        setProvider(cfg.enabled ? cfg.provider : null);
        setPhase('idle');
        onTokenRef.current(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [action, token]);

  // After a submit the parent clears the token — remount for a new challenge.
  useEffect(() => {
    const prev = prevTokenRef.current;
    prevTokenRef.current = token;
    if (prev && !token && phase === 'verified') {
      setPhase('challenge');
      setRemountKey((k) => k + 1);
    }
  }, [token, phase]);

  const handleToken = (next: string | null) => {
    onToken(next);
    if (next) setPhase('verified');
    else if (phase === 'verified') {
      setPhase('challenge');
      setRemountKey((k) => k + 1);
    }
  };

  if (provider !== 'turnstile') return null;

  // Keep the real Turnstile host mounted after success so the CF checkmark stays visible.
  return (
    <div
      className={className ?? 'my-2 flex min-h-[65px] justify-center'}
      style={{
        transition: 'max-height 300ms ease, opacity 300ms ease, margin 300ms ease',
        ...(collapsed
          ? { maxHeight: 0, minHeight: 0, marginTop: 0, marginBottom: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' as const }
          : { maxHeight: 200 }),
      }}
      data-testid={
        phase === 'verified' && token
          ? `turnstile-${action}-verified`
          : `turnstile-${action}-shell`
      }
      role="status"
      aria-live="polite"
      aria-label={phase === 'verified' && token ? 'Bot verification complete' : 'Bot verification'}
    >
      <TurnstileWidget
        action={action}
        onToken={handleToken}
        remountKey={remountKey}
        className="w-full max-w-[320px] [&_iframe]:!max-w-full"
      />
    </div>
  );
}

/** Attach captcha token to a JSON body under the right key. */
export async function withCaptchaBody<T extends Record<string, unknown>>(
  body: T,
  opts: { action: string; turnstileToken?: string | null },
): Promise<T & { turnstileToken?: string; recaptchaToken?: string }> {
  const cfg = await loadCaptchaConfig();
  if (!cfg.enabled) return body;

  if (cfg.provider === 'turnstile') {
    const t = (opts.turnstileToken || '').trim();
    return t ? { ...body, turnstileToken: t } : body;
  }

  const { getCaptchaToken } = await import('../../lib/captcha');
  const recaptchaToken = await getCaptchaToken(opts.action);
  return recaptchaToken ? { ...body, recaptchaToken } : body;
}
