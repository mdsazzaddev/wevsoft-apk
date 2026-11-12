import { useEffect, useId, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getOverlays, withOverlay } from '../lib/overlayStack';

function locationPath(loc: { pathname: string; search: string; hash: string }) {
  return `${loc.pathname}${loc.search}${loc.hash}`;
}

/**
 * When an overlay (drawer / modal / sheet) is open, push a same-URL history
 * entry so browser/Android Back closes it first instead of leaving the page.
 *
 * Link clicks that `replace` the overlay entry must not also call the close
 * handler in a way that `navigate(-1)`s — that pops the destination and looks
 * like a dead link. Prefer letting `inStack` drop (replace/Back) call onClose;
 * when closing programmatically on the same URL, we pop.
 */
export function useOverlayBack(open: boolean, onClose: () => void) {
  const id = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const onCloseRef = useRef(onClose);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  onCloseRef.current = onClose;
  const phaseRef = useRef<'idle' | 'pushing' | 'open' | 'popping'>('idle');
  const locationRef = useRef(location);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  locationRef.current = location;
  const openedPathRef = useRef('');

  const inStack = getOverlays(location.state).includes(id);

  useEffect(() => {
    const loc = locationRef.current;
    const path = locationPath(loc);

    if (open) {
      if (inStack) {
        phaseRef.current = 'open';
        openedPathRef.current = path;
        return;
      }
      // Still waiting for the history push to land — do not treat as dismiss.
      if (phaseRef.current === 'pushing') {
        return;
      }
      // Overlay was open, then left the stack (Back / link replace) → close UI.
      if (phaseRef.current === 'open') {
        phaseRef.current = 'idle';
        onCloseRef.current();
        return;
      }
      if ((phaseRef.current as any) !== 'pushing') {
        phaseRef.current = 'pushing';
        openedPathRef.current = path;
        navigate(path, {
          state: withOverlay(loc.state, id),
        });
      }
      return;
    }

    if (inStack && (phaseRef.current === 'open' || phaseRef.current === 'pushing')) {
      // A nav link already replaced this history entry with another URL — do
      // not navigate(-1) or we undo that navigation.
      if (path !== openedPathRef.current) {
        phaseRef.current = 'idle';
        return;
      }
      phaseRef.current = 'popping';
      navigate(-1);
      return;
    }
    if (!inStack) phaseRef.current = 'idle';
  }, [open, inStack, id, navigate]);
}
