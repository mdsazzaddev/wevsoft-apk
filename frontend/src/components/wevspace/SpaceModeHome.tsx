/**
 * Space soft-login Home — Facebook Page style:
 * same Wevsoft `/home` chrome + same network feed as personal Home
 * (posts / reels / marketplace / ads). Composer posts as the
 * active WevSpace; Friends stays personal-only.
 *
 * INSTANT-SWITCH: We build an optimistic SpacePublicPayload from the
 * SpaceIdentityOption (already in memory) so the timeline renders
 * immediately on the first paint — no loading spinner, no flicker.
 * The full payload is fetched in the background and replaces it silently
 * once it arrives.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  identityCanPost,
  type SpaceIdentityOption,
  type SpacePublicPayload,
} from '@wevsoft/shared/wevspace';
import { fetchSpaceByHandle } from '../../lib/wevspaceApi';
import SpaceHomeTimeline from './SpaceHomeTimeline';

type Props = {
  active: SpaceIdentityOption;
  /** When false, pause media (Home keep-alive). */
  mediaActive?: boolean;
  refreshKey?: number;
};

/**
 * Build a minimal SpacePublicPayload from the identity option so we can
 * render immediately without waiting for the API.
 */
function optimisticPayload(active: SpaceIdentityOption): SpacePublicPayload {
  return {
    id: active.id,
    handle: active.handle || '',
    name: active.name,
    spaceType: 'BUSINESS' as any,
    category: null,
    tagline: null,
    bio: null,
    description: null,
    avatar: active.avatar || null,
    cover: null,
    website: null,
    contactEmail: null,
    contactPhone: null,
    location: null,
    country: null,
    region: null,
    language: 'en',
    businessHours: null,
    themePreset: 'default',
    accentColor: null,
    ctaType: 'NONE',
    ctaLabel: null,
    ctaUrl: null,
    tabs: ['HOME', 'POSTS', 'ABOUT'] as any[],
    features: {} as any,
    featured: [],
    status: 'PUBLISHED',
    visibility: 'public',
    verificationStatus: active.verified ? 'VERIFIED' : 'NONE',
    followersCount: active.followersCount ?? null,
    postsCount: 0,
    reelsCount: 0,
    viewsCount: 0,
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    // Required by SpacePublicPayload — filled with empty values for the
    // optimistic render; replaced when the full payload arrives in background.
    owner: null,
    links: [],
  };
}

export default function SpaceModeHome({ active, mediaActive = true, refreshKey = 0 }: Props) {
  // Start with optimistic payload — renders instantly, no spinner
  const [space, setSpace] = useState<SpacePublicPayload>(() => optimisticPayload(active));
  const [feedKey, setFeedKey] = useState(0);
  const hasFull = useRef(false);

  const load = useCallback(async () => {
    if (!active.handle) return;
    try {
      const row = await fetchSpaceByHandle(active.handle);
      setSpace(row);
      hasFull.current = true;
    } catch {
      // Optimistic payload stays — timeline still works
    }
  }, [active.handle]);

  // On active change, reset to optimistic then fetch full data in background
  useEffect(() => {
    hasFull.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setSpace(optimisticPayload(active));
    void load();
  }, [active.id, active.handle]);  

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (refreshKey > 0) void load();
  }, [refreshKey]);  

  const bumpFeed = useCallback(() => setFeedKey((k) => k + 1), []);
  const canPost = identityCanPost(active);

  return (
    <SpaceHomeTimeline
      space={space}
      canPost={canPost}
      feedKey={feedKey + refreshKey}
      onPosted={bumpFeed}
      mediaActive={mediaActive}
      matchPersonalHome
    />
  );
}
