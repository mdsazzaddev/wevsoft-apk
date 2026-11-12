import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { REELS_PLAYBACK_EVENT, reelsChromeInitialDelay, useAutoHide, REELS_CHROME_REPEAT_MS } from './useAutoHide';

export type ReelsFeedTab = 'for-you' | 'following';

/** Polished side-menu glyph: staggered rounded bars with an accent dot. */
function ReelsMenuGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" className={className} aria-hidden="true">
      <path d="M4 6.5h11" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M4 17.5h7.5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={19} cy={6.5} r={1.9} className="fill-primary" />
    </svg>
  );
}

export default function ReelsMobileHeader({
  activeTab,
  onTabChange,
  onMenu,
  onSearch,
  hidden = false,
}: {
  activeTab: ReelsFeedTab;
  onTabChange: (tab: ReelsFeedTab) => void;
  /** Opens the Reels sidebar drawer. */
  onMenu: () => void;
  onSearch: () => void;
  /** @deprecated Creator Studio shortcut was removed from the Reels header; kept for call-site compat. */
  onCreate?: () => void;
  hidden?: boolean;
}) {
  const { t } = useTranslation();
  const initialDelay = useRef(reelsChromeInitialDelay()).current;
  // For You / Following + Search: shown on entry, auto-hide; reappear (and stay) while paused.
  const chrome = useAutoHide(initialDelay);

  useEffect(() => {
    const onPlayback = (e: Event) => {
      const playing = !!(e as CustomEvent<{ playing: boolean }>).detail?.playing;
      if (playing) chrome.show(REELS_CHROME_REPEAT_MS);
      else chrome.hold();
    };
    window.addEventListener(REELS_PLAYBACK_EVENT, onPlayback);
    return () => window.removeEventListener(REELS_PLAYBACK_EVENT, onPlayback);
  }, [chrome.show, chrome.hold]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hidden) return null;

  const fade = `transition-opacity duration-300 ${chrome.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`;
  const tabBtn = (tab: ReelsFeedTab, label: string) => (
    <button
      type="button"
      onClick={() => { onTabChange(tab); chrome.show(REELS_CHROME_REPEAT_MS); }}
      className={`relative px-1 py-1 text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-colors duration-200 ${
        activeTab === tab ? 'text-white' : 'text-white/55 hover:text-white/80'
      }`}
    >
      {label}
      {activeTab === tab && <span className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-white" />}
    </button>
  );

  return (
    <header
      className="absolute inset-x-0 z-40 flex items-center justify-center px-3 pointer-events-none lg:hidden"
      style={{ top: 'max(12px, calc(env(safe-area-inset-top) + 8px))' }}
      aria-label="Reels header"
    >
      {/* Left: side menu (always visible) */}
      <div className="absolute left-3 flex items-center pointer-events-auto">
        <button
          type="button"
          onClick={onMenu}
          title={t('reels.openMenu', 'Menu')}
          aria-label={t('reels.openMenu', 'Menu')}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md border border-white/15 shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <ReelsMenuGlyph />
        </button>
      </div>

      {/* Center: For You / Following (auto-hide) */}
      <div className={`flex items-center gap-3 ${fade}`} aria-hidden={!chrome.visible}>
        {tabBtn('for-you', t('reels.forYou', 'For You'))}
        {tabBtn('following', t('reels.following', 'Following'))}
      </div>

      {/* Right: Search (auto-hide; reappears when the reel is paused) */}
      <div className={`absolute right-3 flex items-center ${fade}`} aria-hidden={!chrome.visible}>
        <button
          type="button"
          onClick={onSearch}
          tabIndex={chrome.visible ? 0 : -1}
          title={t('reels.search', 'Search')}
          aria-label={t('reels.search', 'Search')}
          className="flex h-10 w-10 items-center justify-center text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] transition-opacity duration-200 hover:opacity-80 active:opacity-60"
        >
          <Search size={20} strokeWidth={2.4} />
        </button>
      </div>
    </header>
  );
}