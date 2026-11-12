import { useRef, useState } from 'react';

type ReelSearchThumbnailProps = {
  key?: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  alt?: string;
};

/**
 * Search-result poster with a browser-video safety net. Normally this renders
 * the cached server thumbnail; while a legacy reel is being backfilled (or an
 * image URL has expired), it seeks the video to an interior frame instead of
 * leaving an empty/broken tile.
 */
export default function ReelSearchThumbnail({ thumbnailUrl, videoUrl, alt = '' }: ReelSearchThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const useVideoFallback = !!videoUrl && (!thumbnailUrl || imageFailed);

  const seekVideoFallback = () => {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = duration > 0
      ? Math.min(Math.max(0.15, duration * 0.48), Math.max(0.15, duration - 0.15))
      : 0.5;
    try {
      video.currentTime = target;
    } catch {
      setVideoReady(true);
    }
  };

  return (
    <>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-violet-700/40 to-zinc-900" aria-hidden="true" />
      {useVideoFallback && (
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${videoReady && !videoFailed ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={seekVideoFallback}
          onSeeked={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      )}
      {!!thumbnailUrl && !imageFailed && (
        <img
          src={thumbnailUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200"
          onLoad={(event) => event.currentTarget.classList.replace('opacity-0', 'opacity-100')}
          onError={() => setImageFailed(true)}
        />
      )}
    </>
  );
}
