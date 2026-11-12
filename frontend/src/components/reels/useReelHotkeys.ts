import { useEffect, useRef } from 'react';

type HotkeyHandlers = {
  onTogglePlay: () => void;
  onSeekBy: (delta: number) => void;
  onVolumeDelta: (delta: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onExitFullscreen?: () => void;
  /** Escape outside fullscreen: leave the Reels viewer (desktop). */
  onExit?: () => void;
  onNext: () => void;
  onPrev: () => void;
  isFullscreen?: boolean;
};

export function useReelHotkeys(enabled: boolean, handlers: HotkeyHandlers) {
  const handlersRef = useRef(handlers);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const h = handlersRef.current;
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          h.onTogglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          h.onSeekBy(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          h.onSeekBy(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (h.isFullscreen) h.onVolumeDelta(0.08);
          else h.onPrev();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (h.isFullscreen) h.onVolumeDelta(-0.08);
          else h.onNext();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          h.onFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          h.onToggleMute();
          break;
        case 'Escape':
          if (h.isFullscreen) {
            e.preventDefault();
            (h.onExitFullscreen || h.onFullscreen)();
          } else if (h.onExit && !e.defaultPrevented) {
            // Let open dialogs/menus handle Escape themselves first.
            const openDialog = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]')).some(
              (el) => el.getClientRects().length > 0 && !el.closest('[aria-hidden="true"]'),
            );
            if (openDialog) break;
            e.preventDefault();
            h.onExit();
          }
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          h.onNext();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          h.onPrev();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
