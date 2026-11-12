import {
  Globe,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Monitor,
  Share2,
  Smartphone,
  Tablet,
} from 'lucide-react';
import type { PostLayoutTemplate } from '@wevsoft/shared/post-media-layout';
import { defaultLayoutForPhotoCount } from '@wevsoft/shared/post-media-layout';
import PostMediaLayout from '../social/PostMediaLayout';
import type { PreviewDevice, CreatePostLayoutKind, CommentAudience } from './types';
import { CREATE_POST_LAYOUTS } from './types';

function LayoutIcon({ kind, active }: { kind: CreatePostLayoutKind; active: boolean }) {
  const stroke = active ? 'stroke-primary' : 'stroke-muted-foreground';
  const common = `h-7 w-7 ${stroke}`;
  switch (kind) {
    case 'photo':
      return (
        <svg viewBox="0 0 28 28" className={common} fill="none">
          <rect x="4" y="6" width="20" height="16" rx="2" strokeWidth="1.6" />
          <circle cx="10" cy="12" r="2" strokeWidth="1.4" />
          <path d="M4 18l6-5 5 4 4-3 5 4" strokeWidth="1.4" />
        </svg>
      );
    case 'gallery':
      return (
        <svg viewBox="0 0 28 28" className={common} fill="none">
          <rect x="3" y="5" width="10" height="8" rx="1.5" strokeWidth="1.5" />
          <rect x="15" y="5" width="10" height="8" rx="1.5" strokeWidth="1.5" />
          <rect x="3" y="15" width="10" height="8" rx="1.5" strokeWidth="1.5" />
          <rect x="15" y="15" width="10" height="8" rx="1.5" strokeWidth="1.5" />
        </svg>
      );
    case 'video':
      return (
        <svg viewBox="0 0 28 28" className={common} fill="none">
          <rect x="4" y="7" width="20" height="14" rx="2" strokeWidth="1.6" />
          <path d="M12 11.5v5l5-2.5-5-2.5z" strokeWidth="1.4" fill="currentColor" className={active ? 'fill-primary' : 'fill-muted-foreground'} />
        </svg>
      );
    case 'link':
      return (
        <svg viewBox="0 0 28 28" className={common} fill="none">
          <rect x="5" y="6" width="18" height="16" rx="2" strokeWidth="1.6" />
          <path d="M9 11h10M9 15h7" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 28 28" className={common} fill="none">
          <rect x="5" y="5" width="18" height="18" rx="2" strokeWidth="1.6" />
          <path d="M9 11h10M9 15h10M9 19h6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

function renderCaption(text: string) {
  if (!text.trim()) {
    return <span className="text-muted-foreground">Your caption will appear here…</span>;
  }
  const parts = text.split(/(#[\w\u0980-\u09FF]+|@[\w.]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@')) {
      return (
        <span key={i} className="font-semibold text-sky-500">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function CreatePostLivePreview({
  device,
  onDeviceChange,
  authorName,
  authorAvatar,
  authorInitial,
  caption,
  previewUrls,
  audienceLabel,
  layoutKind,
  onLayoutKindChange,
  layoutTemplate = null,
  mediaKinds,
  commentsAudience,
  onCommentsAudienceChange,
  onOpenAudience,
  mediaFilters,
  hasVideo,
}: {
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  authorName: string;
  authorAvatar?: string | null;
  authorInitial: string;
  caption: string;
  previewUrls: string[];
  audienceLabel: string;
  layoutKind: CreatePostLayoutKind;
  onLayoutKindChange: (k: CreatePostLayoutKind) => void;
  layoutTemplate?: PostLayoutTemplate | null;
  mediaKinds?: Array<'image' | 'video' | undefined>;
  commentsAudience: CommentAudience;
  onCommentsAudienceChange: (v: CommentAudience) => void;
  onOpenAudience: () => void;
  mediaFilters?: Array<string | undefined>;
  hasVideo?: boolean;
}) {
  const frameClass =
    device === 'mobile'
      ? 'mx-auto w-full max-w-[320px]'
      : device === 'tablet'
        ? 'mx-auto w-full max-w-[480px]'
        : 'w-full max-w-none';

  const primaryMedia = previewUrls[0];
  const photoCount = previewUrls.filter((_, i) => mediaKinds?.[i] !== 'video').length;
  const useCollage = !hasVideo && photoCount >= 2;
  const resolvedTemplate =
    layoutTemplate || defaultLayoutForPhotoCount(photoCount) || undefined;
  const layoutMedia = previewUrls.map((url, i) => ({
    id: `preview-${i}`,
    url,
    type: mediaKinds?.[i] === 'video' ? 'video' : 'image',
    order: i,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-foreground">Live Preview</h2>
          <p className="text-[11px] text-muted-foreground">This is how your post will look on Wevsoft.</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-muted/70 p-1" role="group" aria-label="Preview device">
          {(
            [
              { id: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
              { id: 'tablet' as const, icon: Tablet, label: 'Tablet' },
              { id: 'desktop' as const, icon: Monitor, label: 'PC' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={device === id}
              onClick={() => onDeviceChange(id)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                device === id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
              }`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        <div className={frameClass}>
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2.5 px-3.5 py-3">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-muted ring-2 ring-border/60">
                {authorAvatar ? (
                  <img src={authorAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold">{authorInitial}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{authorName}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  Just now · <Globe size={11} className="opacity-70" /> {audienceLabel}
                </p>
              </div>
              <button type="button" className="rounded-full p-1.5 text-muted-foreground" aria-hidden tabIndex={-1}>
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="px-3.5 pb-2.5 text-[14px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {renderCaption(caption)}
            </div>

            {useCollage ? (
              <div className="bg-muted/30" data-testid="create-post-layout-preview">
                <PostMediaLayout media={layoutMedia} template={resolvedTemplate} autoplayEnabled={false} />
              </div>
            ) : primaryMedia ? (
              <div className={`relative bg-muted ${layoutKind === 'photo' ? 'aspect-[4/5]' : 'aspect-video'} overflow-hidden`}>
                {hasVideo && !primaryMedia.match(/\.(png|jpe?g|gif|webp|avif)(\?|$)/i) ? (
                  <video src={primaryMedia} className="h-full w-full object-cover" muted playsInline style={{ filter: mediaFilters?.[0] }} />
                ) : (
                  <img src={primaryMedia} alt="" className="h-full w-full object-cover" style={{ filter: mediaFilters?.[0] }} />
                )}
                {layoutKind === 'video' || hasVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow">
                      ▶
                    </div>
                  </div>
                ) : null}
              </div>
            ) : layoutKind === 'link' ? (
              <div className="mx-3.5 mb-3 overflow-hidden rounded-xl border border-border bg-muted/40">
                <div className="aspect-[2/1] bg-muted" />
                <div className="space-y-1 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Link preview</p>
                  <p className="text-sm font-semibold text-foreground">Paste a link in your caption</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-around border-t border-border/70 px-2 py-2">
              {[
                { icon: Heart, label: 'Like' },
                { icon: MessageCircle, label: 'Comment' },
                { icon: Share2, label: 'Share' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-muted-foreground"
                >
                  <Icon size={16} />
                  {label}
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Layout, audience and comment controls are automatic (hidden). */}
        <div className="mt-5 hidden space-y-3" aria-hidden>
          <div>
            <p className="mb-2 text-xs font-bold text-foreground">Post Layout</p>
            <div className="grid grid-cols-5 gap-2">
              {CREATE_POST_LAYOUTS.map((item) => {
                const active = layoutKind === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onLayoutKindChange(item.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    <LayoutIcon kind={item.id} active={active} />
                    <span className="text-[10px] font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAudience}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
          >
            <Globe size={16} className="text-muted-foreground" />
            <span className="flex-1">{audienceLabel}</span>
            <span className="text-muted-foreground">▾</span>
          </button>

          <label className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground">
            <MessageCircle size={16} className="text-muted-foreground" />
            <select
              className="flex-1 appearance-none bg-transparent outline-none"
              value={commentsAudience}
              onChange={(e) => onCommentsAudienceChange(e.target.value as CommentAudience)}
              aria-label="Who can comment"
            >
              <option value="everyone">Everyone</option>
              <option value="followers">Followers</option>
              <option value="friends">Friends</option>
              <option value="mentioned">People you mention</option>
              <option value="off">Comments off</option>
            </select>
            <span className="text-muted-foreground">▾</span>
          </label>
        </div>
      </div>
    </div>
  );
}