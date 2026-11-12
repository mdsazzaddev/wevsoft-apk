import React from 'react';
import { ExternalLink, X } from 'lucide-react';

export interface LinkPreviewData {
  url: string;
  finalUrl?: string | null;
  title?: string | null;
  description?: string | null;
  image?: string | null;
  siteName?: string | null;
  domain?: string | null;
}

export function parseLinkPreviewJson(raw: unknown): LinkPreviewData | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const url = typeof o.url === 'string' ? o.url : typeof o.finalUrl === 'string' ? o.finalUrl : '';
    if (!url) return null;
    return {
      url,
      finalUrl: typeof o.finalUrl === 'string' ? o.finalUrl : null,
      title: typeof o.title === 'string' ? o.title : null,
      description: typeof o.description === 'string' ? o.description : null,
      image: typeof o.image === 'string' ? o.image : null,
      siteName: typeof o.siteName === 'string' ? o.siteName : null,
      domain: typeof o.domain === 'string' ? o.domain : null,
    };
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return parseLinkPreviewJson(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  return null;
}

/** First http(s) URL in free text (composer auto-unfurl). */
export function firstUrlInText(text: string): string | null {
  const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0].replace(/[.,);]+$/, '') : null;
}

interface LinkPreviewCardProps {
  preview: LinkPreviewData;
  className?: string;
  /** Composer dismiss control */
  onDismiss?: () => void;
  compact?: boolean;
}

export default function LinkPreviewCard({
  preview,
  className = '',
  onDismiss,
  compact = false,
}: LinkPreviewCardProps) {
  const href = preview.finalUrl || preview.url;
  const domain =
    preview.domain ||
    preview.siteName ||
    (() => {
      try {
        return new URL(href).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();
  const title = preview.title || domain || href;
  const description = preview.description?.trim() || null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/70 bg-muted/20 ${className}`}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/90 border border-border text-muted-foreground hover:text-foreground"
          aria-label="Remove link preview"
        >
          <X size={14} />
        </button>
      ) : null}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex ${compact ? 'flex-row' : 'flex-col sm:flex-row'} group touch-manipulation`}
      >
        {preview.image ? (
          <div
            className={`shrink-0 bg-muted overflow-hidden ${
              compact ? 'w-24 h-24' : 'w-full sm:w-36 h-40 sm:h-auto sm:min-h-[7.5rem]'
            }`}
          >
            <img
              src={preview.image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 p-3 sm:p-3.5 flex flex-col justify-center gap-1">
          {domain ? (
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground truncate flex items-center gap-1">
              <ExternalLink size={10} className="shrink-0 opacity-70" />
              {domain}
            </p>
          ) : null}
          <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </p>
          {description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
          ) : null}
        </div>
      </a>
    </div>
  );
}
