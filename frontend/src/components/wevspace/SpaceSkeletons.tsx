/**
 * Loading placeholders for the WevSpace surfaces. Matching the real layout's
 * dimensions keeps the page from jumping when data arrives.
 */

/** `key?` is declared on the props of everything rendered in a list: this
 *  project ships no React types, so JSX does not exempt `key` on its own. */
function Shimmer({ className = '' }: { className?: string; key?: string | number }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}

export function SpaceCardSkeleton({ variant = 'compact' }: { key?: string | number; variant?: 'compact' | 'wide' } = {}) {
  const wide = variant === 'wide';
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <Shimmer className={`${wide ? 'h-32' : 'h-20'} rounded-none`} />
      <div className="px-4 pb-4">
        <Shimmer className={`${wide ? 'w-16 h-16 -mt-8' : 'w-14 h-14 -mt-7'} rounded-2xl border-[3px] border-card`} />
        <Shimmer className="h-4 w-2/3 mt-3" />
        <Shimmer className="h-3 w-1/3 mt-2" />
        <Shimmer className="h-3 w-full mt-3" />
        <Shimmer className="h-3 w-1/2 mt-2" />
      </div>
    </div>
  );
}

export function SpaceCardGridSkeleton({ count = 6, variant = 'compact' }: { count?: number; variant?: 'compact' | 'wide' }) {
  const wide = variant === 'wide';
  return (
    <div className={wide ? 'grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2' : 'grid gap-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]'}>
      {Array.from({ length: count }).map((_, i) => (
        <SpaceCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}

export function SpaceHeaderSkeleton() {
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <Shimmer className="h-32 sm:h-44 lg:h-56 rounded-none" />
      <div className="px-4 pb-5 sm:px-6">
        <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-5 -mt-12 sm:-mt-14">
          <Shimmer className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl border-4 border-card" />
          <div className="flex-1 w-full mt-3 sm:mt-0 space-y-2">
            <Shimmer className="h-6 w-48 mx-auto sm:mx-0" />
            <Shimmer className="h-3 w-32 mx-auto sm:mx-0" />
            <Shimmer className="h-3 w-56 mx-auto sm:mx-0" />
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
            <Shimmer className="h-10 w-full sm:w-28 rounded-2xl" />
            <Shimmer className="h-10 w-full sm:w-24 rounded-2xl" />
          </div>
        </div>
      </div>
      <div className="border-t border-border flex gap-2 px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-5 w-16" />
        ))}
      </div>
    </div>
  );
}

export function SpaceListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
          <Shimmer className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-1/3" />
            <Shimmer className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
