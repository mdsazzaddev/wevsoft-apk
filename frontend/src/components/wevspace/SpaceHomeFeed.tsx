/**
 * Public Space Home tab — same layout as personal `/home` and soft-login Space Home:
 * stories → composer (team) → unified feed.
 */

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { SpacePublicPayload, SpaceTab } from '@wevsoft/shared/wevspace';
import { SPACE_TAB_LABELS } from '@wevsoft/shared/wevspace';
import SpaceHomeTimeline from './SpaceHomeTimeline';
import SpaceAboutCard from './SpaceAboutCard';

type Props = {
  space: SpacePublicPayload;
  accent: string;
  canPost: boolean;
  tabs: SpaceTab[];
  completion: { percent: number; missing: string[] } | null;
  onCustomize: () => void;
  onOpenTab: (tab: SpaceTab) => void;
  /** When true, open the composer once after mount (wizard `?compose=1`). */
  autoCompose?: boolean;
};

export default function SpaceHomeFeed({
  space,
  accent,
  canPost,
  tabs,
  completion,
  onCustomize,
  onOpenTab,
  autoCompose = false,
}: Props) {
  const [feedKey, setFeedKey] = useState(0);
  const refresh = useCallback(() => setFeedKey((k) => k + 1), []);

  useEffect(() => {
    if (autoCompose && canPost) {
      // PostComposer opens itself; we just need to trigger a click or set state.
      // For now, we rely on the user clicking the composer bar.
    }
  }, [autoCompose, canPost]);

  return (
    // Desktop (lg+): About + section shortcuts in a sticky left column beside the
    // feed, so the full-width page uses its space. Below lg they sit under the feed.
    <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6 lg:items-start">
      <aside className="hidden lg:block lg:sticky lg:top-16 space-y-3">
        <SpaceAboutCard space={space} />
        {tabs.length > 1 && (
          <div className="bg-card border border-border rounded-3xl p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Explore</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tabs
                .filter((tab) => tab !== 'home')
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onOpenTab(tab)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    {SPACE_TAB_LABELS[tab]} <ArrowRight size={13} />
                  </button>
                ))}
            </div>
          </div>
        )}
      </aside>
    <SpaceHomeTimeline
      space={space}
      canPost={canPost}
      feedKey={feedKey}
      onPosted={refresh}
      showStories={false}
      className="pb-8 lg:max-w-none lg:mx-0 min-w-0"
      header={
        completion && completion.percent < 100 ? (
          <div className="bg-card border border-border rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-black text-base">
                <Sparkles size={16} style={{ color: accent }} /> Finish setting up
              </h2>
              <span className="text-xs font-black text-muted-foreground">{completion.percent}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${completion.percent}%`, background: accent }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Still missing: {completion.missing.join(', ')}.
            </p>
            <button
              type="button"
              onClick={onCustomize}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity"
            >
              Customize Space
            </button>
          </div>
        ) : null
      }
      footer={
        <div className="lg:hidden space-y-3">
          <SpaceAboutCard space={space} compact />
          {tabs.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {tabs
                .filter((tab) => tab !== 'home')
                .slice(0, 6)
                .map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onOpenTab(tab)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    {SPACE_TAB_LABELS[tab]} <ArrowRight size={13} />
                  </button>
                ))}
            </div>
          )}
        </div>
      }
    />
    </div>
  );
}
