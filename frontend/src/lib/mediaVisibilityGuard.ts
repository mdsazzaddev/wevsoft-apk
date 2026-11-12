/**
 * Pause exclusive / feed autoplay when the tab is hidden.
 * Saves battery and avoids background decode on mobile.
 */
import { pauseExclusivePlayback } from './exclusiveMediaPlayback';
import { suspendVisibleMediaPlayback } from './visibleMediaPlayback';

let installed = false;

export function installMediaVisibilityGuard(): void {
  if (typeof document === 'undefined' || installed) return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    pauseExclusivePlayback();
    suspendVisibleMediaPlayback();
  });
}
