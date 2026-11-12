import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useStore } from '../../store';
import UserAvatar, { useResilientMediaSrc } from '../UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import StoryVideoThumb from './StoryVideoThumb';
import { useNavigate } from 'react-router-dom';
import FitStoryCanvas, { studioSlideFromStory } from '../storyStudio/render/FitStoryCanvas';
import { HOME_REFRESH_EVENT } from '../../lib/appNavigation';
import { shouldShowFloatingHeaderNav } from '../../lib/desktopHeaderNavFloating';

const StoryViewer = lazy(() => import('./StoryViewer'));
const StoryCreator = lazy(() => import('./StoryCreator'));

export type StoryBarSpace = {
  id: string;
  name: string;
  avatar?: string | null;
  handle?: string | null;
  canCreate?: boolean;
};

export default function StoryBar(props: {
  asSpace?: StoryBarSpace | null } = {}) {
  const { t } = useTranslation();
const { asSpace } = props;
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const showDesktopHeader = useStore((s) => s.showDesktopHeader);
  const desktopHeaderNavFloating = useStore((s) => s.desktopHeaderNavFloating);
  const [isDesktopMd, setIsDesktopMd] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktopMd(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  /** Floating shortcut row sits fixed at ~top-3 + h-10 — keep story bar below it on home/feed. */
  const belowFloatingNav = shouldShowFloatingHeaderNav({
    allowFloatingChrome: true,
    desktopHeaderNavFloating,
    showDesktopHeader,
    isDesktopMd,
  });
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStoryIdx, setViewingStoryIdx] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = asSpace ? asSpace.canCreate !== false : true;
  const createAvatarRaw = asSpace ? asSpace.avatar : user?.avatar;
  const {
    displaySrc: createAvatarSrc,
    onError: onCreateAvatarError,
    showImage: showCreateAvatar,
  } = useResilientMediaSrc(createAvatarRaw);
  const createInitial = asSpace
    ? asSpace.name?.charAt(0)?.toUpperCase() || 'S'
    : user?.name?.charAt(0)?.toUpperCase() || 'S';
  const scrollId = asSpace ? `story-bar-scroll-space-${asSpace.id}` : 'story-bar-scroll';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchStories();
  }, [token, asSpace?.id]);

  // Home pull-to-refresh / double-tap Home: reload stories along with the feed.
  useEffect(() => {
    const onRefresh = () => fetchStories({ silent: true });
    window.addEventListener(HOME_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(HOME_REFRESH_EVENT, onRefresh);
  }, [token, asSpace?.id]);

  /** `silent` keeps the current cards on screen (no skeleton flash) - used by pull-to-refresh. */
  const fetchStories = async (opts?: { silent?: boolean }) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const qs = asSpace?.id ? `?spaceId=${encodeURIComponent(asSpace.id)}` : '';
      const res = await fetch(`/api/stories${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStories(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = () => {
    if (!canCreate) return;
    // IG-style creator at /create-story; advanced studio remains at /story-studio.
    const qs = asSpace ? `?space=${encodeURIComponent(asSpace.id)}&name=${encodeURIComponent(asSpace.name)}` : '';
    navigate(`/create-story${qs}`);
  };

  const scrollLeft = () => {
    const el = document.getElementById(scrollId);
    if (el) el.scrollBy({ left: -280, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const el = document.getElementById(scrollId);
    if (el) el.scrollBy({ left: 280, behavior: 'smooth' });
  };

  return (
    <>
      {belowFloatingNav && !asSpace && (
        <div className="h-14 shrink-0 pointer-events-none" aria-hidden />
      )}
      <div
        className={`relative will-change-transform group/storybar sticky z-30 -mx-1 px-1 bg-background/95 backdrop-blur-md ${
          belowFloatingNav && !asSpace ? 'top-14' : 'top-0'
        }`}
      >
        <button
          type="button"
          onClick={scrollLeft}
          aria-label={trLabel(t, 'ScrollStoriesLeft', 'Scroll stories left')}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-background/90 backdrop-blur-xl rounded-full shadow-lg border border-border/80 hidden md:flex items-center justify-center hover:bg-card hover:scale-110 transition-[transform,background-color,border-color] duration-150 motion-reduce:transition-none text-foreground shadow-cyan-500/10 hover:border-cyan-500/50 opacity-0 group-hover/storybar:opacity-100"
        >
          <ChevronLeft size={18} className="text-cyan-400" />
        </button>

        <button
          type="button"
          onClick={scrollRight}
          aria-label={trLabel(t, 'ScrollStoriesRight', 'Scroll stories right')}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-background/90 backdrop-blur-xl rounded-full shadow-lg border border-border/80 hidden md:flex items-center justify-center hover:bg-card hover:scale-110 transition-[transform,background-color,border-color] duration-150 motion-reduce:transition-none text-foreground shadow-purple-500/10 hover:border-purple-500/50 opacity-0 group-hover/storybar:opacity-100"
        >
          <ChevronRight size={18} className="text-purple-400" />
        </button>

        <div
          id={scrollId}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pt-0 pb-0 px-1 snap-x select-none"
        >
          {canCreate ? (
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateStory}
              className="flex-shrink-0 w-28 h-44 sm:w-32 sm:h-52 rounded-2xl relative overflow-hidden cursor-pointer group snap-start bg-card/60 backdrop-blur-sm border border-border/70 dark:border-border/50 shadow-md shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-500/40 transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none"
              role="button"
              aria-label={asSpace ? `Add story as ${asSpace.name}` : trLabel(t, 'Add Story', 'Add Story')}
            >
              {showCreateAvatar ? (
                <img
                  src={createAvatarSrc!}
                  alt=""
                  loading="lazy"
                  onError={onCreateAvatarError}
                  className="w-full h-[68%] object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 group-hover:brightness-100"
                />
              ) : (
                <div className="w-full h-[68%] bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                  <span className="text-2xl font-black text-white italic drop-shadow-md">
                    {createInitial}
                  </span>
                </div>
              )}

              <div className="absolute bottom-0 w-full h-[32%] bg-card/90 backdrop-blur-md flex flex-col items-center justify-center pt-3 pb-1.5 border-t border-border/50">
                <div className="absolute -top-4 w-9 h-9 bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center border-2 border-card group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-cyan-400/40 transition-[transform,box-shadow] duration-150 motion-reduce:transition-none shadow-sm">
                  <Plus size={18} strokeWidth={3} />
                </div>
                <span className="text-[11px] font-extrabold text-foreground tracking-wide mt-1">
                  {trLabel(t, 'Add Story', 'Add Story')}
                </span>
              </div>
            </motion.div>
          ) : null}

          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-28 h-44 sm:w-32 sm:h-52 rounded-2xl bg-card/30 border border-border/50 animate-pulse snap-start relative overflow-hidden"
              >
                <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-muted/60" />
              </div>
            ))}

          {!loading &&
            stories.map((storyGroup, idx) => (
              <motion.div
                key={storyGroup.groupKey || storyGroup.user?.id || idx}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setViewingStoryIdx(idx)}
                className="flex-shrink-0 w-28 h-44 sm:w-32 sm:h-52 rounded-2xl relative overflow-hidden cursor-pointer group snap-start bg-card/60 backdrop-blur-sm border border-border/70 dark:border-border/50 shadow-md hover:shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-400/50 transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none"
              >
                {(() => {
                  const media = storyGroup.items[0]?.media?.[0];
                  const thumbClass =
                    'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500';
                  const studioSlide = media?.type === 'video' ? null : studioSlideFromStory(media);
                  if (studioSlide) {
                    return (
                      <div className="absolute inset-0">
                        <FitStoryCanvas slide={studioSlide} cover />
                      </div>
                    );
                  }
                  if (media?.type === 'video' && media?.url) {
                    return (
                      <StoryVideoThumb
                        url={media.url}
                        thumbnailUrl={media.thumbnailUrl}
                        config={media.config}
                        className={thumbClass}
                      />
                    );
                  }
                  if (media?.type === 'image' && media?.url) {
                    return <img src={media.url} alt="" loading="lazy" className={thumbClass} />;
                  }
                  return (
                    <div
                      className="w-full h-full p-3 flex flex-col items-center justify-center text-center text-white"
                      style={{
                        backgroundColor: storyGroup.items[0]?.backgroundColor || '#7c3aed',
                        fontFamily: storyGroup.items[0]?.fontFamily || 'inherit',
                      }}
                    >
                      <p className="text-xs font-extrabold line-clamp-4 drop-shadow-md leading-relaxed">
                        {storyGroup.items[0]?.content}
                      </p>
                    </div>
                  );
                })()}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-2.5 left-2.5 w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform">
                  <UserAvatar user={storyGroup.user} className="w-full h-full border border-card text-[11px]" />
                </div>

                <span className="absolute bottom-2.5 left-2.5 text-white text-[11px] font-extrabold truncate pr-2 drop-shadow-md tracking-wide z-10">
                  {storyGroup.sponsored
                    ? 'Sponsored'
                    : storyGroup.user?.name?.split(' ')[0] || 'User'}
                </span>
              </motion.div>
            ))}
        </div>

        <AnimatePresence>
          {isCreating && (
            <Suspense fallback={null}>
              <StoryCreator
                spaceId={asSpace?.id}
                spaceName={asSpace?.name}
                onClose={() => setIsCreating(false)}
                onSuccess={() => {
                  setIsCreating(false);
                  fetchStories();
                }}
              />
            </Suspense>
          )}
          {viewingStoryIdx !== null && (
            <Suspense fallback={null}>
              <StoryViewer
                storyGroups={stories}
                initialGroupIndex={viewingStoryIdx}
                onClose={() => setViewingStoryIdx(null)}
                onComplete={() => fetchStories()}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
