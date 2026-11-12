/**
 * Space Home timeline — same stack as personal `/home`:
 * Stories → PostComposer → UnifiedFeed.
 *
 * Soft-login (`matchPersonalHome`): same network feed as personal Home
 * (posts / reels / marketplace / ads) — Friends UI stays gated elsewhere.
 * Public Space Home tab keeps Space-scoped stories + feed.
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { SpacePublicPayload } from '@wevsoft/shared/wevspace';
import StoryBar from '../social/StoryBar';
import PostComposer from '../social/PostComposer';
import UnifiedFeed from '../feed/UnifiedFeed';

function prefersLiteMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches;
}

type Props = {
  space: SpacePublicPayload;
  canPost: boolean;
  feedKey: number;
  onPosted: () => void;
  /** When false, pause media (Home keep-alive) — same as personal `mediaActive`. */
  mediaActive?: boolean;
  /**
   * Soft-login `/home`: same StoryBar + UnifiedFeed as personal account
   * (no `spaceId` filter). Public Space Home tab leaves this false.
   */
  matchPersonalHome?: boolean;
  /** Story row above the feed. The public Space page (a profile) turns it off. */
  showStories?: boolean;
  /** Extra blocks above the timeline (e.g. setup banner). */
  header?: ReactNode;
  /** Extra blocks under the feed. */
  footer?: ReactNode;
  className?: string;
};

export default function SpaceHomeTimeline({
  space,
  canPost,
  feedKey,
  onPosted,
  mediaActive = true,
  matchPersonalHome = false,
  showStories = true,
  header,
  footer,
  className = '',
}: Props) {
  const composer = canPost ? (
    <PostComposer
      onPostCreated={onPosted}
      spaceId={space.id}
      spaceName={space.name}
      spaceAvatar={space.avatar}
    />
  ) : null;

  return (
    <div className={`max-w-3xl mx-auto flex flex-col gap-3 md:gap-4 pb-24 md:pb-12 pt-0 ${className}`}>
      {header ? <div className="w-full px-3 md:px-0">{header}</div> : null}
      {showStories && (
      <div className="w-full px-3 md:px-0">
        <StoryBar
          asSpace={{
            id: space.id,
            name: space.name,
            avatar: space.avatar,
            handle: space.handle,
            canCreate: canPost,
          }}
        />
      </div>
      )}
      {composer ? (
        <div className="w-full px-3 md:px-0">
          {prefersLiteMotion() ? (
            composer
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {composer}
            </motion.div>
          )}
        </div>
      ) : null}

      <UnifiedFeed
        key={matchPersonalHome ? `personal-${feedKey}` : `${space.id}-${feedKey}`}
        mediaActive={mediaActive}
        spaceId={matchPersonalHome ? undefined : space.id}
      />
      {footer}
    </div>
  );
}
