import { useEffect } from 'react';
import { useStore } from '../store';
import {
  applyDisplayModeToDocument,
  resolveStatusBarMode,
  statusBarColorForMode,
} from '../lib/statusBarTheme';

/**
 * Keeps Android/iOS system status-bar chrome in sync with Display mode.
 * theme-color alone is unreliable on some WebAPK shells — re-apply on
 * visibility / pageshow / focus / theme change.
 *
 * The fixed strip only covers env(safe-area-inset-top) (or a small standalone
 * fallback). It is not a fake in-page status bar on desktop.
 */
export default function StatusBarChrome() {
  const theme = useStore((s) => s.theme);
  const mode = resolveStatusBarMode(theme);
  const color = statusBarColorForMode(mode);

  useEffect(() => {
    applyDisplayModeToDocument(theme);
    const sync = () => applyDisplayModeToDocument(theme);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    // Chrome Android sometimes restores a white bar after orientation change.
    window.addEventListener('orientationchange', sync);

    // No fixed fallback height: in an installed Android PWA the OS draws its own
    // status bar ABOVE the page, so env(safe-area-inset-top) is 0 and a forced 24px
    // strip only added an empty band under the notch. iOS (black-translucent) still
    // gets the real inset from env().
    document.documentElement.style.setProperty('--wev-status-bar-fallback', '0px');

    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, [theme]);

  return (
    <div
      aria-hidden
      data-wev-status-bar-chrome
      className="pointer-events-none fixed inset-x-0 top-0 z-[9998] md:hidden"
      style={{
        height: 'max(env(safe-area-inset-top, 0px), var(--wev-status-bar-fallback, 0px))',
        backgroundColor: color,
      }}
    />
  );
}
