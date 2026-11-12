import React from 'react';
import { motion } from 'motion/react';
import { Clapperboard, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TabSpinner from './TabSpinner';
import EmptyTab from './EmptyTab';

interface ProfileReelsTabProps {
  theme: any;
  activeTab: string;
  reelsLoading: boolean;
  reelsFetched: boolean;
  postsLoading: boolean;
  postsFetched: boolean;
  myReels: any[];
  videoItems: any[];
}

export default function ProfileReelsTab({
  theme, activeTab, reelsLoading, reelsFetched, postsLoading, postsFetched, myReels, videoItems
}: ProfileReelsTabProps) {
  const navigate = useNavigate();
  return (
<motion.div
              key="reels"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              {(reelsLoading && !reelsFetched) || (postsLoading && !postsFetched && myReels.length === 0 && videoItems.length === 0) ? (
                <TabSpinner theme={theme} />
              ) : (() => {
                // Prefer /api/reels/mine (dedicated reels + video posts); fall back to post videos
                const reelItems =
                  myReels.length > 0
                    ? myReels
                    : videoItems.map((item) => ({
                        id: item.post.id,
                        source: 'post' as const,
                        videoUrl: item.url,
                        caption: item.post.content || '',
                        createdAt: item.post.createdAt,
                      }));

                if (reelItems.length === 0) {
                  return (
                    <EmptyTab
                      theme={theme}
                      icon={Clapperboard}
                      title="No reels yet"
                      subtitle="Videos you upload as posts or reels will appear here and in the Reels section."
                    />
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Clapperboard size={18} style={{ color: theme.accent }} />
                        <h3 className="text-lg font-bold">{activeTab === 'videos' ? 'Videos' : 'Reels'}</h3>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {reelItems.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/reels')}
                        className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                        style={{ background: theme.accentLight, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}
                      >
                        Open Reels
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                      {reelItems.map((item: any, i: number) => (
                        <motion.button
                          key={`${item.source || 'post'}-${item.id}-${i}`}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate('/reels')}
                          className="relative aspect-[9/16] min-h-[180px] rounded-2xl overflow-hidden group bg-black text-left"
                          style={{ border: `1px solid ${theme.accentBorder}` }}
                        >
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          ) : null}
                          <video
                            src={item.videoUrl}
                            poster={item.thumbnailUrl || undefined}
                            muted
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                              <Play size={22} className="text-white ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                          {(item.caption || item.description) && (
                            <p className="absolute bottom-2 left-2 right-2 text-[11px] text-white line-clamp-2 drop-shadow">
                              {item.caption || item.description}
                            </p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </motion.div>
  );
}
