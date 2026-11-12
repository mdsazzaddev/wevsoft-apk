import React from 'react';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { AD_CTAS, AD_FORMATS, type AdCta, type AdFormat } from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../../../UserAvatar';

export interface AdsPreviewModel {
  format: AdFormat;
  spaceName: string;
  spaceAvatar?: string | null;
  handle?: string | null;
  primaryText: string;
  headline: string;
  cta: AdCta;
  mediaUrl?: string | null;
  accent?: string;
}

function ctaLabel(cta: AdCta) {
  return AD_CTAS.find((item) => item.id === cta)?.label || 'Learn more';
}

function FeedPreview({ model }: { model: AdsPreviewModel }) {
  const accent = model.accent || 'var(--primary)';
  const avatar = resolveAvatarUrl(model.spaceAvatar);
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden text-left">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : null}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold truncate">{model.spaceName || 'Your WevSpace'}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sponsored</p>
        </div>
      </div>
      {model.primaryText && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{model.primaryText}</p>}
      <div className="bg-muted aspect-[4/5] max-h-72 overflow-hidden">
        {model.mediaUrl ? (
          <img src={model.mediaUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[11px] font-bold text-muted-foreground">
            Add media to preview
          </div>
        )}
      </div>
      <button onClick={() => {}}
        type="button"
        className="w-full py-2.5 text-sm font-extrabold text-primary-foreground"
        style={{ background: accent }}
      >
        {ctaLabel(model.cta)}
      </button>
      {model.headline && (
        <p className="px-3 pt-2 text-xs font-bold text-muted-foreground">{model.headline}</p>
      )}
      <div className="flex items-center gap-4 px-3 py-2.5 text-muted-foreground">
        <Heart size={18} />
        <MessageCircle size={18} />
        <Send size={18} />
        <Bookmark size={18} className="ml-auto" />
      </div>
    </div>
  );
}

function ReelPreview({ model }: { model: AdsPreviewModel }) {
  const accent = model.accent || 'var(--primary)';
  return (
    <div className="mx-auto w-[220px] rounded-[1.6rem] border border-border bg-black overflow-hidden aspect-[9/16] relative text-white">
      {model.mediaUrl ? (
        <img src={model.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-80">Sponsored</p>
        <p className="mt-1 text-sm font-bold leading-snug line-clamp-3">
          {model.primaryText || 'Your reel caption'}
        </p>
        <button onClick={() => {}}
          type="button"
          className="mt-2 w-full py-2 rounded-xl text-xs font-extrabold text-primary-foreground"
          style={{ background: accent }}
        >
          {ctaLabel(model.cta)}
        </button>
      </div>
    </div>
  );
}

function StoryPreview({ model }: { model: AdsPreviewModel }) {
  const accent = model.accent || 'var(--primary)';
  return (
    <div className="mx-auto w-[200px] rounded-[1.6rem] border border-border bg-black overflow-hidden aspect-[9/16] relative text-white">
      {model.mediaUrl ? (
        <img src={model.mediaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}
      <div className="absolute top-3 left-3 right-3 h-0.5 rounded-full bg-white/40" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-center bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-[10px] font-extrabold uppercase tracking-wide opacity-80">Sponsored</p>
        <p className="mt-1 text-sm font-bold">{model.headline || model.spaceName}</p>
        <p className="mt-2 text-[11px] font-extrabold" style={{ color: accent }}>
          {ctaLabel(model.cta)} ↑
        </p>
      </div>
    </div>
  );
}

export default function AdsLivePreview({ model }: { model: AdsPreviewModel }) {
  const formatMeta = AD_FORMATS.find((item) => item.id === model.format);
  const placement = formatMeta?.placement || 'FEED';
  return (
    <div>
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {placement === 'REELS' ? 'Reels preview' : placement === 'STORY' ? 'Story preview' : 'Feed preview'}
      </p>
      {placement === 'REELS' ? (
        <ReelPreview model={model} />
      ) : placement === 'STORY' ? (
        <StoryPreview model={model} />
      ) : (
        <FeedPreview model={model} />
      )}
    </div>
  );
}
