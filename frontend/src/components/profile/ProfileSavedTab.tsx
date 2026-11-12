import React from 'react';
import { motion } from 'motion/react';
import { Book, Clapperboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TabSpinner from './TabSpinner';
import EmptyTab from './EmptyTab';
import { UnifiedPostCard } from '../feed/UnifiedFeed';

interface ProfileSavedTabProps {
  theme: any;
  profile: any;
  savedLoading: boolean;
  savedFetched: boolean;
  savedPosts: any[];
  savedReels: any[];
}

export default function ProfileSavedTab({
  theme, profile, savedLoading, savedFetched, savedPosts, savedReels
}: ProfileSavedTabProps) {
  const navigate = useNavigate();
  return (
<motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              {savedLoading && !savedFetched ? (
                <TabSpinner theme={theme} />
              ) : savedPosts.length === 0 && savedReels.length === 0 ? (
                <EmptyTab
                  theme={theme}
                  icon={Book}
                  title="No saved items"
                  subtitle="Posts you save from the feed will be collected here."
                />
              ) : (
                <div className="space-y-6">
                  {savedPosts.length > 0 && (
                    <div className="space-y-2 md:space-y-3 -mx-3 sm:-mx-6 md:-mx-8 lg:mx-0">
                      {savedPosts.map((post: any) => (
                        <UnifiedPostCard
                          key={post.id}
                          variant="card"
                          post={{ ...post, user: post.user || profile, userId: post.userId || profile.id }}
                        />
                      ))}
                    </div>
                  )}
                  {savedReels.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Clapperboard size={18} style={{ color: theme.accent }} />
                        <h3 className="text-lg font-bold">Saved reels</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                        {savedReels.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate('/reels')}
                            className="relative aspect-[9/16] min-h-[180px] rounded-2xl overflow-hidden bg-black"
                            style={{ border: `1px solid ${theme.accentBorder}` }}
                          >
                            {item.thumbnailUrl ? (
                              <img src={item.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : null}
                            {item.videoUrl ? (
                              <video src={item.videoUrl} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
  );
}
