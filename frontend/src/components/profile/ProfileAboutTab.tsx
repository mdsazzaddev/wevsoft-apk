import React from 'react';
import { motion } from 'motion/react';

import ProfileAboutLayout from './about/ProfileAboutLayout';
import ProfileMusicSection from './ProfileMusicSection';
import MusicPlaylistsPanel from './MusicPlaylistsPanel';
import ProfileWallSection from './ProfileWallSection';
import ProfileTestimonialsSection from './ProfileTestimonialsSection';

interface ProfileAboutTabProps {
  /** Kept for callers; the About layout uses theme tokens instead. */
  theme?: any;
  profile: any;
  isOwner?: boolean;
  onSave?: (patch: Record<string, unknown>) => Promise<void> | void;
}

/** About tab: Facebook-style section nav + the owner's music, wall and testimonials below it. */
export default function ProfileAboutTab({ profile, isOwner = true, onSave }: ProfileAboutTabProps) {
  return (
    <motion.div
      key="about"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <ProfileAboutLayout profile={profile} isOwner={isOwner} onSave={onSave} />
      <ProfileMusicSection userId={profile.id} isOwner={isOwner} />
      {isOwner && <MusicPlaylistsPanel />}
      <ProfileWallSection handle={profile.username || profile.profileSlug || profile.id} isOwner={isOwner} />
      <ProfileTestimonialsSection profileId={profile.id} isOwner={isOwner} />
    </motion.div>
  );
}
