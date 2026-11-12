/**
 * Shown while lazy route chunks load: a static app-shell skeleton (top bar,
 * feed cards, bottom tabs) instead of an empty block, so there is no blank
 * screen between the launch splash and the real shell.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy="true" aria-label="Loading...">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
      <div className="mx-auto max-w-xl space-y-4 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/5 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="mt-4 h-40 rounded-xl bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 flex h-14 items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-6 rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
