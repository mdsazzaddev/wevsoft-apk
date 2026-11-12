import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { startWhepPlayback, type WhepPlayHandle } from '../../lib/whepPlay';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import { watchLiveHlsReady } from '../../lib/liveHlsReady';

/**
 * Prefer MediaMTX WHEP; if OBS is not on this key yet (404) keep retrying,
 * then fall back to HLS when the playlist is ready.
 */
export function LiveWhepPlayer(props: {
  whepPlayPath: string;
  token: string;
  muted?: boolean;
  className?: string;
  /** HLS fallback URL (same stream). */
  hlsUrl?: string | null;
  /** MediaMTX LL-HLS profile — pass through to UVP fallback. */
  lowLatency?: boolean;
  onError?: (message: string) => void;
}) {
  const { whepPlayPath, token, muted = true, className = '', hlsUrl, lowLatency = false, onError } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<WhepPlayHandle | null>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'waiting' | 'hls' | 'error'>('connecting');
  const [detail, setDetail] = useState('Connecting…');
  const [hlsReady, setHlsReady] = useState(false);

  useEffect(() => {
    if (!hlsUrl || status === 'live') return;
    return watchLiveHlsReady(hlsUrl, setHlsReady, { intervalMs: 2000, timeoutMs: 5 * 60 * 1000 });
  }, [hlsUrl, status]);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanupPc = () => {
      handleRef.current?.stop();
      handleRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const tryOnce = async () => {
      if (cancelled) return;
      attempt += 1;
      setStatus(attempt === 1 ? 'connecting' : 'waiting');
      setDetail(
        attempt === 1
          ? 'Connecting…'
          : 'Waiting for OBS… Use the exact Stream Key from Studio (B-frames = 0).',
      );
      try {
        const handle = await startWhepPlayback({ whepPlayPath, token });
        if (cancelled) {
          handle.stop();
          return;
        }
        handleRef.current = handle;
        const el = videoRef.current;
        if (el) {
          el.srcObject = handle.stream;
          el.muted = muted;
          await el.play().catch(() => {
            el.muted = true;
            return el.play().catch(() => {});
          });
        }
        setStatus('live');
        setDetail('');
      } catch (e: any) {
        if (cancelled) return;
        const msg = String(e?.message || 'WebRTC play failed');
        const waiting =
          /404|not found|no stream|not available|waiting|503/i.test(msg) ||
          msg.includes('Stream is not live');
        if (waiting && attempt < 45) {
          setStatus('waiting');
          setDetail('Waiting for OBS to publish this stream key…');
          timer = setTimeout(() => void tryOnce(), 2000);
          return;
        }
        // Prefer HLS fallback over a hard error when playlist is up.
        if (hlsUrl) {
          setStatus('hls');
          setDetail('Using HLS fallback');
          onError?.(msg);
          return;
        }
        setStatus('error');
        setDetail(msg);
        onError?.(msg);
      }
    };

    void tryOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cleanupPc();
    };
  }, [whepPlayPath, token, hlsUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  if (status === 'hls' && hlsUrl && hlsReady) {
    return (
      <UniversalVideoPlayer
        key={`hls-fb-${hlsUrl}`}
        src={hlsUrl}
        context="fullscreen"
        live
        lowLatency={lowLatency}
        loop={false}
        muted={muted}
        autoplay
        isActive
        preload="auto"
        className={className}
      />
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        autoPlay
        muted={muted}
      />
      {status !== 'live' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-xs px-4 text-center">
          {(status === 'connecting' || status === 'waiting' || (status === 'hls' && !hlsReady)) && (
            <Loader2 className="animate-spin text-white/60" size={16} />
          )}
          <p className={status === 'error' ? 'text-red-300' : ''}>{detail}</p>
          {status === 'waiting' && (
            <p className="text-[10px] text-white/50 max-w-sm">
              After each Go Live, paste the new Key into OBS and Start Streaming.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
