import { useCallback, useEffect, useRef, useState } from 'react';

const HIDE_MS = 2000;

export function useReelChrome(enabled: boolean) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<number | null>(null);

  const bump = useCallback(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    setVisible(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), HIDE_MS);
  }, [enabled]);

  const hide = useCallback(() => {
    if (!enabled) return;
    if (timer.current) window.clearTimeout(timer.current);
    setVisible(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setVisible(true);
      return;
    }
    bump();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [enabled, bump]);

  return { visible, bump, hide, setVisible };
}
