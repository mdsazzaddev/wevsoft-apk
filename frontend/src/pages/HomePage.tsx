import PostComposer from "../components/social/PostComposer";
import StoryBar from "../components/social/StoryBar";
import UnifiedFeed from '../components/feed/UnifiedFeed';
import SpaceModeHome from '../components/wevspace/SpaceModeHome';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { HOME_REFRESH_EVENT } from '../lib/appNavigation';
import { acquirePostMusicSuspend } from '../lib/postMusicPlayback';
import { pauseExclusivePlayback } from '../lib/exclusiveMediaPlayback';
import { stopReelPreview } from '../lib/reelPreviewPlayback';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

function prefersLiteMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
}

export default function HomePage() {
  const [feedKey, setFeedKey] = useState(0);
  const { pathname } = useLocation();
  const homeActive = pathname === '/home' || pathname === '/feed' || pathname === '/';
  const { active, isSpaceMode } = useSpaceIdentities();

  useEffect(() => {
    const onRefresh = () => {
      setFeedKey((k) => k + 1);
      const el = document.getElementById('main-scroll-area');
      el?.scrollTo({ top: 0, behavior: prefersLiteMotion() ? 'auto' : 'smooth' });
    };
    window.addEventListener(HOME_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(HOME_REFRESH_EVENT, onRefresh);
  }, []);

  // Home stays mounted when navigating away — force-stop feed audio/video.
  useEffect(() => {
    if (homeActive) return;
    const release = acquirePostMusicSuspend();
    pauseExclusivePlayback();
    stopReelPreview();
    return release;
  }, [homeActive]);

  // Facebook Page style: soft-login keeps Wevsoft Home chrome; only the feed identity changes.
  if (isSpaceMode && active?.kind === 'space' && active.id) {
    return (
      <SpaceModeHome
        key={active.id}
        active={active}
        mediaActive={homeActive}
        refreshKey={feedKey}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 pb-24 md:pb-12 pt-0">
      <div className="w-full px-3 md:px-0">
        <StoryBar />
      </div>
      <div className="w-full px-3 md:px-0">
        {prefersLiteMotion() ? (
          <PostComposer onPostCreated={() => setFeedKey((k) => k + 1)} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PostComposer onPostCreated={() => setFeedKey((k) => k + 1)} />
          </motion.div>
        )}
      </div>

      <UnifiedFeed key={feedKey} mediaActive={homeActive} />
    </div>
  );
}
