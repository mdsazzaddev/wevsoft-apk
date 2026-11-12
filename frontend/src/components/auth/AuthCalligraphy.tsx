import React from 'react';

const CALLIGRAPHY_CSS = `
.auth-calligraphy {
  position: fixed !important;
  inset: 0 !important;
  z-index: 4 !important;
  pointer-events: none !important;
  user-select: none !important;
  overflow: hidden !important;
}

.auth-calligraphy__piece {
  position: absolute !important;
  height: auto !important;
  max-width: none !important;
  user-select: none !important;
  pointer-events: none !important;
  object-fit: contain !important;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

html.dark .auth-calligraphy__piece,
html.oled .auth-calligraphy__piece,
html.theme-oled .auth-calligraphy__piece {
  filter: brightness(1.32) saturate(1.15) drop-shadow(0 0 12px rgba(99, 132, 255, 0.18));
}

/* Clean floating-label input box without double focus borders or text overlap */
.auth-screen .auth-field-input,
.auth-screen .auth-field-input:focus {
  border: 0 !important;
  box-shadow: none !important;
  outline: none !important;
}

.auth-split-right.auth-card:not(.auth-card--wide) .auth-field-input {
  height: 46px !important;
  min-height: 46px !important;
  padding-top: 20px !important;
  padding-bottom: 4px !important;
  font-size: 13.5px !important;
  line-height: 1.25 !important;
}

/* Mobile & Tablet (< 1024px) */
.auth-calligraphy__top-right {
  top: clamp(0.2rem, 0.9dvh, 0.6rem) !important;
  right: 0 !important;
  left: auto !important;
  width: min(72vw, 36dvh, 23rem) !important;
}

.auth-calligraphy__bottom-left {
  bottom: 0 !important;
  left: 0.25rem !important;
  top: auto !important;
  width: min(62vw, 30dvh, 19.5rem) !important;
}

.auth-calligraphy__left-swirl {
  top: 26% !important;
  left: 0 !important;
  width: min(9.5vw, 13dvh, 3.25rem) !important;
  opacity: 0.85;
}

.auth-calligraphy__bottom-swirl {
  bottom: 0 !important;
  left: 52% !important;
  top: auto !important;
  width: min(17vw, 11dvh, 5.5rem) !important;
  opacity: 0.85;
}

.auth-calligraphy__boat {
  bottom: clamp(0.35rem, 1.5dvh, 0.85rem) !important;
  right: clamp(0.35rem, 1.5vw, 0.85rem) !important;
  left: auto !important;
  top: auto !important;
  width: min(21vw, 13dvh, 6.25rem) !important;
}

@media (max-width: 1023px) {
  .auth-screen--calligraphy .auth-shell {
    padding-top: clamp(4.25rem, 12dvh, 6.5rem) !important;
    padding-bottom: clamp(4.25rem, 12dvh, 6.5rem) !important;
  }

  .auth-screen--calligraphy .auth-card:not(.auth-card--wide) {
    max-width: min(22.5rem, 90vw) !important;
  }
}

@media (max-width: 480px) {
  .auth-calligraphy__top-right {
    width: min(74vw, 28dvh, 17.5rem) !important;
  }

  .auth-calligraphy__bottom-left {
    width: min(64vw, 24dvh, 14.5rem) !important;
  }

  .auth-calligraphy__boat {
    width: min(22vw, 11dvh, 4.75rem) !important;
  }

  .auth-calligraphy__left-swirl {
    width: min(8.5vw, 10dvh, 2.25rem) !important;
    opacity: 0.7;
  }

  .auth-calligraphy__bottom-swirl {
    width: min(16vw, 9dvh, 4rem) !important;
    opacity: 0.7;
  }
}

/* Desktop (>= 1024px): exact proportional match with reference layout */
@media (min-width: 1024px) {
  .auth-calligraphy__top-right {
    top: 0.8dvh !important;
    right: 0.2vw !important;
    left: auto !important;
    width: min(58.5vw, 115dvh) !important;
  }

  .auth-calligraphy__bottom-left {
    bottom: 0 !important;
    left: 1.2vw !important;
    top: auto !important;
    width: min(52vw, 101dvh) !important;
  }

  .auth-calligraphy__left-swirl {
    top: 25% !important;
    left: 0 !important;
    width: min(8.5vw, 16.5dvh) !important;
    opacity: 1;
  }

  .auth-calligraphy__bottom-swirl {
    bottom: 0 !important;
    left: 50% !important;
    top: auto !important;
    width: min(14.8vw, 28dvh) !important;
    opacity: 1;
  }

  .auth-calligraphy__boat {
    bottom: 3.5dvh !important;
    right: 1.2vw !important;
    left: auto !important;
    top: auto !important;
    width: min(17.2vw, 32dvh) !important;
  }

  .auth-screen--calligraphy .wev-mascot--auth {
    width: clamp(15.5rem, min(25vw, 48dvh), 23rem) !important;
    max-width: 23rem !important;
  }

  .auth-screen--calligraphy .auth-mascot-slot {
    transform: translate(-1.5vw, -5.5dvh) !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) {
    justify-content: flex-end !important;
    align-items: flex-start !important;
    padding-top: clamp(3.75rem, 19.5dvh, 7.25rem) !important;
    padding-right: clamp(3.75rem, 8.8vw, 8rem) !important;
    padding-bottom: 2dvh !important;
    padding-left: clamp(1rem, 2vw, 2rem) !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-card-inner {
    max-width: min(21.5rem, 33.5vw) !important;
  }
}

/* Compact vertical spacing on shorter laptop viewports while keeping 46px input boxes clean */
@media (min-width: 1024px) and (max-height: 600px) {
  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-card-inner {
    gap: 0.45rem !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-form,
  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-form-stack {
    gap: 0.5rem !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-submit,
  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-alt-signin .auth-oauth-btn {
    height: 38px !important;
    min-height: 38px !important;
    font-size: 12.5px !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-alt-signin {
    gap: 0.45rem !important;
    margin-top: 0.4rem !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-oauth {
    margin-top: 0.25rem !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-oauth .auth-oauth-btn {
    width: 36px !important;
    height: 36px !important;
  }

  .auth-screen--calligraphy .auth-split-right.auth-card:not(.auth-card--wide) .auth-card-inner > p.text-center {
    margin-top: 0.3rem !important;
  }
}
`;

