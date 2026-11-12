import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';

function isDriveMediaProxy(src: string | null | undefined): boolean {
  if (!src) return false;
  return src.includes('/api/wevchat/drive-media/');
}

/** Resolve a Drive proxy URL with Bearer auth into a blob object URL. */
export function useAuthenticatedSrc(src: string | null | undefined): {
  resolved: string | null;
  loading: boolean;
  error: string | null;
} {
  const token = useStore((s) => s.token);
  const [resolved, setResolved] = useState<string | null>(() =>
    src && !isDriveMediaProxy(src) ? src : null,
  );
  const [loading, setLoading] = useState(() => !!src && isDriveMediaProxy(src));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setResolved(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (!isDriveMediaProxy(src)) {
      setResolved(src);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setResolved(null);

    (async () => {
      try {
        const res = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`Media unavailable (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load media');
          setResolved(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, token]);

  return { resolved, loading, error };
}

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & { as?: 'img' };
type VideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & { as: 'video' };
type AudioProps = React.AudioHTMLAttributes<HTMLAudioElement> & { as: 'audio' };
type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'link'; children?: React.ReactNode };

type AuthenticatedMediaProps = (ImageProps | VideoProps | AudioProps | LinkProps) & {
  src: string;
};

export const AuthenticatedMedia: React.FC<AuthenticatedMediaProps> = (props) => {
  const { src, as = 'img', ...rest } = props;
  const { resolved, loading, error } = useAuthenticatedSrc(src);

  if (loading) {
    return (
      <span className="inline-flex items-center justify-center rounded-xl bg-muted/40 text-[10px] text-muted-foreground px-3 py-6 min-w-[120px]">
        Loading…
      </span>
    );
  }
  if (error || !resolved) {
    return (
      <span className="inline-flex items-center rounded-xl bg-muted/40 text-[10px] text-muted-foreground px-3 py-2">
        {error || 'Unavailable'}
      </span>
    );
  }

  if (as === 'video') {
    return <video preload="metadata" src={resolved} {...(rest as React.VideoHTMLAttributes<HTMLVideoElement>)} />;
  }
  if (as === 'audio') {
    return <audio preload="metadata" src={resolved} {...(rest as React.AudioHTMLAttributes<HTMLAudioElement>)} />;
  }
  if (as === 'link') {
    const { children, ...linkRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children?: React.ReactNode;
    };
    return (
      <a href={resolved} {...linkRest}>
        {children}
      </a>
    );
  }
  return <img loading="lazy" decoding="async" src={resolved} {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
};

export default AuthenticatedMedia;
