import StoryVideoThumb from '../../social/StoryVideoThumb';
import { buildFilterCss } from '../model/filters';
import type { Slide } from '../model/types';

/** Lightweight slide preview for lists and the timeline (no full renderer). */
export default function SlideThumb({ slide, className = '' }: { slide: Slide; className?: string }) {
  if (slide.kind === 'text' || !slide.media) {
    const first = slide.overlays.find((o) => o.kind === 'text')?.text || 'Aa';
    return (
      <div className={`flex items-center justify-center overflow-hidden text-center text-[10px] font-bold leading-tight text-white ${className}`} style={{ background: slide.bgColor }}>
        <span className="line-clamp-3 px-1">{first}</span>
      </div>
    );
  }
  const filter = buildFilterCss(slide);
  const style = { filter: filter === 'none' ? undefined : filter, objectFit: slide.fit } as const;
  if (slide.media.type === 'video') {
    return (
      <div className={`overflow-hidden bg-black ${className}`}>
        <StoryVideoThumb url={slide.media.url} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      <img src={slide.media.url} alt="" draggable={false} className="h-full w-full object-cover" style={style} loading="lazy" />
    </div>
  );
}
