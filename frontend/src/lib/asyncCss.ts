/**
 * Pairs with `deferMainCss` in vite.config.ts: the production entry stylesheet is
 * emitted as `<link media="print" data-wev-css>` so it cannot block the first
 * paint (the boot splash). Importing this module (first import in main.tsx)
 * activates it; `cssReady` resolves once it is applied (or after a safety timeout)
 * so React only mounts into a fully styled document.
 * In dev / when no deferred link exists it resolves immediately.
 */

const CSS_READY_TIMEOUT_MS = 6000;

function activate(link: HTMLLinkElement): Promise<void> {
  return new Promise<void>((resolve) => {
    const finish = () => resolve();
    // Already downloaded while it was media="print" -> flipping applies it at once.
    const alreadyLoaded = Boolean(link.sheet);
    if (!alreadyLoaded) {
      link.addEventListener('load', finish, { once: true });
      link.addEventListener('error', finish, { once: true });
    }
    link.media = 'all';
    if (alreadyLoaded) finish();
  });
}

function activateDeferredCss(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[data-wev-css]'),
  );
  if (links.length === 0) return Promise.resolve();
  const all = Promise.all(links.map(activate)).then(() => undefined);
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, CSS_READY_TIMEOUT_MS);
  });
  return Promise.race([all, timeout]);
}

export const cssReady: Promise<void> = activateDeferredCss();
