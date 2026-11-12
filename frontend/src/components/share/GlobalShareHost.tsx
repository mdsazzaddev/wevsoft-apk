/**
 * Mounted once inside the Router. Renders the Universal Share modal (lazy chunk,
 * loaded on first use) for openShare() calls and for the existing 'wev:share'
 * window event that product pages dispatch.
 */

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { closeShare, getShareState, openShare, subscribeShare } from '../../lib/share/openShare';

const ShareModal = lazy(() => import('../ShareModal'));

export default function GlobalShareHost() {
  const opts = useSyncExternalStore(
    (cb) => subscribeShare(() => cb()),
    getShareState,
    () => null,
  );
  const [loaded, setLoaded] = useState(false);
  // Load the modal chunk on first use and keep it mounted for exit animations.
  if (opts && !loaded) setLoaded(true);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (!d.url) return;
      const type = d.type === 'product' ? 'marketplace' : d.type;
      openShare({ url: d.url, title: d.title, targetType: type, targetId: d.id || null });
    };
    window.addEventListener('wev:share', onEvent);
    return () => window.removeEventListener('wev:share', onEvent);
  }, []);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <ShareModal
        isOpen={Boolean(opts)}
        onClose={closeShare}
        url={opts?.url || '/'}
        title={opts?.title || 'Share'}
        targetType={opts?.targetType}
        targetId={opts?.targetId || null}
        preview={opts?.preview || null}
        allowRepost={opts?.allowRepost}
        overlayZIndex={opts?.zIndex}
      />
    </Suspense>
  );
}
