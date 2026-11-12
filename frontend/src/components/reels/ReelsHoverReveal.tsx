import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ReelsUiMode } from '../../lib/reelsUiPrefs';

type Props = {
  mode: ReelsUiMode;
  children: ReactNode;
  className?: string;
  /** Keep visible regardless of hover (e.g. while a dropdown is open). */
  forceShow?: boolean;
  /** Extra invisible padding around the content that also reveals it. */
  hotspotClassName?: string;
};

/**
 * Desktop (lg+) hover-reveal wrapper. Below lg the content is always shown so
 * mobile behaviour is unchanged. "hidden" only hides on desktop as well.
 */
export default function ReelsHoverReveal({ mode, children, className = '', forceShow, hotspotClassName = 'p-2 -m-2' }: Props) {
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const show = useCallback(() => {
    cancel();
    setPeek(true);
  }, [cancel]);
  const hideSoon = useCallback(() => {
    cancel();
    timer.current = window.setTimeout(() => setPeek(false), 280);
  }, [cancel]);
  useEffect(() => cancel, [cancel]);

  if (mode === 'always') return <div className={className}>{children}</div>;
  if (mode === 'hidden') return <div className={`${className} lg:hidden`}>{children}</div>;

  const visible = peek || !!forceShow;
  return (
    <div
      className={`${className} ${hotspotClassName}`}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hideSoon();
      }}
    >
      <div className={`transition-opacity duration-300 ${visible ? 'lg:opacity-100' : 'lg:opacity-0'}`}>{children}</div>
    </div>
  );
}
