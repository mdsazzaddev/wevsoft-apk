import { useEffect, useMemo, useRef, useState } from 'react';
import { getMediaApiOrigin } from '../lib/apiBase';
import { preferApiMediaUrl } from '../lib/reelPlaybackSources';

export type AvatarUser = {
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
};

const MAX_AVATAR_RETRIES = 3;

/**
 * Converts the avatar values stored by Wevsoft into a browser-safe URL.
 *
 * Absolute CDN URLs (`cdn.wevsoft.com/media/...`) are kept as-is — the post
 * composer already shows those successfully. Rewriting them onto the API origin
 * made sidebar/header/feed fall back to initials while the composer kept the photo.
 *
 * Relative `/media`/`/uploads` still map onto the API origin on www/Pages hosts
 * that do not proxy media themselves.
 */
export function resolveAvatarUrl(avatar?: string | null): string | null {
  const value = avatar?.trim();
  if (!value || value === 'null' || value === 'undefined') return null;
  if (/^(data:image\/|blob:)/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const host = new URL(value).hostname.toLowerCase();
      const path = new URL(value).pathname;
      if (
        (host === 'cdn.wevsoft.com' || host.endsWith('.r2.dev')) &&
        (path.startsWith('/media/') || path.startsWith('/uploads/'))
      ) {
        return value;
      }
    } catch {
      /* fall through */
    }
  }
  const normalized = /^(https?:)/i.test(value) ? value : value.startsWith('/') ? value : `/${value}`;
  return preferApiMediaUrl(normalized, getMediaApiOrigin()) || normalized;
}

/** Cache-bust so a failed Vite-proxy / transient 500 can be retried. */
function withAvatarRetryParam(url: string, attempt: number): string {
  if (/^(data:image\/|blob:)/i.test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}wev_av=${attempt}_${Date.now()}`;
}

/**
 * Retries transient `/media` / `/uploads` failures (backend boot, port restart)
 * then gives up so callers can show initials / placeholders.
 */
export function useResilientMediaSrc(src?: string | null) {
  const resolvedSrc = useMemo(() => resolveAvatarUrl(src), [src]);
  const [displaySrc, setDisplaySrc] = useState<string | null>(resolvedSrc);
  const [giveUp, setGiveUp] = useState(false);
  const retriesRef = useRef(0);
  const triedApiFallbackRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retriesRef.current = 0;
    triedApiFallbackRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setGiveUp(false);
    setDisplaySrc(resolvedSrc);
  }, [resolvedSrc]);

  useEffect(
    () => () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  const onError = () => {
    if (!resolvedSrc) {
      setGiveUp(true);
      return;
    }
    // Relative /media failed on this host — try the API origin once.
    if (!triedApiFallbackRef.current) {
      triedApiFallbackRef.current = true;
      const apiCopy = preferApiMediaUrl(resolvedSrc, getMediaApiOrigin());
      if (apiCopy && apiCopy !== resolvedSrc && apiCopy !== displaySrc) {
        setDisplaySrc(apiCopy);
        return;
      }
      // Absolute API URL failed — try the CDN copy (R2 public) once.
      try {
        const u = new URL(resolvedSrc, typeof window !== 'undefined' ? window.location.origin : 'https://wevsoft.com');
        if (u.pathname.startsWith('/media/') || u.pathname.startsWith('/uploads/')) {
          const cdn = `https://cdn.wevsoft.com${u.pathname}`;
          if (cdn !== displaySrc) {
            setDisplaySrc(cdn);
            return;
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (retriesRef.current >= MAX_AVATAR_RETRIES) {
      setGiveUp(true);
      return;
    }
    const attempt = ++retriesRef.current;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    // Backend / Vite proxy can be briefly down on boot (ECONNREFUSED → 500).
    retryTimerRef.current = setTimeout(() => {
      setDisplaySrc(withAvatarRetryParam(resolvedSrc, attempt));
    }, 350 * attempt);
  };

  return {
    displaySrc,
    giveUp,
    onError,
    showImage: Boolean(displaySrc && !giveUp),
  };
}

export function avatarInitials(user?: AvatarUser | null): string {
  const name = user?.name?.trim();
  if (!name) return 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** A single, failure-safe avatar UI for every Wevsoft user surface. */
export default function UserAvatar({
  user,
  src,
  alt,
  className = '',
  imageClassName = 'w-full h-full object-cover',
  decorative = false,
}: {
  user?: AvatarUser | null;
  /** Use only when the API returns an avatar separately from its user object. */
  src?: string | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  /** Parent already names the user (e.g. profile `Link`); keep the image silent. */
  decorative?: boolean;
}) {
  const { displaySrc, onError, showImage } = useResilientMediaSrc(src ?? user?.avatar);
  const label = decorative ? undefined : alt || user?.name || 'User avatar';
  const imgAlt = decorative ? '' : alt || user?.name || 'User avatar';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 text-white font-bold select-none ${className}`}
      aria-hidden={decorative ? true : undefined}
      aria-label={label}
    >
      {showImage ? (
        <img
          src={displaySrc!}
          alt={imgAlt}
          className={`${imageClassName} aspect-square`}
          onError={onError}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <span aria-hidden="true">{avatarInitials(user)}</span>
      )}
    </span>
  );
}
