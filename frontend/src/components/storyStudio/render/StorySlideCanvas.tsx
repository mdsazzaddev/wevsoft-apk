import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { buildFilterCss, temperatureTint, vignetteCss } from '../model/filters';
import { CANVAS_H, CANVAS_W, type Overlay } from '../model/types';
import { ensureStudioFonts } from './fonts';
import { PollOverlayView } from '../poll/PollStickerPreview';

/** The subset of a slide the renderer needs. Both the editor `Slide` and a parsed `StudioSlideConfig` fit. */
export interface RenderSlide {
  kind: 'media' | 'text';
  media?: { url: string; type: 'image' | 'video' } | null;
  bgColor: string;
  fit: 'cover' | 'contain';
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  zoom: number;
  offsetX: number;
  offsetY: number;
  filterId: string;
  filterIntensity: number;
  adjust: { brightness: number; contrast: number; saturation: number; temperature: number };
  effects: { vignette: number; grain: number };
  overlays: Overlay[];
}

export interface StorySlideCanvasHandle {
  video: HTMLVideoElement | null;
  scale: number;
}

interface Props {
  slide: RenderSlide;
  className?: string;
  style?: CSSProperties;
  /** Video control (editor/preview). The viewer drives `videoRef` itself. */
  playing?: boolean;
  /** Seek target (seconds) for video slides while paused/scrubbing. */
  time?: number;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  onVideoMeta?: (durationSec: number) => void;
  onVideoEnded?: () => void;
  onScale?: (scale: number) => void;
  /** Render in the 1080x1920 space above the overlays (selection handles etc.). */
  children?: ReactNode;
  /** Rendered in the 1080x1920 space below overlays but above media (e.g. nothing yet). */
  hideOverlayIds?: string[];
  draggable?: boolean;
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function overlayTextStyle(o: Overlay): CSSProperties {
  const style: CSSProperties = {
    fontFamily: `'${o.fontFamily}', Inter, system-ui, sans-serif`,
    fontSize: o.fontSize,
    fontWeight: o.bold ? 700 : 400,
    fontStyle: o.italic ? 'italic' : 'normal',
    textDecoration: o.underline ? 'underline' : 'none',
    textAlign: o.align,
    lineHeight: o.kind === 'sticker' ? 1 : 1.18,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxWidth: '100%',
    color: o.color,
  };
  if (o.outline) {
    style.WebkitTextStroke = `${Math.max(2, o.fontSize * 0.035)}px rgba(0,0,0,.9)`;
    (style as any).paintOrder = 'stroke fill';
  }
  if (o.gradient) {
    style.backgroundImage = 'linear-gradient(90deg,#fde047,#fb7185 50%,#a78bfa)';
    style.WebkitBackgroundClip = 'text';
    style.backgroundClip = 'text';
    style.WebkitTextFillColor = 'transparent';
    style.color = 'transparent';
  }
  if (o.shadow) style.filter = 'drop-shadow(0 6px 16px rgba(0,0,0,.55))';
  if (o.background && o.kind === 'text') {
    style.backgroundColor = o.bgColor;
    style.padding = `${Math.round(o.fontSize * 0.14)}px ${Math.round(o.fontSize * 0.3)}px`;
    style.borderRadius = Math.round(o.fontSize * 0.28);
    if (o.gradient) {
      style.backgroundImage = 'linear-gradient(90deg,#fde047,#fb7185 50%,#a78bfa)';
    }
  }
  return style;
}

function DrawOverlayView({ o }: { o: Overlay }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = o.strokes || [];

  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = Math.max(1, Math.round(o.w));
    c.height = Math.max(1, Math.round(o.h));
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const s of strokes) {
      if (!s.points.length) continue;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = s.width;
      ctx.globalCompositeOperation = s.eraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.eraser ? 'rgba(0,0,0,1)' : s.color;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      if (s.points.length === 1) {
        ctx.lineTo(s.points[0].x + 0.01, s.points[0].y);
      } else {
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [strokes, o.w, o.h]);

  return (
    <canvas
      ref={canvasRef}
      data-overlay-id={o.id}
      data-overlay-kind="draw"
      style={{
        position: 'absolute',
        left: o.x,
        top: o.y,
        width: o.w,
        height: o.h,
        opacity: o.opacity / 100,
        pointerEvents: 'none',
      }}
    />
  );
}

function formatCountdown(endsAt?: string): string {
  if (!endsAt) return '--:--:--';
  const ms = Date.parse(endsAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function ChipOverlayView({ o }: { o: Overlay }) {
  const st = o.sticker || {};
  if (o.kind === 'gif' && (st.gifUrl || st.gifPreview)) {
    return (
      <div
        data-overlay-id={o.id}
        data-overlay-kind="gif"
        style={{
          position: 'absolute',
          left: o.x,
          top: o.y,
          width: o.w,
          height: o.h,
          transform: `rotate(${o.rotation}deg)`,
          opacity: o.opacity / 100,
          pointerEvents: 'none',
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        <img src={st.gifPreview || st.gifUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  let title = o.text;
  let subtitle = '';
  if (o.kind === 'question') {
    title = 'Question';
    subtitle = st.prompt || o.text;
  } else if (o.kind === 'countdown') {
    title = st.title || o.text || 'Countdown';
    subtitle = formatCountdown(st.endsAt);
  } else if (o.kind === 'link') {
    title = '🔗 ' + (st.linkLabel || o.text || 'Link');
  } else if (o.kind === 'location') {
    title = '📍 ' + (st.placeName || o.text || 'Location');
  } else if (o.kind === 'music') {
    title = '♪ ' + (st.musicTitle || o.text || 'Music');
    subtitle = st.musicArtist || '';
  }

  return (
    <div
      data-overlay-id={o.id}
      data-overlay-kind={o.kind}
      style={{
        position: 'absolute',
        left: o.x,
        top: o.y,
        width: o.w,
        height: o.h,
        transform: `rotate(${o.rotation}deg)`,
        opacity: o.opacity / 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 20,
        boxSizing: 'border-box',
        borderRadius: 24,
        background: o.bgColor || '#111827',
        color: o.color || '#fff',
        pointerEvents: 'none',
        boxShadow: o.shadow ? '0 8px 24px rgba(0,0,0,.35)' : undefined,
        fontFamily: `'${o.fontFamily}', Inter, system-ui, sans-serif`,
      }}
    >
      <div style={{ fontSize: Math.min(o.fontSize, 40), fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: o.kind === 'countdown' ? 48 : 28, fontWeight: 600, textAlign: 'center', opacity: 0.95 }}>{subtitle}</div>
      ) : null}
      {o.kind === 'question' ? (
        <div
          style={{
            marginTop: 8,
            width: '90%',
            borderRadius: 16,
            background: 'rgba(255,255,255,.18)',
            padding: '14px 16px',
            fontSize: 22,
            textAlign: 'center',
          }}
        >
          Type something…
        </div>
      ) : null}
    </div>
  );
}

export function OverlayView({ o }: { o: Overlay }) {
  if (o.kind === 'poll' && o.poll) {
    return <PollOverlayView o={o} />;
  }
  if (o.kind === 'draw') {
    return <DrawOverlayView o={o} />;
  }
  if (o.kind === 'question' || o.kind === 'countdown' || o.kind === 'link' || o.kind === 'location' || o.kind === 'music' || o.kind === 'gif') {
    return <ChipOverlayView o={o} />;
  }
  const justify = o.align === 'left' ? 'flex-start' : o.align === 'right' ? 'flex-end' : 'center';
  const mention = o.meta?.type === 'mention';
  const hashtag = o.meta?.type === 'hashtag';
  return (
    <div
      data-overlay-id={o.id}
      data-overlay-meta={o.meta?.type || undefined}
      style={{
        position: 'absolute',
        left: o.x,
        top: o.y,
        width: o.w,
        height: o.h,
        transform: `rotate(${o.rotation}deg)`,
        opacity: o.opacity / 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          ...overlayTextStyle(o),
          ...(mention || hashtag
            ? {
                letterSpacing: hashtag ? '0.02em' : undefined,
                borderRadius: Math.round(o.fontSize * 0.35),
              }
            : null),
        }}
      >
        {o.text}
      </span>
    </div>
  );
}

const StorySlideCanvas = forwardRef<StorySlideCanvasHandle, Props>(function StorySlideCanvas(
  { slide, className, style, playing, time, muted = true, loop, autoPlay, onVideoMeta, onVideoEnded, onScale, children, hideOverlayIds, draggable },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(0.3);

  useImperativeHandle(ref, () => ({ video: videoRef.current, scale }), [scale]);

  useEffect(() => {
    ensureStudioFonts();
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setScale(w / CANVAS_W);
        onScale?.(w / CANVAS_W);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
     
  }, []);

  const isVideo = slide.media?.type === 'video';
  const mediaUrl = slide.media?.url || '';

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
      if (typeof time === 'number' && Math.abs(v.currentTime - time) > 0.15 && v.readyState >= 1) {
        try {
          v.currentTime = time;
        } catch {
          /* ignore */
        }
      }
    }
  }, [playing, time, isVideo, mediaUrl]);

  const odd = slide.rotate === 90 || slide.rotate === 270;
  const mediaBoxW = odd ? CANVAS_H : CANVAS_W;
  const mediaBoxH = odd ? CANVAS_W : CANVAS_H;
  const filter = buildFilterCss(slide);
  const tint = temperatureTint(slide.adjust.temperature);
  const vignette = vignetteCss(slide.effects);
  const grain = slide.effects.grain;

  const mediaStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: mediaBoxW,
    height: mediaBoxH,
    transform: `translate(-50%,-50%) translate(${slide.offsetX}px,${slide.offsetY}px) rotate(${slide.rotate}deg) scale(${slide.zoom * (slide.flipH ? -1 : 1)}, ${slide.zoom})`,
    objectFit: slide.fit,
    filter: filter === 'none' ? undefined : filter,
    userSelect: 'none',
  };

  return (
    <div
      ref={rootRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', background: slide.kind === 'text' ? slide.bgColor : slide.bgColor || '#000', ...style }}
      data-testid="story-slide-canvas"
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {slide.kind === 'media' && mediaUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              style={mediaStyle}
              muted={muted}
              loop={loop}
              autoPlay={autoPlay}
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                if (Number.isFinite(d) && d > 0) onVideoMeta?.(d);
              }}
              onEnded={onVideoEnded}
            />
          ) : (
            <img src={mediaUrl} alt="" style={mediaStyle} draggable={draggable ?? false} />
          )
        ) : null}

        {tint ? (
          <div style={{ position: 'absolute', inset: 0, background: tint.color, opacity: tint.opacity, mixBlendMode: 'soft-light', pointerEvents: 'none' }} />
        ) : null}
        {vignette ? <div style={{ position: 'absolute', inset: 0, background: vignette, pointerEvents: 'none' }} /> : null}
        {grain > 0 ? (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: (grain / 100) * 0.55, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
        ) : null}

        {slide.overlays
          .filter((o) => o.visible && !(hideOverlayIds || []).includes(o.id))
          .map((o) => (
            <OverlayView key={o.id} o={o} />
          ))}

        {children}
      </div>
    </div>
  );
});

export default StorySlideCanvas;
