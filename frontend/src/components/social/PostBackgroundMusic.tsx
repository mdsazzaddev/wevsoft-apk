import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { claimPostMusic, releasePostMusic, isPostMusicSuspended, subscribePostMusicSuspend } from '../../lib/postMusicPlayback';

const UNMUTE_KEY = 'wev_post_music_unlocked';

/** Photo / text posts play the soundtrack once, then stop (no infinite loop). */
export const STILL_POST_MUSIC_MAX_SEC = 30;

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNMUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeUnlocked() {
  try {
    sessionStorage.setItem(UNMUTE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export type PostMusicPayload = {
  audioUrl?: string | null;
  title?: string | null;
  artist?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  volume?: number | null;
  originalAudioMuted?: boolean | null;
} | null | undefined;

function resolveMusic(post: any): PostMusicPayload {
  const pm = post?.postMusic;
  const legacy = post?.music;
  const audioUrl = pm?.audioUrl || legacy?.audioUrl || null;
  if (!audioUrl) return null;
  return {
    audioUrl,
    title: pm?.title || legacy?.title || null,
    artist: pm?.artist || legacy?.artist || null,
    startTime: pm?.startTime ?? 0,
    endTime: pm?.endTime ?? null,
    volume: pm?.volume ?? 1,
    originalAudioMuted: !!pm?.originalAudioMuted,
  };
}

function mediaListOf(post: any): any[] {
  if (Array.isArray(post?.postMedia) && post.postMedia.length) return post.postMedia;
  if (Array.isArray(post?.media) && post.media.length) return post.media;
  return [];
}

/** True for text posts and image-only posts (no video/reel clip). */
export function isStillImageOrTextPost(post: any): boolean {
  const media = mediaListOf(post);
  if (!media.length) return true;
  return !media.some((m: any) => {
    const type = String(m?.type || m?.kind || '').toLowerCase();
    if (type === 'video' || type === 'reel') return true;
    const url = String(m?.url || m?.src || '');
    return /\.(mp4|mov|webm|mkv|m4v|avi)(\?|$)/i.test(url);
  });
}

function segmentWindow(music: PostMusicPayload, onceMaxSec: number | null) {
  const start = Math.max(0, Number(music?.startTime) || 0);
  let end =
    music?.endTime != null && Number(music.endTime) > start
      ? Number(music.endTime)
      : start + (onceMaxSec ?? 60);
  if (onceMaxSec != null) {
    end = Math.min(end, start + onceMaxSec);
  }
  return { start, end };
}

/**
 * Background soundtrack for a feed/profile post — audible to every viewer.
 * Photo/text posts: play up to 30s once, then stop.
 * Video posts: loop the trimmed segment while the card is on-screen.
 */
export default function PostBackgroundMusic({
  postId,
  post,
  rootRef,
  enabled = true,
}: {
  postId: string;
  post: any;
  rootRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}) {
  const music = resolveMusic(post);
  const playOnce = isStillImageOrTextPost(post);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishedRef = useRef(false);
  const [muted, setMuted] = useState(() => !readUnlocked());
  const [visible, setVisible] = useState(false);
  const [suspended, setSuspended] = useState(() => isPostMusicSuspended());
  const key = `post-music:${postId}`;

  useEffect(() => subscribePostMusicSuspend(() => setSuspended(isPostMusicSuspended())), []);

  useEffect(() => {
    if (!music?.audioUrl) return;
    const audio = new Audio(music.audioUrl);
    audio.preload = 'metadata';
    audio.loop = false;
    const vol = Math.min(1, Math.max(0, Number(music.volume) || 1));
    const startMuted = !readUnlocked();
    audio.muted = startMuted;
    audio.volume = startMuted ? 0 : vol;
    audioRef.current = audio;
    finishedRef.current = false;

    const onceMax = playOnce ? STILL_POST_MUSIC_MAX_SEC : null;

    const onTimeUpdate = () => {
      const { start, end } = segmentWindow(music, onceMax);
      if (audio.currentTime < start) {
        audio.currentTime = start;
        return;
      }
      if (audio.currentTime >= end - 0.05) {
        if (playOnce) {
          finishedRef.current = true;
          audio.pause();
          try {
            audio.currentTime = start;
          } catch {
            /* ignore */
          }
          releasePostMusic(audio, key);
          return;
        }
        audio.currentTime = start;
        void audio.play().catch(() => {});
      }
    };
    const onEnded = () => {
      const { start } = segmentWindow(music, onceMax);
      if (playOnce) {
        finishedRef.current = true;
        try {
          audio.currentTime = start;
        } catch {
          /* ignore */
        }
        releasePostMusic(audio, key);
        return;
      }
      audio.currentTime = start;
      void audio.play().catch(() => {});
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      releasePostMusic(audio, key);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
     
  }, [music?.audioUrl, music?.startTime, music?.endTime, music?.volume, postId, playOnce]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !music) return;
    const vol = Math.min(1, Math.max(0, Number(music.volume) || 1));
    audio.volume = muted ? 0 : vol;
    audio.muted = muted;
  }, [muted, music]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !music?.audioUrl || !enabled) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!!entry?.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35, 0.5, 0.75] },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [rootRef, music?.audioUrl, enabled, postId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !music?.audioUrl || !enabled) return;

    if (!visible || suspended) {
      releasePostMusic(audio, key);
      return;
    }

    // Re-entering the viewport allows another play for photo/text posts.
    finishedRef.current = false;
    const onceMax = playOnce ? STILL_POST_MUSIC_MAX_SEC : null;
    const { start, end } = segmentWindow(music, onceMax);
    if (audio.currentTime < start || audio.currentTime >= end) {
      audio.currentTime = start;
    }

    let cancelled = false;
    void (async () => {
      if (finishedRef.current) return;
      const result = await claimPostMusic(audio, key);
      if (cancelled || finishedRef.current) return;
      if (result.blocked) {
        setMuted(true);
        audio.muted = true;
        audio.volume = 0;
        await claimPostMusic(audio, key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, enabled, suspended, music?.audioUrl, music?.startTime, music?.endTime, key, playOnce]);

  if (!music?.audioUrl) return null;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (suspended) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (!nextMuted) writeUnlocked();
    const audio = audioRef.current;
    if (!audio || !music) return;
    const vol = Math.min(1, Math.max(0, Number(music.volume) || 1));
    audio.muted = nextMuted;
    audio.volume = nextMuted ? 0 : vol;
    if (!nextMuted && visible) {
      const onceMax = playOnce ? STILL_POST_MUSIC_MAX_SEC : null;
      const { start } = segmentWindow(music, onceMax);
      if (playOnce && finishedRef.current) {
        finishedRef.current = false;
        audio.currentTime = start;
      }
      if (audio.paused) {
        audio.currentTime = Math.max(audio.currentTime, start);
        void claimPostMusic(audio, key);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center p-1 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:opacity-80 transition-opacity"
      aria-label={muted ? 'Unmute post music' : 'Mute post music'}
      title={muted ? 'Tap to hear music' : 'Mute music'}
    >
      {muted ? <VolumeX size={18} strokeWidth={2.25} /> : <Volume2 size={18} strokeWidth={2.25} />}
    </button>
  );
}

export { resolveMusic };
