import React, { useEffect, useRef } from 'react';
import { extractYoutubeVideoId } from '../../lib/youtubeWatchParty';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[data-yt-api]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytApi = '1';
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

export type YtPlayerHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (sec: number) => void;
  getCurrentTime: () => number;
};

type Props = {
  videoUrl: string;
  isHost: boolean;
  onReady?: (api: YtPlayerHandle) => void;
  onHostPlay?: () => void;
  onHostPause?: () => void;
  className?: string;
};

export const WatchPartyYoutubePlayer: React.FC<Props> = ({
  videoUrl,
  isHost,
  onReady,
  onHostPlay,
  onHostPause,
  className,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const videoId = extractYoutubeVideoId(videoUrl);

  useEffect(() => {
    if (!videoId || !mountRef.current) return;
    let cancelled = false;
    const elId = `wp-yt-${videoId}-${Math.random().toString(36).slice(2, 8)}`;
    mountRef.current.id = elId;

    void loadYoutubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(elId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            const api: YtPlayerHandle = {
              play: () => playerRef.current?.playVideo?.(),
              pause: () => playerRef.current?.pauseVideo?.(),
              seekTo: (sec) => playerRef.current?.seekTo?.(sec, true),
              getCurrentTime: () => Number(playerRef.current?.getCurrentTime?.() || 0),
            };
            onReady?.(api);
          },
          onStateChange: (e: { data: number }) => {
            if (!isHost) return;
            // 1 playing, 2 paused
            if (e.data === 1) onHostPlay?.();
            if (e.data === 2) onHostPause?.();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [videoId, isHost, onReady, onHostPlay, onHostPause]);

  if (!videoId) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-white/70 p-6 text-center">
        Invalid YouTube URL
      </div>
    );
  }

  return <div ref={mountRef} className={className || 'w-full h-full'} />;
};
