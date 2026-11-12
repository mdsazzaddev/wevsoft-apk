/** Soft in-layout loading (not full-screen black — that blinks Home away). */
export default function OutletFallback() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse px-3 py-6" role="status" aria-label="Loading">
      <div className="mb-4 h-10 rounded-2xl bg-muted/60" />
      <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/40">
        <div className="flex items-center gap-3 p-4">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-2.5 w-1/4 rounded bg-muted/70" />
          </div>
        </div>
        <div className="mx-4 mb-4 h-40 rounded-2xl bg-muted/50" />
        <div className="space-y-2 px-4 pb-4">
          <div className="h-2.5 w-full rounded bg-muted/60" />
          <div className="h-2.5 w-5/6 rounded bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
