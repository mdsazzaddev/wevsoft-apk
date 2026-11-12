import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart } from "lucide-react";
import { formatSocialCount } from "../../lib/formatCount";
import { AnimatePresence, motion } from "motion/react";
import { POST_REACTIONS, reactionDef, type ReactionType } from "../../lib/reactions";
import ReactionIcon from "../reactions/ReactionIcon";
import ReactionBar from "../reactions/ReactionBar";
import { preloadReactionAssets } from "../reactions/reactionLayout";

/** Touch long-press must be clearly longer than a normal tap so love isn't swallowed. */
const SHELF_HOLD_MS = 600;

type Variant = "feed" | "reel";

const OPTION_IDS = POST_REACTIONS.map((r) => r.id);

export default function ReactionButton({
  value,
  count,
  onChange,
  variant = "feed",
  hideCount = false,
  allowLike = false,
  onMedia = true,
}: {
  value: ReactionType | null;
  count: number;
  onChange: (next: ReactionType | null) => void;
  variant?: Variant;
  hideCount?: boolean;
  allowLike?: boolean;
  /** Reel rail over video (white) vs beside video on themed chrome. */
  onMedia?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState<{ type: ReactionType; n: number } | null>(null);
  const [btnHover, setBtnHover] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const burstTimer = useRef<number | null>(null);
  const openedByHold = useRef(false);
  const openedByHover = useRef(false);
  const openedByKey = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [shelfPos, setShelfPos] = useState<{ top: number; left: number } | null>(null);

  // Emoji reactions available on the shelf: Love, Haha, Wow, Crying, Angry ('like' removed)
  const current = value && value !== "like" ? reactionDef(value) : value === "like" ? reactionDef("love") : null;
  const isReel = variant === "reel";
  // Reels shelf opens left of the right-rail button: Love nearest the button (right), Angry far left.
  const options = isReel ? [...OPTION_IDS].reverse() : OPTION_IDS;
  const displayCount = current ? Math.max(1, count) : Math.max(0, count);

  const clearTimers = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    holdTimer.current = hoverTimer.current = closeTimer.current = null;
    pointerStartRef.current = null;
  };

  useEffect(
    () => () => {
      clearTimers();
      if (burstTimer.current) window.clearTimeout(burstTimer.current);
    },
    [],
  );

  useLayoutEffect(() => {
    if (!open) {
      setShelfPos(null);
      return;
    }
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      if (isReel) {
        // Open to the left of the right-rail button.
        setShelfPos({ top: r.bottom, left: r.left - 12 });
      } else {
        // Open above the feed action button.
        setShelfPos({ top: r.top - 10, left: r.left });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, isReel]);

  useEffect(() => {
    if (!open) {
      openedByKey.current = false;
      return;
    }
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || shelfRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignored
      }
    }
  };

  const showBurst = (type: ReactionType) => {
    setBurst({ type, n: Date.now() });
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 900);
  };

  // User selects an emoji from the opened shelf
  const pick = (type: ReactionType) => {
    clearTimers();
    setOpen(false);
    triggerHaptic();
    const next = value === type ? null : type;
    if (next) showBurst(type);
    onChange(next);
  };

  // Single click:
  // - If not reacted -> immediately apply "love" reaction!
  // - If already reacted -> unreact (toggle off).
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (openedByHold.current) {
      openedByHold.current = false;
      return;
    }
    clearTimers();
    if (open) {
      setOpen(false);
    }
    if (value) {
      onChange(null);
    } else {
      onChange("love");
      showBurst("love");
      triggerHaptic();
    }
  };

  // Long press / click & hold opens the emoji shelf
  const onPointerDown = (e: React.PointerEvent) => {
    preloadReactionAssets();
    // Desktop mouse opens via hover-and-hold; long-press is for touch/pen only.
    if (e.pointerType === "mouse") return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    openedByHold.current = false;
    holdTimer.current = window.setTimeout(() => {
      openedByHold.current = true;
      openedByHover.current = false;
      setOpen(true);
      triggerHaptic();
    }, SHELF_HOLD_MS);
  };

  // Cancel hold timer if user moves finger to scroll the feed
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current || !holdTimer.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimers();
    }
  };

  const onPointerUp = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    pointerStartRef.current = null;
  };

  // Desktop hover opens the emoji shelf after 400ms
  const onMouseEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    preloadReactionAssets();
    setBtnHover(true);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      openedByHover.current = true;
      setOpen(true);
    }, 500);
  };

  const onMouseLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setBtnHover(false);
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 300);
  };

  // Keyboard: ↑ / → / Menu key opens the shelf; arrows move inside it, Esc closes.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (["ArrowUp", "ArrowRight", "ContextMenu"].includes(e.key) || (e.key === "F10" && e.shiftKey)) {
      e.preventDefault();
      preloadReactionAssets();
      openedByKey.current = true;
      setOpen(true);
    } else if (e.key === "Escape" && open) {
      setOpen(false);
    }
  };

  const iconPx = isReel ? 28 : 24;
  const slot = isReel ? 26 : 19; // feed: matches the 19px light action-row icons

  return (
    <div
      ref={wrapRef}
      className={`relative ${isReel ? "flex flex-col items-center" : ""}`}
      onPointerEnter={onMouseEnter}
      onPointerLeave={onMouseLeave}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => {
          if (open || openedByHold.current) e.preventDefault();
        }}
        style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
        aria-label={current?.label || trLabel(t, 'React', 'React')}
        aria-haspopup="true"
        aria-expanded={open}
        title={current?.label || trLabel(t, 'React', 'React')}
        className={
          isReel
            ? `w-11 h-11 flex items-center justify-center p-0 bg-transparent border-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-transform duration-200 hover:scale-110 active:scale-95 ${
                onMedia ? "text-white" : "text-white"
              }`
            : `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold transition-colors duration-200 hover:bg-muted/40 active:scale-95 ${
                current ? current.color : "text-foreground/85 hover:text-rose-500"
              }`
        }
      >
        {current ? (
          <motion.div
            key={current.id}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 480, damping: 24 }}
            className={isReel ? "drop-shadow flex items-center justify-center transform-gpu will-change-transform" : "flex items-center justify-center transform-gpu will-change-transform"}
            // Same footprint as the outline heart so reacting never shifts the action row;
            // the 3D face is slightly larger and overhangs symmetrically.
            style={{ width: slot, height: slot }}
          >
            <span style={{ margin: -(iconPx - slot) / 2, display: "inline-flex", flexShrink: 0 }}>
              <ReactionIcon type={current.id} size={iconPx} staticImage />
            </span>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }} className="flex items-center justify-center transform-gpu will-change-transform">
            <Heart
              size={isReel ? 26 : 20}
              strokeWidth={isReel ? 2.2 : 2.35}
              className={isReel && onMedia ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : ""}
            />
          </motion.div>
        )}
        {!isReel && !hideCount && displayCount > 0 && (
          <span className="tabular-nums font-extrabold">{formatSocialCount(displayCount)}</span>
        )}
      </button>

      {isReel && !hideCount && displayCount > 0 && (
        <span
          className={`text-[10px] font-bold leading-none tabular-nums mt-0.5 ${
            onMedia ? "text-white/90 drop-shadow" : "text-muted-foreground"
          }`}
        >
          {formatSocialCount(displayCount)}
        </span>
      )}

      {/* Portaled shelf — feed/reel parents use overflow-hidden which clipped the picker. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && shelfPos ? (
              <motion.div
                ref={shelfRef}
                initial={{ opacity: 0, scale: 0.88, y: isReel ? 0 : 8, x: isReel ? 8 : 0 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: isReel ? 0 : 6 }}
                transition={{ type: "spring", stiffness: 480, damping: 28 }}
                style={{
                  position: "fixed",
                  // Feed: anchor shelf bottom just above the button. Reel: anchor right edge left of rail.
                  bottom: `${Math.max(8, window.innerHeight - shelfPos.top)}px`,
                  left: isReel ? undefined : shelfPos.left,
                  right: isReel ? `${Math.max(8, window.innerWidth - shelfPos.left)}px` : undefined,
                  originX: isReel ? 1 : 0.2,
                  originY: 1,
                  zIndex: 200,
                }}
                className="w-max transform-gpu will-change-transform"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ReactionBar
                  options={options}
                  value={value}
                  onPick={pick}
                  staggerFromEnd={isReel}
                  compact={isReel}
                  className={isReel ? "rx-bar--reel" : undefined}
                  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
                  autoFocus={openedByKey.current}
                  onEscape={() => {
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      {/* Floating reaction pop on select */}
      {burst && (
        <div
          key={burst.n}
          className={`pointer-events-none absolute z-[90] ${isReel ? "left-1/2 top-[22px]" : "left-[20px] top-[14px]"}`}
        >
          <motion.div
            className="absolute -left-[18px] -top-[18px] h-9 w-9 transform-gpu will-change-transform"
            initial={{ opacity: 0, scale: 0.45, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.45, 1.25, 1.1, 0.95], y: [0, -14, -28, -44] }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          >
            <ReactionIcon type={burst.type} size={36} staticImage />
          </motion.div>
        </div>
      )}
    </div>
  );
}
