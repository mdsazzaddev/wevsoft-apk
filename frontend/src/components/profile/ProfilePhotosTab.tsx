import React from 'react';
import { motion } from 'motion/react';
import { ImageIcon } from 'lucide-react';
import ProfileAlbumsSection from './ProfileAlbumsSection';
import TabSpinner from './TabSpinner';
import EmptyTab from './EmptyTab';

interface ProfilePhotosTabProps {
  theme: any;
  photoItems: any[];
  postsLoading: boolean;
  postsFetched: boolean;
  setPhotoLightboxIndex: (index: number) => void;
}

export default function ProfilePhotosTab({
  theme, photoItems, postsLoading, postsFetched, setPhotoLightboxIndex
}: ProfilePhotosTabProps) {
  return (
<motion.div
              key="photos"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <ProfileAlbumsSection canManage accent={theme.accent} />
              {postsLoading && !postsFetched ? (
                <TabSpinner theme={theme} />
              ) : photoItems.length === 0 ? (
                <EmptyTab
                  theme={theme}
                  icon={ImageIcon}
                  title="No photos yet"
                  subtitle="Photos from the posts you upload will be collected here."
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={18} style={{ color: theme.accent }} />
                    <h3 className="text-lg font-bold">Photos</h3>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {photoItems.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {photoItems.map((item, i) => (
                      <motion.button
                        key={`${item.post.id}-${i}`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setPhotoLightboxIndex(i)}
                        className="relative aspect-square rounded-2xl overflow-hidden group bg-muted"
                        style={{ border: `1px solid ${theme.accentBorder}` }}
                      >
                        <img
                          src={item.url}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
  );
}
