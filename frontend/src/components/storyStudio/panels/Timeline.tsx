import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Clock, ChevronDown, Eye, Film, Music, Pause, Play, Scissors, SkipBack, SkipForward, Smile, StepBack, StepForward, Trash2, Type, ZoomIn, ZoomOut, Shuffle } from 'lucide-react';
import StoryVideoThumb from '../../social/StoryVideoThumb';
import { buildFilterCss } from '../model/filters';
import { formatClock, slideDuration, slideOffsets } from '../model/timing';
import { overlayLabel } from '../model/types';
import { COMING_SOON, Slider, Tip } from './ui';
import { useStudio } from './StudioContext';

const LABEL_W = 132;

function ctl(extra = '') {
  return `flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--ss-text)] transition-colors hover:bg-[color:var(--ss-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${extra}`;
}

export default function Timeline({ compact }: { compact: boolean }) {
  const s = useStudio();
  const slides = s.state.doc.slides;
  const offsets = useMemo(() => slideOffsets(slides), [slides]);
  const areaRef = useRef<HTMLDivElement>(null);
  const [areaW, setAreaW] = useState(600);
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const [short, setShort] = useState(() => typeof window !== 'undefined' && window.innerHeight < 760);
  useEffect(() => {
    const h = () => setShort(window.innerHeight < 760);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const m = () => setAreaW(el.clientWidth);
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = s.total;
  // The scroll area keeps 12px right padding (`pr-3`); measure the tracks from the
  // content width so the padding never creates a permanent horizontal scrollbar.
  const areaPadR = 12;
  const trackW = Math.max(0, areaW - areaPadR);
  const base = Math.max(8, trackW / Math.max(total, 10));
  const pps = base * zoom;
  const width = Math.max(trackW, total * pps + 24);
  const timeAt = (clientX: number) => {
    const el = areaRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(total, (clientX - rect.left + el.scrollLeft) / pps));
  };
  const onScrub = (e: RPointerEvent) => {
    if (!slides.length) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    s.setPlaying(false);
    s.seek(timeAt(e.clientX));
  };
  const onScrubMove = (e: RPointerEvent) => {
    if (dragging.current) s.seek(timeAt(e.clientX));
  };
  const onScrubEnd = (e: RPointerEvent) => {
    dragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const idx = slides.findIndex((x) => x.id === s.state.selectedSlideId);
  const jump = (i: number) => {
    const t = offsets[Math.max(0, Math.min(slides.length - 1, i))] ?? 0;
    s.setPlaying(false);
    s.seek(t);
  };

  const tick = pps >= 40 ? 1 : pps >= 18 ? 2 : 5;
  const ticks: number[] = [];
  // Exclusive upper bound: a tick label centred on the very end of the ruler would
  // stick half its width past the track and force a horizontal scrollbar.
  for (let t = 0; t < Math.max(total, 10); t += tick) ticks.push(t);

    const hasOverlays = slides.some((x) => x.overlays.length > 0);
  const delSelectedOverlay = !!s.state.selectedOverlayId;
  const rowH = compact || short ? 34 : 46;
  const ovH = short || compact ? 24 : 30;
  const muH = short || compact ? 26 : 32;

  return (
    <section aria-label="Timeline" className="flex h-full min-h-0 flex-col rounded-2xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]" data-testid="ss-timeline">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2.5 md:px-4">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-[color:var(--ss-text)]">
          <Clock size={16} /> <span className={compact ? 'sr-only' : ''}>Timeline</span>
        </div>
        <span className="rounded-md px-1.5 text-[13px] tabular-nums text-[color:var(--ss-text)]" data-testid="ss-total-time" title="Total duration">{formatClock(total)}</span>
        <div className="mx-auto flex items-center gap-1">
          <Tip label="Go to start"><button type="button" aria-label="Go to start" disabled={!slides.length} onClick={() => { s.setPlaying(false); s.seek(0); }} className={ctl()}><SkipBack size={15} /></button></Tip>
          <Tip label="Previous slide"><button type="button" aria-label="Previous slide" disabled={!slides.length || idx <= 0} onClick={() => jump(idx - 1)} className={ctl()}><StepBack size={15} /></button></Tip>
          <button
            type="button"
            aria-label={s.playing ? 'Pause' : 'Play'}
            data-testid="ss-play"
            disabled={!slides.length}
            onClick={() => s.setPlaying(!s.playing)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ss-accent)] text-white shadow hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ss-accent)] disabled:opacity-40"
          >
            {s.playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
          </button>
          <Tip label="Next slide"><button type="button" aria-label="Next slide" disabled={!slides.length || idx >= slides.length - 1} onClick={() => jump(idx + 1)} className={ctl()}><StepForward size={15} /></button></Tip>
          <Tip label="Go to end"><button type="button" aria-label="Go to end" disabled={!slides.length} onClick={() => { s.setPlaying(false); s.seek(Math.max(0, total - 0.05)); }} className={ctl()}><SkipForward size={15} /></button></Tip>
        </div>
        <div className="flex items-center gap-1 text-[12px] font-medium text-[color:var(--ss-muted)]">
          <Tip label={`Split · ${COMING_SOON} (needs video trimming)`}>
            <button type="button" aria-disabled="true" className="hidden cursor-not-allowed items-center gap-1.5 rounded-md px-2 py-1 opacity-50 md:inline-flex"><Scissors size={14} /> Split</button>
          </Tip>
          <Tip label={delSelectedOverlay ? 'Delete selected layer' : 'Delete selected slide'}>
            <button
              type="button"
              aria-label={delSelectedOverlay ? 'Delete selected layer' : 'Delete selected slide'}
              disabled={!s.slide}
              onClick={() => {
                if (!s.slide) return;
                if (delSelectedOverlay) s.dispatch({ type: 'removeOverlay', slideId: s.slide.id, overlayId: s.state.selectedOverlayId! });
                else s.dispatch({ type: 'removeSlide', id: s.slide.id });
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)] disabled:opacity-40"
            >
              <Trash2 size={14} /> <span className="hidden md:inline">Delete</span>
            </button>
          </Tip>
          <Tip label={`Transitions · ${COMING_SOON}`}>
            <button type="button" aria-disabled="true" className="hidden cursor-not-allowed items-center gap-1.5 rounded-md px-2 py-1 opacity-50 lg:inline-flex"><Shuffle size={14} /> Transition</button>
          </Tip>
          <div className="ml-1 hidden items-center gap-1.5 md:flex">
            <ZoomOut size={13} />
            <div className="w-20"><Slider label="Timeline zoom" min={1} max={4} step={0.1} value={zoom} onChange={setZoom} /></div>
            <ZoomIn size={13} />
          </div>
        </div>
      </div>

      <div className="relative mt-1.5 flex min-h-0 flex-1">
        {!compact ? (
          <div className="shrink-0 pl-3 pt-[28px]" style={{ width: LABEL_W + 12 }}>
            {[
              { label: 'Video', icon: <Film size={14} />, h: rowH + 4 },
              { label: 'Text & Stickers', icon: <Type size={14} />, h: ovH },
              { label: 'Music', icon: <Music size={14} />, h: muH },
            ].map((r) => (
              <div key={r.label} className="mb-1.5 flex items-center justify-between rounded-lg bg-[color:var(--ss-field)] px-2 text-[11.5px] font-medium text-[color:var(--ss-text)]" style={{ height: r.h }}>
                <span className="flex items-center gap-1.5 truncate">{r.icon}{r.label}</span>
                <span className="flex items-center gap-1 text-[color:var(--ss-muted)]"><Eye size={12} /><ChevronDown size={12} /></span>
              </div>
            ))}
          </div>
        ) : null}

        <div ref={areaRef} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 pr-3 ss-scroll" onPointerDown={onScrub} onPointerMove={onScrubMove} onPointerUp={onScrubEnd} onPointerCancel={onScrubEnd} data-testid="ss-timeline-area">
          <div className="relative" style={{ width }}>
            <div className="relative h-[22px] select-none border-b border-[color:var(--ss-border)] text-[10px] text-[color:var(--ss-muted)]" aria-hidden>
              {ticks.map((t) => (
                <span key={t} className="absolute top-0 -translate-x-1/2" style={{ left: t * pps + 1 }}>
                  {t % (tick === 1 ? 5 : tick === 2 ? 10 : 5) === 0 ? formatClock(t) : ''}
                  <span className="absolute left-1/2 top-[14px] h-1.5 w-px bg-[color:var(--ss-border)]" />
                </span>
              ))}
            </div>

            <div className="relative mt-1.5 flex" style={{ height: rowH + 4 }} data-testid="ss-track-video">
              {slides.length === 0 ? (
                <div className="flex h-full w-full items-center rounded-lg border border-dashed border-[color:var(--ss-border)] px-3 text-[12px] text-[color:var(--ss-muted)]">Slides you add appear here as clips.</div>
              ) : (
                slides.map((sl, i) => {
                  const w = slideDuration(sl) * pps;
                  const active = sl.id === s.state.selectedSlideId;
                  const filter = buildFilterCss(sl);
                  return (
                    <button
                      key={sl.id}
                      type="button"
                      onClick={() => s.dispatch({ type: 'selectSlide', id: sl.id })}
                      data-testid="ss-clip"
                      aria-label={`Slide ${i + 1}, ${Math.round(slideDuration(sl))} seconds`}
                      aria-current={active}
                      className={`relative h-full shrink-0 overflow-hidden rounded-lg border-2 ${active ? 'border-[color:var(--ss-accent)]' : 'border-[color:var(--ss-border)]'}`}
                      style={{
                        width: w,
                        background: sl.kind === 'text' || !sl.media ? sl.bgColor : sl.media.type === 'image' ? `#000 url("${sl.media.url}") repeat-x left center / auto 100%` : '#000',
                        ...(sl.media?.type === 'image' && filter !== 'none' ? {} : {}),
                      }}
                    >
                      {sl.media?.type === 'video' ? <StoryVideoThumb url={sl.media.url} className="absolute inset-0 h-full w-full object-cover" /> : null}
                      {sl.kind === 'text' ? <span className="absolute inset-0 flex items-center justify-center truncate px-2 text-[11px] font-semibold text-white">{sl.overlays.find((o) => o.kind === 'text')?.text || 'Text slide'}</span> : null}
                      <span className="absolute bottom-0.5 left-1 rounded bg-black/60 px-1 text-[9.5px] font-semibold text-white">{i + 1} · {Math.round(slideDuration(sl))}s</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="relative mt-1.5 rounded-lg bg-[color:var(--ss-field)]" style={{ height: ovH }} data-testid="ss-track-overlays">
              {slides.flatMap((sl, i) => {
                const n = sl.overlays.length;
                if (!n) return [];
                const slotW = (slideDuration(sl) * pps) / n;
                return sl.overlays.map((o, j) => {
                  const sel = s.state.selectedOverlayId === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      data-testid="ss-overlay-clip"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        s.dispatch({ type: 'selectSlide', id: sl.id });
                        s.dispatch({ type: 'selectOverlay', id: o.id });
                      }}
                      title={overlayLabel(o)}
                      className={`absolute top-[3px] flex items-center gap-1 overflow-hidden rounded-md border px-1.5 text-[11px] font-medium ${sel ? 'border-[color:var(--ss-accent)] bg-[color:var(--ss-accent-soft)] text-[color:var(--ss-accent)]' : 'border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] text-[color:var(--ss-text)]'} ${o.visible ? '' : 'opacity-40'}`}
                      style={{ left: offsets[i] * pps + j * slotW + 2, width: Math.max(22, slotW - 4), height: ovH - 6 }}
                    >
                      {o.kind === 'sticker' ? <span>{o.text}</span> : <Type size={11} className="shrink-0" />}
                      {o.kind === 'text' ? <span className="truncate">{o.text}</span> : null}
                    </button>
                  );
                });
              })}
              {!hasOverlays ? <span className="pointer-events-none absolute inset-0 flex items-center px-3 text-[11.5px] text-[color:var(--ss-muted)]">Text and stickers you add appear here.</span> : null}
            </div>

            {!compact ? (
            <div className="relative mt-1.5 flex items-center gap-2 rounded-lg bg-[color:var(--ss-field)] px-3" style={{ height: muH }} data-testid="ss-track-music">
              <Music size={13} className="text-[color:var(--ss-muted)]" />
              <span className="text-[11.5px] text-[color:var(--ss-muted)]">No music added · music &amp; waveform editing is {COMING_SOON.toLowerCase()}</span>
            </div>
            ) : null}

            {slides.length ? (
              <div className="pointer-events-none absolute top-0 z-10 h-full w-px bg-[color:var(--ss-accent)]" style={{ left: s.time * pps + 1 }} data-testid="ss-playhead">
                <span className="absolute -left-[5px] top-0 h-3 w-[11px] rounded-b-md bg-[color:var(--ss-accent)]" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
