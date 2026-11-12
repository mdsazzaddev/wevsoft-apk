import React, { useEffect, useMemo, useState } from 'react';
import { ImageOff, VideoOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveAvatarUrl } from '../UserAvatar';
import { useValueChanged } from '../../hooks/useValueChanged';

/** True when the active UI language is Bangla. */
export function useIsBangla(): boolean {
  const { i18n } = useTranslation();
  return String(i18n?.language || '').toLowerCase().startsWith('bn');
}

/** Theme-aware stand-in for an image that is missing or failed to load. */
export function MediaPlaceholder({ className = '', iconSize = 20, label }: { className?: string; iconSize?: number; label?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground ${className}`} role="img" aria-label={label || 'Image unavailable'}>
      <ImageOff size={iconSize} aria-hidden />
      {label ? <span className="text-xs font-medium">{label}</span> : null}
    </div>
  );
}

/** Placeholder shown instead of a black box when a video fails to load. */
export function VideoUnavailable({ className = '' }: { className?: string }) {
  const bn = useIsBangla();
  const text = bn ? 'ভিডিও পাওয়া যায়নি' : 'Video unavailable';
  return (
    <div className={`flex min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`} role="img" aria-label={text}>
      <VideoOff size={28} aria-hidden />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Classes for the placeholder; defaults to the image's className. */
  fallbackClassName?: string;
  /** Custom fallback node (e.g. an initial letter). */
  fallback?: React.ReactNode;
  iconSize?: number;
};

/** <img> that swaps to a theme-aware placeholder on 404 / decode error instead of the browser's broken-image icon. */
export default function SafeImage({ src, fallbackClassName, fallback, iconSize, onError, className, ...rest }: SafeImageProps) {
  const resolved = useMemo(() => (src ? resolveAvatarUrl(String(src)) : null), [src]);
  const [failed, setFailed] = useState(!resolved);
  // New src → retry (adjusted during render instead of in an effect).
  if (useValueChanged(resolved)) setFailed(!resolved);
  if (failed) return <>{fallback ?? <MediaPlaceholder className={fallbackClassName ?? className} iconSize={iconSize} />}</>;
  return (
    <img
      {...rest}
      src={resolved!}
      className={className}
      onError={(e) => { setFailed(true); onError?.(e); }}
    />
  );
}
