import { useLayoutEffect, useRef, useState } from 'react';
import StorySlideCanvas, { type RenderSlide } from './StorySlideCanvas';
import { parseStudioConfig } from '../model/serialize';

/** A 9:16 canvas that always fits (contain) inside whatever box it is placed in. */
type CanvasProps = Omit<React.ComponentProps<typeof StorySlideCanvas>, 'className' | 'style' | 'slide'>;
export default function FitStoryCanvas({
  slide,
  cover,
  children,
  ...rest
}: {
  slide: RenderSlide;
  /** Fill the box (crop) instead of fitting inside it. */
  cover?: boolean;
  children?: React.ReactNode;
} & CanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const m = () => setW(Math.max(0, cover ? Math.max(el.clientWidth, (el.clientHeight * 9) / 16) : Math.min(el.clientWidth, (el.clientHeight * 9) / 16)));
    m();
    const ro = new ResizeObserver(m);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cover]);
  return (
    <div ref={hostRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {w > 0 ? (
        <StorySlideCanvas slide={slide} {...rest} style={{ width: w, height: (w * 16) / 9, flexShrink: 0 }}>
          {children}
        </StorySlideCanvas>
      ) : null}
    </div>
  );
}

/** Build the renderer input for a published story from its stored StoryMedia row; null when it is not a studio story. */
export function studioSlideFromStory(media: { url?: string; type?: string; config?: string | null } | null | undefined): (RenderSlide & { duration: number }) | null {
  const cfg = parseStudioConfig(media?.config);
  if (!cfg) return null;
  const hasMedia = cfg.kind === 'media' && !!media?.url && (media.type === 'image' || media.type === 'video');
  return { ...cfg, media: hasMedia ? { url: media!.url!, type: media!.type as 'image' | 'video' } : null };
}