/**
 * Decorative Bengali calligraphy, lotus & paddy vine, filigree swirls, and river sailboat
 * extracted with clean alpha transparency from the login design artwork.
 * Controlled via the Admin Panel "Login Page Calligraphy" toggle (`loginCalligraphyEnabled`).
 */
export default function AuthCalligraphy() {
  return (
    <div
      aria-hidden="true"
      className="auth-calligraphy pointer-events-none select-none fixed inset-0 overflow-hidden"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <style>{CALLIGRAPHY_CSS}</style>

      {/* Top-right Bengali calligraphy & floral vine framing the login card */}
      <img
        src="/calligraphy/top-right.webp"
        alt=""
        width={608}
        height={286}
        decoding="async"
        draggable={false}
        className="auth-calligraphy__piece auth-calligraphy__top-right"
        style={{ position: 'absolute', top: '0.8dvh', right: '0.2vw', height: 'auto' }}
      />

      {/* Bottom-left lotus (শাপলা/পদ্ম) & paddy sheaves (ধানের শীষ) vine */}
      <img
        src="/calligraphy/bottom-left.webp"
        alt=""
        width={541}
        height={334}
        decoding="async"
        draggable={false}
        className="auth-calligraphy__piece auth-calligraphy__bottom-left"
        style={{ position: 'absolute', bottom: 0, left: '1.2vw', height: 'auto' }}
      />

      {/* Left-edge soft periwinkle filigree swirl */}
      <img
        src="/calligraphy/left-swirl.webp"
        alt=""
        width={89}
        height={217}
        decoding="async"
        draggable={false}
        className="auth-calligraphy__piece auth-calligraphy__left-swirl"
        style={{ position: 'absolute', top: '25%', left: 0, height: 'auto' }}
      />

      {/* Bottom-center soft periwinkle filigree swirl */}
      <img
        src="/calligraphy/bottom-swirl.webp"
        alt=""
        width={155}
        height={110}
        decoding="async"
        draggable={false}
        className="auth-calligraphy__piece auth-calligraphy__bottom-swirl"
        style={{ position: 'absolute', bottom: 0, left: '50%', height: 'auto' }}
      />

      {/* Bottom-right river sailboat (নৌকা) */}
      <img
        src="/calligraphy/boat.webp"
        alt=""
        width={180}
        height={139}
        decoding="async"
        draggable={false}
        className="auth-calligraphy__piece auth-calligraphy__boat"
        style={{ position: 'absolute', bottom: '3.5dvh', right: '1.2vw', height: 'auto' }}
      />
    </div>
  );
}
