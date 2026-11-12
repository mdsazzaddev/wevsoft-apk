import { useEffect, useRef } from 'react';
import {
  REEL_HOLD_SPEED_CANCEL_PX,
  REEL_HOLD_SPEED_DELAY_MS,
  isReelHoldSpeedZone,
} from './reelHoldSpeed.logic';

type GestureHandlers = {
  onTogglePlay: () => void;
  onSeekBy: (delta: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onMouseDoubleClick?: () => void;
  onHoldSpeedStart: () => void;
  onHoldSpeedEnd: () => void;
  onVolumeDelta: (delta: number) => void;
  onBrightnessDelta: (delta: number) => void;
  onRevealChrome: () => void;
  chromeVisible: boolean;
  onPinchZoom?: (scale: number) => void;
  /** Desktop: drag horizontally across the video to scrub. */
  onScrubToClientX?: (clientX: number, rect: DOMRect, phase: 'start' | 'move' | 'end') => void;
  isFullscreen?: boolean;
};

export function useReelGestures(active: boolean, handlers: GestureHandlers) {
  const ref = useRef<HTMLDivElement>(null);
  const handlersRef = useRef(handlers);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  handlersRef.current = handlers;

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;

    let tapTimer: number | null = null;
    let lastTap = 0;
    /** After a double-tap, further rapid taps keep spawning hearts (TikTok style). */
    let heartUntil = 0;
    let holdTimer: number | null = null;
    let holding = false;
    let startY = 0;
    let startX = 0;
    let edge: 'left' | 'right' | null = null;
    let moved = false;
    let mouseScrubbing = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let pinching = false;

    const dist = () => {
      const pts = [...pointers.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const clearHold = () => {
      if (holdTimer) window.clearTimeout(holdTimer);
      holdTimer = null;
      if (holding) {
        holding = false;
        el.style.touchAction = '';
        handlersRef.current.onHoldSpeedEnd();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, textarea, [data-reel-scrub], [data-reel-play]')) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        pinching = true;
        pinchStartDist = dist() || 1;
        pinchStartScale = 1;
        clearHold();
        return;
      }
      moved = false;
      mouseScrubbing = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isTouch = e.pointerType !== 'mouse';
      // On touch devices, never hijack regular vertical thumb-scrolling unless in fullscreen
      edge = (!isTouch || handlersRef.current.isFullscreen)
        ? (x < rect.width * 0.12 ? 'left' : x > rect.width * 0.88 ? 'right' : null)
        : null;
      // Bottom of the reel: press-and-hold → 2× (touch or mouse). Release → 1×.
      if (isReelHoldSpeedZone(e.clientY, rect)) {
        holdTimer = window.setTimeout(() => {
          holding = true;
          el.style.touchAction = 'none';
          handlersRef.current.onHoldSpeedStart();
        }, REEL_HOLD_SPEED_DELAY_MS);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinching && pointers.size >= 2 && handlersRef.current.onPinchZoom) {
        const scale = Math.min(3, Math.max(1, pinchStartScale * (dist() / pinchStartDist)));
        handlersRef.current.onPinchZoom(scale);
        return;
      }

      const mouseHeld = e.pointerType !== 'mouse' || (e.buttons & 1) === 1;
      const fromPress = pointers.has(e.pointerId) || mouseScrubbing;
      if (!fromPress || !mouseHeld) {
        if (mouseScrubbing && e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
          mouseScrubbing = false;
          el.style.cursor = '';
          try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
          handlersRef.current.onScrubToClientX?.(e.clientX, el.getBoundingClientRect(), 'end');
        }
        return;
      }

      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      // Once 2× is active, keep it until release (finger jitter shouldn't drop speed).
      // Before it arms, any meaningful move cancels so the feed can still scroll.
      if (!holding && (Math.abs(dy) > REEL_HOLD_SPEED_CANCEL_PX || Math.abs(dx) > REEL_HOLD_SPEED_CANCEL_PX)) {
        moved = true;
        clearHold();
      }
      if (holding) {
        e.preventDefault();
        return;
      }

      if (e.pointerType === 'mouse' && handlersRef.current.onScrubToClientX && (mouseScrubbing || (Math.abs(dx) > 10 && Math.abs(dx) >= Math.abs(dy)))) {
        const rect = el.getBoundingClientRect();
        if (!mouseScrubbing) {
          mouseScrubbing = true;
          clearHold();
          try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
          el.style.cursor = 'grabbing';
          handlersRef.current.onScrubToClientX(e.clientX, rect, 'start');
        } else {
          handlersRef.current.onScrubToClientX(e.clientX, rect, 'move');
        }
        e.preventDefault();
        return;
      }

      if (!edge || Math.abs(dy) < 6) return;
      e.preventDefault();
      const delta = -dy / 240;
      if (edge === 'right') handlersRef.current.onVolumeDelta(delta);
      else handlersRef.current.onBrightnessDelta(delta);
      startY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pinching) {
        if (pointers.size < 2) pinching = false;
        return;
      }
      const wasHolding = holding;
      const wasScrubbing = mouseScrubbing;
      clearHold();
      if (wasScrubbing) {
        mouseScrubbing = false;
        el.style.cursor = '';
        try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        handlersRef.current.onScrubToClientX?.(e.clientX, el.getBoundingClientRect(), 'end');
        return;
      }
      if (wasHolding || moved) return;
      if ((e.target as HTMLElement).closest('button, a, input, textarea, [data-reel-scrub], [data-reel-play]')) return;
      const now = Date.now();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (e.pointerType !== 'mouse' && now < heartUntil && handlersRef.current.onDoubleTap) {
        if (tapTimer) window.clearTimeout(tapTimer);
        tapTimer = null;
        heartUntil = now + 400;
        handlersRef.current.onDoubleTap(e.clientX - rect.left, e.clientY - rect.top);
        return;
      }
      if (now - lastTap < 250) {
        if (tapTimer) window.clearTimeout(tapTimer);
        tapTimer = null;
        lastTap = 0;
        if (e.pointerType === 'mouse' && handlersRef.current.onMouseDoubleClick) {
          handlersRef.current.onMouseDoubleClick();
        } else if (handlersRef.current.onDoubleTap) {
          heartUntil = now + 400;
          handlersRef.current.onDoubleTap(e.clientX - rect.left, e.clientY - rect.top);
        } else {
          handlersRef.current.onSeekBy(x < rect.width / 2 ? -10 : 10);
        }
        handlersRef.current.onRevealChrome();
        return;
      }
      lastTap = now;
      tapTimer = window.setTimeout(() => {
        if (!handlersRef.current.chromeVisible) {
          handlersRef.current.onRevealChrome();
        } else {
          handlersRef.current.onTogglePlay();
          handlersRef.current.onRevealChrome();
        }
        tapTimer = null;
      }, 250);
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', (e) => {
      pointers.delete(e.pointerId);
      if (mouseScrubbing) {
        mouseScrubbing = false;
        el.style.cursor = '';
        handlersRef.current.onScrubToClientX?.(e.clientX, el.getBoundingClientRect(), 'end');
      }
      clearHold();
    });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      clearHold();
      if (tapTimer) window.clearTimeout(tapTimer);
    };
  }, [active]);

  return ref;
}
