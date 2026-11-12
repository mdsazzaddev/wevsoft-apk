/** Mobile perf class on <html> — keep desktop glass/smooth scroll intact. */

export const MOBILE_PERF_CLASS = 'wev-mobile-perf';
export const MOBILE_PERF_MQ = '(max-width: 767px)';

export function applyMobilePerfClass(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(MOBILE_PERF_CLASS, enabled);
}

/** Subscribe to the phone breakpoint and toggle wev-mobile-perf. Returns cleanup. */
export function bootstrapMobilePerf(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }
  const mq = window.matchMedia(MOBILE_PERF_MQ);
  const sync = () => applyMobilePerfClass(mq.matches);
  sync();
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }
  // Safari < 14
  mq.addListener(sync);
  return () => mq.removeListener(sync);
}
