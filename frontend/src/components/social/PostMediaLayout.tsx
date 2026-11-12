import React from 'react';
import {
  cropToObjectPosition,
  parseMediaCropData,
  resolvePostLayout,
  type MediaCropRect,
  type PostLayoutTemplate,
} from '@wevsoft/shared/post-media-layout';
import { normalizeMediaType, type ResolvedMediaItem } from '../../lib/postMedia';
import FeedAutoplayVideo from './FeedAutoplayVideo';
import SafeImage from '../ui/SafeImage';

export interface PostMediaLayoutItem {
  id?: string;
  url: string;
  type?: string;
  order?: number;
  cropData?: string | MediaCropRect | null;
}

interface PostMediaLayoutProps {
  media: PostMediaLayoutItem[];
  /** Post.templateType — see POST_LAYOUT_TEMPLATES in @wevsoft/shared/post-media-layout */
  template?: string | null;
  legacyMedia?: string[];
  autoplayEnabled?: boolean;
  loopVideos?: boolean;
  pauseOnScrollAway?: boolean;
  onVideoClick?: (item: ResolvedMediaItem) => void;
  /** Photo / GIF click — opens gallery starting at this photo index (videos excluded). */
  onImageClick?: (index: number, photos: Array<ResolvedMediaItem & { crop: MediaCropRect | null }>) => void;
  /** Post soundtrack is playing — mute original clip audio when requested. */
  forceMuteVideos?: boolean;
  /** Hide per-video mute chip; post-level volume control owns mute. */
  hideVideoMuteControl?: boolean;
}

function resolveItems(
  media: PostMediaLayoutItem[] = [],
  legacyMedia: string[] = [],
): Array<ResolvedMediaItem & { crop: MediaCropRect | null }> {
  const fromRelation = [...media]
    .filter((m) => m?.url)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m) => {
      const raw = String(m.type || '').toLowerCase();
      // Explicit gif type must never enter the video / FeedAutoplayVideo path.
      const type =
        raw === 'gif' || raw === 'image/gif'
          ? ('image' as const)
          : normalizeMediaType(m.type, m.url);
      return {
        id: m.id,
        url: m.url,
        type,
        crop: parseMediaCropData(m.cropData),
      };
    });

  if (fromRelation.length > 0) return fromRelation;

  return legacyMedia.filter(Boolean).map((url) => ({
    url,
    type: normalizeMediaType(null, url),
    crop: null as MediaCropRect | null,
  }));
}

