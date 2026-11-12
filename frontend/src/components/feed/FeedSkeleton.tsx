import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import { Skeleton } from '../ui/Skeleton';

/** Skeleton placeholders for personal Home while the unified feed loads. */

function Pulse({ className = '' }: { className?: string }) {
  return <Skeleton className={`rounded-xl bg-muted/50 ${className}`} />;
};

export function FeedPostSkeleton() {
  return (
    <div
      className="rounded-none border-y border-border/50 bg-card px-3 py-4 md:rounded-3xl md:border md:border-border/60 md:px-4"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <Pulse className="h-10 w-10 !rounded-full" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-3 w-32" />
          <Pulse className="h-2.5 w-20" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-[85%]" />
      </div>
      <Pulse className="mt-4 h-48 w-full !rounded-2xl" />
      <div className="mt-3 flex gap-4">
        <Pulse className="h-3 w-12" />
        <Pulse className="h-3 w-12" />
        <Pulse className="h-3 w-12" />
      </div>
    </div>
  );
}

export function FeedReelsSkeleton() {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/50 p-3 sm:p-4" aria-hidden>
      <Pulse className="mb-3 h-4 w-28" />
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-[228px] w-[128px] shrink-0 !rounded-2xl sm:h-[267px] sm:w-[150px]" />
        ))}
      </div>
    </div>
  );
}

export function FeedMarketplaceSkeleton() {
  return (
    <div className="rounded-3xl border border-amber-500/20 bg-card/50 p-3 sm:p-4" aria-hidden>
      <Pulse className="mb-3 h-4 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Pulse className="aspect-square w-full !rounded-xl" />
            <Pulse className="h-3 w-3/4" />
            <Pulse className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeedSkeleton() {
  const { t } = useTranslation();
  const loadingLabel = trLabel(t, 'LoadingFeed', 'Loading feed');
  return (
    <div className="space-y-0 md:space-y-2" role="status" aria-live="polite" aria-label={loadingLabel}>
      <FeedPostSkeleton />
      <FeedReelsSkeleton />
      <FeedPostSkeleton />
      <FeedMarketplaceSkeleton />
      <span className="sr-only">Loading your feed…</span>
    </div>
  );
}
