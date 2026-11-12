import { useLayoutEffect, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  readMainScrollTop,
  readRouteScroll,
  saveRouteScroll,
  scrollRouteKey,
  writeMainScrollTop,
} from '../../lib/appNavigation';

/**
 * Manual scroll restoration for `#main-scroll-area` so Back restores the
 * previous page, while new navigations start at the top.
 *
 * Home stays mounted but `display:none` when leaving — that collapses scroll
 * height before this effect runs, so we also persist scroll live on scroll.
 */
export function AppNavigationManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevRef = useRef(location);

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Persist while scrolling so leave-route save still has a good value after
  // keep-alive Home collapses (display:none → scrollTop clamps to 0).
  useEffect(() => {
    const el = document.getElementById('main-scroll-area');
    if (!el) return;
    const key = scrollRouteKey(location.pathname, location.search);
    const persist = () => saveRouteScroll(key, el.scrollTop);
    persist();
    el.addEventListener('scroll', persist, { passive: true });
    return () => el.removeEventListener('scroll', persist);
  }, [location.pathname, location.search]);

  useLayoutEffect(() => {
    const prev = prevRef.current;
    const prevKey = scrollRouteKey(prev.pathname, prev.search);
    const nextKey = scrollRouteKey(location.pathname, location.search);
    const sameRoute = prevKey === nextKey;

    if (!sameRoute) {
      const live = readMainScrollTop();
      const existing = readRouteScroll(prevKey);
      // Don't clobber a real saved offset with a post-collapse 0.
      if (live > 0 || existing == null) {
        saveRouteScroll(prevKey, live);
      }
    }
    prevRef.current = location;
    if (sameRoute) return;

    const y = navType === 'POP' ? (readRouteScroll(nextKey) ?? 0) : 0;
    const apply = () => writeMainScrollTop(y);
    apply();
    const frame = requestAnimationFrame(apply);
    const t1 = window.setTimeout(apply, 40);
    const t2 = navType === 'POP' ? window.setTimeout(apply, 280) : 0;
    const t3 = navType === 'POP' ? window.setTimeout(apply, 600) : 0;
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
      if (t3) window.clearTimeout(t3);
    };
  }, [location, navType]);

  return null;
}