function Cell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-background ${className}`}>
      {children}
    </div>
  );
}

function MediaVisual({
  item,
  layout,
  imgClass = '',
  autoplayEnabled,
  loopVideos,
  pauseOnScrollAway,
  onVideoClick,
  onImageClick,
  forceMuteVideos,
  hideVideoMuteControl,
}: {
  item: ResolvedMediaItem & { crop: MediaCropRect | null };
  layout: 'natural' | 'fill';
  imgClass?: string;
  autoplayEnabled?: boolean;
  loopVideos?: boolean;
  pauseOnScrollAway?: boolean;
  onVideoClick?: (item: ResolvedMediaItem) => void;
  onImageClick?: () => void;
  forceMuteVideos?: boolean;
  hideVideoMuteControl?: boolean;
}) {
  // GIF / image always use <img> — never FeedAutoplayVideo (Tenor gif type, .gif URLs).
  if (item.type === 'video') {
    return (
      <FeedAutoplayVideo
        src={item.url}
        layout={layout}
        autoplayEnabled={!!autoplayEnabled}
        loop={!!loopVideos}
        pauseOnScrollAway={pauseOnScrollAway !== false}
        onOpen={onVideoClick ? () => onVideoClick(item) : undefined}
        forceMuted={!!forceMuteVideos}
        hideMuteControl={!!hideVideoMuteControl}
      />
    );
  }
  const objectPosition = cropToObjectPosition(item.crop);
  return (
    <SafeImage
      src={item.url}
      alt=""
      fallbackClassName="w-full h-full min-h-[200px]"
      iconSize={28}
      role={onImageClick ? 'button' : undefined}
      tabIndex={onImageClick ? 0 : undefined}
      onClick={
        onImageClick
          ? (e) => {
              e.stopPropagation();
              onImageClick();
            }
          : undefined
      }
      onKeyDown={
        onImageClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onImageClick();
              }
            }
          : undefined
      }
      className={`w-full h-full object-cover ${imgClass} ${onImageClick ? 'cursor-pointer' : ''}`}
      style={objectPosition ? { objectPosition } : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}

function LegacyCountLayout({
  display,
  render,
}: {
  display: Array<ResolvedMediaItem & { crop: MediaCropRect | null }>;
  render: (item: ResolvedMediaItem & { crop: MediaCropRect | null }, layout: 'natural' | 'fill', imgClass?: string) => React.ReactNode;
}) {
  if (display.length === 2) {
    return (
      <div className="w-full grid grid-cols-2 gap-1 bg-background max-h-[600px]">
        <Cell className="aspect-square sm:aspect-auto sm:h-[400px]">{render(display[0], 'fill')}</Cell>
        <Cell className="aspect-square sm:aspect-auto sm:h-[400px]">{render(display[1], 'fill')}</Cell>
      </div>
    );
  }

  if (display.length === 3) {
    return (
      <div className="w-full grid grid-cols-2 gap-1 bg-background h-[400px] sm:h-[500px]">
        <Cell className="col-span-2 row-span-1 h-[200px] sm:h-[250px]">{render(display[0], 'fill')}</Cell>
        <Cell className="h-[200px] sm:h-[250px]">{render(display[1], 'fill')}</Cell>
        <Cell className="h-[200px] sm:h-[250px]">{render(display[2], 'fill')}</Cell>
      </div>
    );
  }

  if (display.length === 4) {
    return (
      <div className="w-full grid grid-cols-2 gap-1 bg-background h-[400px] sm:h-[500px]">
        <Cell className="h-[200px] sm:h-[250px]">{render(display[0], 'fill')}</Cell>
        <Cell className="h-[200px] sm:h-[250px]">{render(display[1], 'fill')}</Cell>
        <Cell className="h-[200px] sm:h-[250px]">{render(display[2], 'fill')}</Cell>
        <Cell className="h-[200px] sm:h-[250px]">{render(display[3], 'fill')}</Cell>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-2 gap-1 bg-background h-[400px] sm:h-[500px]">
      <Cell className="col-span-2 h-[200px] sm:h-[250px]">{render(display[0], 'fill')}</Cell>
      <div className="grid grid-cols-3 gap-1 col-span-2 h-[200px] sm:h-[250px]">
        <Cell>{render(display[1], 'fill')}</Cell>
        <Cell>{render(display[2], 'fill')}</Cell>
        <Cell className="relative cursor-pointer">
          {render(display[3], 'fill')}
          {display.length > 4 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/50">
              <span className="text-3xl font-bold text-foreground dark:text-white">+{display.length - 4}</span>
            </div>
          )}
        </Cell>
      </div>
    </div>
  );
}

function TemplateLayout({
  layout,
  display,
  render,
}: {
  layout: PostLayoutTemplate;
  display: Array<ResolvedMediaItem & { crop: MediaCropRect | null }>;
  render: (item: ResolvedMediaItem & { crop: MediaCropRect | null }, mode: 'natural' | 'fill', imgClass?: string) => React.ReactNode;
}) {
  if (layout === 'carousel') {
    return (
      <div className="w-full border-y border-border bg-background max-h-[600px] overflow-x-auto snap-x flex">
        {display.map((item, index) => (
          <div
            key={item.id || index}
            className="min-w-full flex-shrink-0 snap-center flex items-center justify-center bg-background"
          >
            {render(item, item.type === 'video' ? 'natural' : 'fill', 'max-w-full max-h-[600px] object-contain')}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'split_2') {
    return (
      <div className="w-full grid grid-cols-2 gap-0.5 sm:gap-1 bg-background max-h-[600px]">
        <Cell className="aspect-[4/5] sm:aspect-auto sm:h-[420px]">{render(display[0], 'fill')}</Cell>
        <Cell className="aspect-[4/5] sm:aspect-auto sm:h-[420px]">{render(display[1], 'fill')}</Cell>
      </div>
    );
  }

  if (layout === 'main_2side') {
    const sideA = display[1];
    const sideB = display[2];
    return (
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-1 bg-background h-auto sm:h-[480px]">
        <Cell className="sm:col-span-2 aspect-[4/5] sm:aspect-auto sm:h-full min-h-[220px]">
          {render(display[0], 'fill')}
        </Cell>
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-0.5 sm:gap-1 sm:h-full">
          <Cell className="aspect-square sm:aspect-auto sm:h-full min-h-[140px]">{render(sideA, 'fill')}</Cell>
          <Cell className="aspect-square sm:aspect-auto sm:h-full min-h-[140px]">{render(sideB, 'fill')}</Cell>
        </div>
      </div>
    );
  }

  if (layout === 'column') {
    // “Columns” icon style: 2–4 vertical panels, middle taller / staggered.
    const cols = display.slice(0, Math.min(4, Math.max(2, display.length)));
    const extra = display.length > cols.length ? display.length - cols.length : 0;
    const n = cols.length;
    const heightFor = (index: number) => {
      if (n === 2) return index === 0 ? 'h-[88%]' : 'h-[76%]';
      if (n === 3) {
        if (index === 1) return 'h-[96%]';
        return 'h-[78%]';
      }
      // 4 cols — peak on 2nd panel
      if (index === 1) return 'h-[96%]';
      if (index === 2) return 'h-[84%]';
      return 'h-[72%]';
    };
    return (
      <div className="w-full flex flex-row items-end gap-0.5 sm:gap-1 bg-background h-[300px] sm:h-[460px] overflow-hidden px-0.5 pb-1 pt-2">
        {cols.map((item, index) => (
          <Cell
            key={item.id || index}
            className={`relative min-w-0 flex-1 rounded-md sm:rounded-lg ${heightFor(index)}`}
          >
            {render(item, 'fill')}
            {extra > 0 && index === cols.length - 1 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'row') {
    // Filmstrip: equal-height columns that fully fill the frame (no floating gaps).
    const strip = display.slice(0, 6);
    const extra = display.length > 6 ? display.length - 6 : 0;
    return (
      <div className="w-full flex flex-row items-stretch gap-0.5 sm:gap-1 bg-background h-[260px] sm:h-[360px] max-h-[420px] overflow-hidden">
        {strip.map((item, index) => (
          <Cell key={item.id || index} className="relative min-h-0 min-w-0 flex-1 h-full">
            {render(item, 'fill')}
            {extra > 0 && index === strip.length - 1 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'frame') {
    const hero = display[0];
    const accents = display.slice(1);
    const pick = (i: number) => accents[i % Math.max(accents.length, 1)] || hero;
    const ringSlots = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => pick(i));
    return (
      <div className="w-full relative bg-background aspect-[4/5] sm:aspect-[5/4] max-h-[600px] overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1">
          {ringSlots.slice(0, 3).map((item, i) => (
            <Cell key={`ft-${i}`} className="min-h-0">
              {render(item, 'fill')}
            </Cell>
          ))}
          <Cell className="min-h-0">{render(ringSlots[3], 'fill')}</Cell>
          <div className="min-h-0" aria-hidden />
          <Cell className="min-h-0">{render(ringSlots[4], 'fill')}</Cell>
          {ringSlots.slice(5, 8).map((item, i) => (
            <Cell key={`fb-${i}`} className="min-h-0">
              {render(item, 'fill')}
            </Cell>
          ))}
        </div>
        <div className="absolute inset-[16%] sm:inset-[18%] z-[1] overflow-hidden rounded-sm ring-2 ring-background shadow-lg">
          <Cell className="w-full h-full">{render(hero, 'fill')}</Cell>
        </div>
      </div>
    );
  }

  if (layout === 'feature_stick') {
    const hero = display[0];
    const stickA = display[1] || hero;
    const stickB = display[2] || display[1] || hero;
    const stickC = display[3] || null;
    return (
      <div className="w-full relative bg-gradient-to-br from-muted/40 to-background aspect-[4/5] sm:aspect-[5/4] max-h-[600px] overflow-hidden">
        <div className="absolute left-2 top-2 bottom-2 right-[34%] sm:right-[32%] overflow-hidden rounded-xl shadow-md ring-1 ring-border/60 z-[1]">
          <Cell className="w-full h-full">{render(hero, 'fill')}</Cell>
        </div>
        <div className="absolute right-3 top-4 w-[36%] sm:w-[34%] aspect-[3/4] overflow-hidden rounded-lg shadow-xl ring-2 ring-white/90 dark:ring-background rotate-[6deg] z-[2]">
          <Cell className="w-full h-full">{render(stickA, 'fill')}</Cell>
        </div>
        <div className="absolute right-2 bottom-5 w-[34%] sm:w-[32%] aspect-[3/4] overflow-hidden rounded-lg shadow-xl ring-2 ring-white/90 dark:ring-background -rotate-[5deg] z-[3]">
          <Cell className="w-full h-full">{render(stickB, 'fill')}</Cell>
        </div>
        {stickC && (
          <div className="absolute right-[18%] top-1/2 -translate-y-1/2 w-[22%] aspect-square overflow-hidden rounded-md shadow-lg ring-2 ring-white/80 dark:ring-background rotate-[12deg] z-[4]">
            <Cell className="w-full h-full">{render(stickC, 'fill')}</Cell>
          </div>
        )}
      </div>
    );
  }

  if (layout === 'mosaic') {
    const hero = display[0];
    const a = display[1] || hero;
    const b = display[2] || a;
    const c = display[3] || null;
    const d = display[4] || null;
    const extra = display.length > 5 ? display.length - 5 : 0;
    const hasBottom = !!c;
    return (
      <div className="w-full bg-background max-h-[640px] overflow-hidden">
        <div
          className={`grid grid-cols-3 gap-0.5 sm:gap-1 aspect-[4/5] sm:aspect-[5/4] ${
            hasBottom
              ? 'grid-rows-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)]'
              : 'grid-rows-2'
          }`}
        >
          <Cell className="col-span-2 row-span-2 min-h-0">{render(hero, 'fill')}</Cell>
          <Cell className="min-h-0">{render(a, 'fill')}</Cell>
          <Cell className="min-h-0 relative">
            {render(b, 'fill')}
            {!c && extra > 0 && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-bold">
                +{extra}
              </div>
            )}
          </Cell>
          {c && (
            <Cell className={`min-h-0 ${d ? 'col-span-2' : 'col-span-3'} relative`}>
              {render(c, 'fill')}
              {!d && extra > 0 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-bold">
                  +{extra}
                </div>
              )}
            </Cell>
          )}
          {d && (
            <Cell className="min-h-0 relative">
              {render(d, 'fill')}
              {extra > 0 && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-sm font-bold">
                  +{extra}
                </div>
              )}
            </Cell>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'triptych') {
    const cells = display.slice(0, 3);
    return (
      <div className="w-full flex flex-col gap-0.5 sm:gap-1 bg-background h-[360px] sm:h-[540px]">
        {cells.map((item, index) => (
          <Cell key={item.id || index} className="min-h-0 flex-1">
            {render(item, 'fill')}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'hero_strip') {
    const hero = display[0];
    const strip = display.slice(1, 5);
    const extra = display.length > 5 ? display.length - 5 : 0;
    return (
      <div className="w-full grid grid-rows-[minmax(0,2.2fr)_minmax(0,1fr)] gap-0.5 sm:gap-1 bg-background h-[360px] sm:h-[520px]">
        <Cell className="min-h-0">{render(hero, 'fill')}</Cell>
        <div className="grid min-h-0 grid-cols-4 gap-0.5 sm:gap-1">
          {strip.map((item, index) => (
            <Cell key={item.id || index} className="relative min-h-0">
              {render(item, 'fill')}
              {extra > 0 && index === strip.length - 1 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                  +{extra}
                </div>
              ) : null}
            </Cell>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'l_shape') {
    const a = display[0];
    const b = display[1] || a;
    const c = display[2] || b;
    const extra = display.length > 3 ? display.length - 3 : 0;
    return (
      <div className="w-full grid grid-cols-2 grid-rows-2 gap-0.5 sm:gap-1 bg-background h-[320px] sm:h-[480px]">
        <Cell className="row-span-2 min-h-0">{render(a, 'fill')}</Cell>
        <Cell className="min-h-0">{render(b, 'fill')}</Cell>
        <Cell className="relative min-h-0">
          {render(c, 'fill')}
          {extra > 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
              +{extra}
            </div>
          ) : null}
        </Cell>
      </div>
    );
  }

  if (layout === 'magazine') {
    const hero = display[0];
    const a = display[1] || hero;
    const b = display[2] || a;
    const c = display[3] || null;
    return (
      <div
        className={`w-full grid grid-cols-3 gap-0.5 sm:gap-1 bg-background h-[340px] sm:h-[500px] ${
          c ? 'grid-rows-[minmax(0,1.6fr)_minmax(0,1fr)]' : 'grid-rows-1'
        }`}
      >
        <Cell className={`${c ? 'row-span-1' : 'row-span-1'} col-span-2 min-h-0 h-full`}>
          {render(hero, 'fill')}
        </Cell>
        <div className="grid min-h-0 grid-rows-2 gap-0.5 sm:gap-1">
          <Cell className="min-h-0">{render(a, 'fill')}</Cell>
          <Cell className="min-h-0">{render(b, 'fill')}</Cell>
        </div>
        {c ? (
          <Cell className="col-span-3 min-h-0 relative">
            {render(c, 'fill')}
            {display.length > 4 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{display.length - 4}
              </div>
            ) : null}
          </Cell>
        ) : null}
      </div>
    );
  }

  if (layout === 'brick') {
    const cells = display.slice(0, 6);
    const extra = display.length > 6 ? display.length - 6 : 0;
    return (
      <div className="w-full grid grid-cols-2 gap-0.5 sm:gap-1 bg-background auto-rows-[minmax(110px,1fr)] sm:auto-rows-[minmax(150px,1fr)] max-h-[560px] overflow-hidden">
        {cells.map((item, index) => (
          <Cell
            key={item.id || index}
            className={`relative min-h-0 ${index % 3 === 0 ? 'row-span-2 min-h-[220px] sm:min-h-[300px]' : 'min-h-[110px] sm:min-h-[150px]'}`}
          >
            {render(item, 'fill')}
            {extra > 0 && index === cells.length - 1 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'spotlight') {
    const left = display[0];
    const hero = display[1] || left;
    const right = display[2] || hero;
    const extra = display.length > 3 ? display.length - 3 : 0;
    return (
      <div className="w-full grid grid-cols-[1fr_1.4fr_1fr] gap-0.5 sm:gap-1 bg-background h-[300px] sm:h-[440px]">
        <Cell className="min-h-0">{render(left, 'fill')}</Cell>
        <Cell className="relative min-h-0 ring-2 ring-background z-[1] scale-[1.02]">
          {render(hero, 'fill')}
          {extra > 0 ? (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
              +{extra}
            </div>
          ) : null}
        </Cell>
        <Cell className="min-h-0">{render(right, 'fill')}</Cell>
      </div>
    );
  }

  if (layout === 'banner_duo') {
    const banner = display[0];
    const a = display[1] || banner;
    const b = display[2] || a;
    const extra = display.length > 3 ? display.length - 3 : 0;
    return (
      <div className="w-full grid grid-rows-[minmax(0,1.35fr)_minmax(0,1fr)] gap-0.5 sm:gap-1 bg-background h-[320px] sm:h-[480px]">
        <Cell className="min-h-0">{render(banner, 'fill')}</Cell>
        <div className="grid min-h-0 grid-cols-2 gap-0.5 sm:gap-1">
          <Cell className="min-h-0">{render(a, 'fill')}</Cell>
          <Cell className="relative min-h-0">
            {render(b, 'fill')}
            {extra > 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        </div>
      </div>
    );
  }

  if (layout === 'quad_hero') {
    const hero = display[0];
    const sides = display.slice(1, 4);
    const extra = display.length > 4 ? display.length - 4 : 0;
    return (
      <div className="w-full grid grid-cols-3 grid-rows-3 gap-0.5 sm:gap-1 bg-background h-[340px] sm:h-[500px]">
        <Cell className="col-span-2 row-span-3 min-h-0">{render(hero, 'fill')}</Cell>
        {sides.map((item, index) => (
          <Cell key={item.id || index} className="relative min-h-0">
            {render(item, 'fill')}
            {extra > 0 && index === sides.length - 1 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'waterfall') {
    const left = display.filter((_, i) => i % 2 === 0).slice(0, 3);
    const right = display.filter((_, i) => i % 2 === 1).slice(0, 3);
    const shown = left.length + right.length;
    const extra = display.length > shown ? display.length - shown : 0;
    return (
      <div className="w-full grid grid-cols-2 gap-0.5 sm:gap-1 bg-background max-h-[560px] overflow-hidden">
        <div className="flex min-h-0 flex-col gap-0.5 sm:gap-1">
          {left.map((item, index) => (
            <Cell
              key={item.id || `L-${index}`}
              className={`min-h-0 ${index === 0 ? 'aspect-[4/5]' : 'aspect-square'}`}
            >
              {render(item, 'fill')}
            </Cell>
          ))}
        </div>
        <div className="flex min-h-0 flex-col gap-0.5 sm:gap-1 pt-6 sm:pt-10">
          {right.map((item, index) => (
            <Cell
              key={item.id || `R-${index}`}
              className={`relative min-h-0 ${index === right.length - 1 ? 'aspect-[4/5]' : 'aspect-square'}`}
            >
              {render(item, 'fill')}
              {extra > 0 && index === right.length - 1 ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                  +{extra}
                </div>
              ) : null}
            </Cell>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'diagonal') {
    const cells = display.slice(0, 4);
    return (
      <div className="w-full relative bg-muted/30 aspect-[5/4] max-h-[520px] overflow-hidden">
        {cells.map((item, index) => {
          const poses = [
            'left-[2%] top-[4%] w-[48%] h-[58%] -rotate-2',
            'right-[3%] top-[8%] w-[46%] h-[52%] rotate-3',
            'left-[8%] bottom-[4%] w-[44%] h-[42%] rotate-1',
            'right-[6%] bottom-[6%] w-[42%] h-[40%] -rotate-2',
          ];
          return (
            <div
              key={item.id || index}
              className={`absolute overflow-hidden rounded-xl shadow-lg ring-2 ring-background ${poses[index] || poses[0]}`}
              style={{ zIndex: index + 1 }}
            >
              <Cell className="h-full w-full">{render(item, 'fill')}</Cell>
            </div>
          );
        })}
      </div>
    );
  }

  if (layout === 'cluster') {
    const cells = display.slice(0, 5);
    const poses = [
      'left-[18%] top-[10%] w-[58%] h-[68%] rotate-[-2deg] z-[3]',
      'left-[4%] top-[18%] w-[34%] h-[42%] rotate-[-8deg] z-[2]',
      'right-[5%] top-[14%] w-[32%] h-[40%] rotate-[7deg] z-[2]',
      'left-[10%] bottom-[6%] w-[30%] h-[34%] rotate-[4deg] z-[4]',
      'right-[8%] bottom-[8%] w-[28%] h-[32%] rotate-[-5deg] z-[4]',
    ];
    return (
      <div className="w-full relative bg-gradient-to-br from-muted/50 to-background aspect-[5/4] max-h-[520px] overflow-hidden">
        {cells.map((item, index) => (
          <div
            key={item.id || index}
            className={`absolute overflow-hidden rounded-lg shadow-xl ring-2 ring-white/90 dark:ring-background ${poses[index]}`}
          >
            <Cell className="h-full w-full">{render(item, 'fill')}</Cell>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'windowpane') {
    const cells = display.slice(0, 4);
    const extra = display.length > 4 ? display.length - 4 : 0;
    return (
      <div className="w-full grid grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5 bg-background p-1 sm:p-1.5 h-[320px] sm:h-[480px] rounded-xl ring-1 ring-border/60">
        {cells.map((item, index) => (
          <Cell key={item.id || index} className="relative min-h-0 rounded-md">
            {render(item, 'fill')}
            {extra > 0 && index === 3 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </Cell>
        ))}
      </div>
    );
  }

  if (layout === 'captain') {
    const hero = display[0];
    const c = [display[1], display[2], display[3], display[4]].map((x) => x || hero);
    const extra = display.length > 5 ? display.length - 5 : 0;
    return (
      <div className="w-full grid grid-cols-3 grid-rows-3 gap-0.5 sm:gap-1 bg-background h-[340px] sm:h-[500px]">
        <Cell className="min-h-0">{render(c[0], 'fill')}</Cell>
        <Cell className="min-h-0">{render(c[1], 'fill')}</Cell>
        <Cell className="min-h-0">{render(c[2], 'fill')}</Cell>
        <Cell className="min-h-0">{render(c[3], 'fill')}</Cell>
        <Cell className="relative min-h-0 scale-[1.03] z-[1] ring-2 ring-background shadow-md">
          {render(hero, 'fill')}
          {extra > 0 ? (
            <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
              +{extra}
            </div>
          ) : null}
        </Cell>
        <Cell className="min-h-0">{render(display[5] || c[0], 'fill')}</Cell>
        <Cell className="min-h-0">{render(display[6] || c[1], 'fill')}</Cell>
        <Cell className="min-h-0">{render(display[7] || c[2], 'fill')}</Cell>
        <Cell className="min-h-0">{render(display[8] || c[3], 'fill')}</Cell>
      </div>
    );
  }

  // grid_4 (default)
  const cells = display.slice(0, 4);
  return (
    <div className="w-full grid grid-cols-2 gap-0.5 sm:gap-1 bg-background h-[360px] sm:h-[500px]">
      {cells.map((item, index) => (
        <Cell key={item.id || index} className="h-full min-h-0">
          {render(item, 'fill')}
        </Cell>
      ))}
    </div>
  );
}

/**
 * Single feed renderer for multi-photo layouts.
 * All surfaces (home, profile, UnifiedFeed, WevSpace) must use this — do not duplicate grids.
 */
export default function PostMediaLayout({
  media = [],
  template = null,
  legacyMedia = [],
  autoplayEnabled = false,
  loopVideos = true,
  pauseOnScrollAway = true,
  onVideoClick,
  onImageClick,
  forceMuteVideos = false,
  hideVideoMuteControl = false,
}: PostMediaLayoutProps) {
  const display = resolveItems(media, legacyMedia);
  if (display.length === 0) return null;

  const photos = display.filter((d) => d.type !== 'video');

  const render = (
    item: ResolvedMediaItem & { crop: MediaCropRect | null },
    layout: 'natural' | 'fill',
    imgClass = '',
  ) => (
    <MediaVisual
      item={item}
      layout={layout}
      imgClass={imgClass}
      autoplayEnabled={autoplayEnabled}
      loopVideos={loopVideos}
      pauseOnScrollAway={pauseOnScrollAway}
      onVideoClick={onVideoClick}
      onImageClick={
        onImageClick && item.type !== 'video'
          ? () => {
              const idx = photos.indexOf(item);
              onImageClick(idx >= 0 ? idx : 0, photos);
            }
          : undefined
      }
      forceMuteVideos={forceMuteVideos}
      hideVideoMuteControl={hideVideoMuteControl}
    />
  );

  if (display.length === 1) {
    const only = display[0];
    if (only.type === 'video') {
      return (
        <div className="w-full max-h-[min(60vh,560px)] overflow-hidden bg-background flex justify-center">
          {render(only, 'natural')}
        </div>
      );
    }
    return (
      <div className="w-full max-h-[600px] overflow-hidden bg-background flex justify-center">
        {render(only, 'fill', 'max-w-full max-h-[600px] object-contain')}
      </div>
    );
  }

  const resolved = resolvePostLayout(template, display.length);

  if (resolved && resolved !== 'legacy_grid') {
    return <TemplateLayout layout={resolved} display={display} render={render} />;
  }

  // Explicit legacy carousel string still used by older clients
  if (template === 'carousel') {
    return <TemplateLayout layout="carousel" display={display} render={render} />;
  }

  return <LegacyCountLayout display={display} render={render} />;
}
