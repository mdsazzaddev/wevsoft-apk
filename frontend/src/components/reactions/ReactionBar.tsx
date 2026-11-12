import React, { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { reactionDef, type ReactionType } from '../../lib/reactions';
import ReactionIcon from './ReactionIcon';
import { preloadReactionAssets } from './reactionLayout';

const ACCENT: Record<string, string> = {
  like: '#ff3b5c', love: '#ff3b5c', haha: '#ffc02e', wow: '#ffb020', sad: '#3b9cff', angry: '#ff5a2b',
};
export const reactionAccent = (t: string) => ACCENT[t] || '#3b82f6';

const PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3;
  const r = 24 + (i % 2) * 6;
  return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) };
});

/** Ripple (heart-shaped for Love) + a few restrained particles. Mount with a `key` to replay. */
export const ReactionBurst = memo(function ReactionBurst({ type }: { type: ReactionType | string }) {
  const c = reactionAccent(type);
  const isLove = type === 'love' || type === 'like';
  return (
    <span className="rx-burst" aria-hidden="true" style={{ ['--c' as any]: c }}>
      {isLove ? (
        <svg className="rx-heartring" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 20.5s-7.6-4.6-9.5-9.3C1 7.8 2.9 4.8 6 4.8c2 0 3.5 1.1 4.2 2.4.7-1.3 2.2-2.4 4.2-2.4 3.1 0 5 3 3.5 6.4-1.9 4.7-9.9 9.3-9.9 9.3z" />
        </svg>
      ) : (
        <span className="rx-ring" />
      )}
      {PARTICLES.map((p, i) => (
        <span key={i} className="rx-p" style={{ ['--x' as any]: `${p.x}px`, ['--y' as any]: `${p.y}px`, animationDelay: `${(i % 3) * 0.03}s` }} />
      ))}
    </span>
  );
});

type Props = {
  options: readonly ReactionType[];
  value: ReactionType | null | undefined;
  onPick: (type: ReactionType) => void;
  className?: string;
  /** Move keyboard focus into the bar when it appears (keyboard-opened). */
  autoFocus?: boolean;
  onEscape?: () => void;
  onHoverChange?: (type: ReactionType | null) => void;
  ariaLabel?: string;
  /** Stagger entrance from the last option (e.g. Love on the right for reels). */
  staggerFromEnd?: boolean;
  /** Compact hover (stay inside tight glass cluster — reels popover). */
  compact?: boolean;
};

/**
 * The one shared reaction picker: glossy pill + five 3D animated faces.
 * Used by feed posts, spaces, reels and group posts so every surface looks identical.
 */
function ReactionBarImpl({ options, value, onPick, className = '', autoFocus, onEscape, onHoverChange, ariaLabel = 'Reactions', staggerFromEnd = false, compact = false }: Props) {
  const [hovered, setHovered] = useState<ReactionType | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const norm = value === 'like' ? 'love' : value;

  useEffect(() => { preloadReactionAssets(); }, []);
  useEffect(() => {
    if (!autoFocus) return;
    const first = (norm && refs.current[norm]) || refs.current[options[0]];
    first?.focus();
  }, [autoFocus]);  

  const hover = (t: ReactionType | null) => { setHovered(t); onHoverChange?.(t); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (e.key === 'Escape') { e.stopPropagation(); onEscape?.(); return; }
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = options.findIndex((o) => refs.current[o] === document.activeElement);
    let n: number;
    if (e.key === 'ArrowRight') n = (i + 1) % options.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + options.length) % options.length;
    else if (e.key === 'Home') n = 0;
    else n = options.length - 1;
    refs.current[options[n]]?.focus();
  };

  return (
    <div className={`rx-bar ${className}`} role="toolbar" aria-label={ariaLabel} onKeyDown={onKeyDown} onMouseLeave={() => hover(null)}>
      {options.map((id, i) => {
        const def = reactionDef(id);
        const selected = norm === id;
        const isHover = hovered === id;
        return (
          <motion.button
            key={id}
            ref={(el: HTMLButtonElement | null) => { refs.current[id] = el; }}
            type="button"
            className="rx-item transform-gpu will-change-transform"
            data-selected={selected}
            data-reaction={id}
            aria-label={def?.label || id}
            aria-pressed={selected}
            style={{ ['--rx-dot' as any]: reactionAccent(id) }}
            onClick={(e) => { e.stopPropagation(); onPick(id); }}
            onMouseEnter={() => hover(id)}
            onFocus={() => hover(id)}
            onBlur={() => hover(null)}
            onTouchStart={() => hover(id)}
            initial={{ y: compact ? 4 : 10, opacity: 0, scale: compact ? 0.85 : 0.7 }}
            animate={{
              y: isHover ? (compact ? -2 : -3) : 0,
              opacity: 1,
              scale: isHover ? (compact ? 1.1 : 1.14) : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 480,
              damping: 28,
              delay: hovered ? 0 : (staggerFromEnd ? options.length - 1 - i : i) * 0.025,
            }}
            whileTap={{ scale: compact ? 0.96 : 0.92 }}
          >
            <AnimatePresence>
              {isHover && def && !compact && (
                <motion.span
                  className="rx-label"
                  initial={{ opacity: 0, y: 4, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.14 }}
                >
                  {def.label}
                </motion.span>
              )}
            </AnimatePresence>
            <ReactionIcon type={id} size="var(--rx-icon)" state={isHover ? 'hover' : 'idle'} />
          </motion.button>
        );
      })}
    </div>
  );
}

export const ReactionBar = memo(ReactionBarImpl);
export default ReactionBar;
