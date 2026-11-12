/**
 * Closed-state composer on Space Home — same compact bar as personal PostComposer.
 * Publishing stays Space-authored via ComposerSheet + createSpacePost.
 */

import { lazy, Suspense, useMemo, useState } from 'react';
import { Clapperboard, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';
import { resolveAvatarUrl } from '../UserAvatar';
import { ManageProvider, type ManageContextValue } from './manage/ManageContext';
import type { SpacePublicPayload } from '@wevsoft/shared/wevspace';

const ComposerSheet = lazy(() => import('./manage/ComposerSheet'));

type Props = {
  space: SpacePublicPayload;
  accent: string;
  canPublish?: boolean;
  canSchedule?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPosted?: () => void;
};

export default function SpaceHomeComposer({
  space,
  accent,
  canPublish = true,
  canSchedule = true,
  open: openProp,
  onOpenChange,
  onPosted,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolledOpen(next);
  };
  const avatar = resolveAvatarUrl(space.avatar);
  const firstName = space.name.split(/\s+/)[0] || space.name;

  const manageValue = useMemo<ManageContextValue>(
    () => ({
      space,
      spaceId: space.id,
      handle: space.handle,
      accent,
      permissions: {},
      features: (space.features || {}) as Record<string, boolean>,
      isOwner: !!space.viewer?.isOwner,
      role: space.viewer?.role || null,
      counts: {},
      recentActivity: [],
      standing: null,
      meta: null,
      section: 'content',
      refresh: async () => {},
      goto: () => {},
      can: () => true,
    }),
    [space, accent],
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="w-full bg-card/50 dark:bg-card/30 backdrop-blur-xl border border-border/70 dark:border-border/40 rounded-xl px-2.5 py-2 shadow-sm hover:border-purple-500/30 transition-all cursor-pointer group select-none"
        aria-label={`Create a post as ${space.name}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-border/80 p-[1px]"
            style={{ background: `linear-gradient(135deg, ${accent}, #a855f7)` }}
          >
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-bold text-[10px] text-foreground">
                {space.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 bg-muted/40 hover:bg-muted/70 border border-border/50 rounded-full px-3 py-1.5 text-muted-foreground transition-all text-xs font-medium flex items-center justify-between">
            <span className="truncate">What&apos;s on your mind, {firstName}?</span>
            <Sparkles
              size={13}
              className="text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
              aria-hidden
            />
          </div>
          <span className="shrink-0 p-1.5 rounded-full text-emerald-500" title="Photo" aria-hidden>
            <ImageIcon size={16} />
          </span>
          <span className="shrink-0 p-1.5 rounded-full text-fuchsia-500" title="Reel" aria-hidden>
            <Clapperboard size={16} />
          </span>
          <span className="shrink-0 p-1.5 rounded-full text-purple-400" title="Create" aria-hidden>
            <Wand2 size={15} />
          </span>
        </div>
        <p className="mt-1.5 px-0.5 text-[10px] font-bold text-muted-foreground/80">
          Posting as {space.name}
        </p>
      </div>

      {open && (
        <ManageProvider value={manageValue}>
          <Suspense fallback={null}>
            <ComposerSheet
              canPublish={canPublish}
              canSchedule={canSchedule}
              onClose={() => setOpen(false)}
              onSaved={() => {
                setOpen(false);
                onPosted?.();
              }}
            />
          </Suspense>
        </ManageProvider>
      )}
    </>
  );
}
