import { useEffect, useRef, useState } from 'react';

function resolveThumb(thumbnailUrl?: string | null, config?: string | null): string | null {
  if (thumbnailUrl) return thumbnailUrl;
  if (!config) return null;
  try {
    const parsed = JSON.parse(config);
    return parsed?.thumbnailUrl || null;
  } catch {
    return null;
  }
}

/**
 * Story-bar preview: prefer server thumbnail; otherwise seek into the video
 * for a more interesting still frame (avoids black first frame).
 */
export default function StoryVideoThumb({
  url,
  thumbnailUrl,
  config,
  className = '',
}: {
  url: string;
  thumbnailUrl?: string | null;
  config?: string | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbFailed, setThumbFailed] = useState(false);
  const resolved = resolveThumb(thumbnailUrl, config);
  const showImage = Boolean(resolved) && !thumbFailed;

  useEffect(() => {
    if (showImage) return;
    const el = videoRef.current;
    if (!el) return;

    const seekAttractive = () => {
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const t =
        d <= 2 ? Math.max(0.05, d * 0.4) :
        d <= 8 ? Math.min(2.2, d * 0.28) :
        Math.min(d * 0.22, Math.max(2, d - 1.5));
      try {
        el.currentTime = Math.min(t, Math.max(0, d - 0.05));
      } catch {
        /* ignore seek errors */
      }
    };

    if (el.readyState >= 1) seekAttractive();
    else el.addEventListener('loadedmetadata', seekAttractive, { once: true });

    return () => el.removeEventListener('loadedmetadata', seekAttractive);
  }, [url, showImage]);

  if (showImage && resolved) {
    return (
      <img
        src={resolved}
        alt=""
        loading="lazy"
        className={className}
        onError={() => setThumbFailed(true)}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      playsInline
      preload="metadata"
      className={className}
    />
  );
}
