import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Users, Settings, Loader2, Square, Copy, ExternalLink, Video, MonitorPlay, SwitchCamera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import { LiveWhepPlayer } from '../livestream/LiveWhepPlayer';
import { startWhipCameraPublish, type WhipPublishHandle } from '../../lib/whipPublish';
import { watchLiveHlsReady } from '../../lib/liveHlsReady';

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Copy failed');
  }
}

type IngestMode = 'camera' | 'obs';

export const LiveStudioView = () => {
  const token = useStore((s) => s.token);
  const userName = useStore((s) => s.user?.name);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'followers' | 'private'>('public');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<IngestMode>('camera');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cameraOn, setCameraOn] = useState(false);
  const [hlsReady, setHlsReady] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const whipRef = useRef<WhipPublishHandle | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/live', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setActive(data.active);
      setStreams(data.streams || []);
    } catch {
      toast.error('Could not load live studio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void load();
  }, [token]);

  useEffect(() => {
    return () => {
      void whipRef.current?.stop();
      whipRef.current = null;
    };
  }, []);

  const attachPreview = (stream: MediaStream) => {
    const el = previewRef.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
  };

  const stopCameraPublish = async () => {
    await whipRef.current?.stop();
    whipRef.current = null;
    setCameraOn(false);
    if (previewRef.current) previewRef.current.srcObject = null;
  };

  const startStream = async () => {
    if (!token) return;
    const first = (userName || 'Creator').trim().split(/\s+/)[0] || 'Creator';
    const resolvedTitle = title.trim() || `${first}'s Live`;
    setBusy(true);
    try {
      const res = await fetch('/api/livestream/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: resolvedTitle, category: 'Creator', visibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');

      if (mode === 'camera') {
        const path = data.ingest?.whipPublishPath as string | undefined;
        if (!path || !data.ingest?.cameraIngestConfigured) {
          toast.error('Camera ingest not configured (LIVESTREAM_WHIP_BASE). OBS tab still works.');
          setTitle('');
          await load();
          return;
        }
        try {
          const handle = await startWhipCameraPublish({
            whipPublishPath: path,
            token,
            facingMode: facing,
          });
          whipRef.current = handle;
          setCameraOn(true);
          // wait a tick for video element mount
          window.setTimeout(() => attachPreview(handle.stream), 50);
          toast.success('Camera is live — others can watch on /live');
        } catch (camErr: any) {
          toast.error(camErr?.message || 'Camera publish failed');
          // Keep stream row so user can fall back to OBS
          await load();
          return;
        }
      } else {
        toast.success('You are live — copy Server + Key into OBS below');
      }
      setTitle('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Start failed');
    } finally {
      setBusy(false);
    }
  };

  const endStream = async () => {
    if (!active?.id) return;
    setBusy(true);
    try {
      await stopCameraPublish();
      const res = await fetch(`/api/livestream/${active.id}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to end stream');
      toast.success('Stream ended');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'End failed');
    } finally {
      setBusy(false);
    }
  };

  const ingest = active?.ingest;
  const playbackUrl = active?.playbackUrl as string | null | undefined;
  const playbackLowLatency = !!(active as any)?.playbackLowLatency;
  const whepPlayPath = active?.whepPlayPath as string | null | undefined;
  const showLocalPreview = cameraOn && mode === 'camera';

  useEffect(() => {
    if (showLocalPreview && whipRef.current?.stream) {
      attachPreview(whipRef.current.stream);
    }
  }, [showLocalPreview, active?.id]);

  // OBS often connects after Go Live — remount UVP only once HLS is actually serving.
  useEffect(() => {
    if (mode !== 'obs' || !playbackUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external subscription: resets state, then follows the subscribed source
      setHlsReady(false);
      return;
    }
    return watchLiveHlsReady(playbackUrl, setHlsReady);
  }, [mode, playbackUrl, active?.id]);

  const flipCamera = async () => {
    const path = ingest?.whipPublishPath;
    if (!active?.id || !token || !path) return;
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    setBusy(true);
    try {
      await stopCameraPublish();
      const handle = await startWhipCameraPublish({
        whipPublishPath: path,
        token,
        facingMode: next,
      });
      whipRef.current = handle;
      setCameraOn(true);
    } catch (e: any) {
      toast.error(e?.message || 'Could not flip camera');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground flex items-center gap-2">Live Studio{active && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-label="Live" />}</h1>

        <p className="mt-0.5 mb-4 text-sm text-muted-foreground">Go live from your camera or stream from OBS.</p>

        {/* Mode tabs */}
        <div className="mb-4 inline-flex gap-1 rounded-lg border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setMode('camera')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold ${mode === 'camera' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Video size={14} /> Camera
          </button>
          <button
            type="button"
            onClick={() => setMode('obs')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold ${mode === 'obs' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MonitorPlay size={14} /> OBS / Stream key
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="w-full min-h-[22rem] bg-black rounded-2xl border border-white/10 relative overflow-hidden">
              {showLocalPreview ? (
                <video
                  ref={previewRef}
                  className="w-full h-full min-h-[22rem] object-cover"
                  playsInline
                  muted
                  autoPlay
                />
              ) : active && mode === 'obs' && token && whepPlayPath ? (
                <div className="relative w-full" style={{ minHeight: '22rem', height: '22rem' }}>
                  <LiveWhepPlayer
                    key={`obs-whep-${active.id}`}
                    whepPlayPath={whepPlayPath}
                    token={token}
                    muted={previewMuted}
                    hlsUrl={playbackUrl}
                    lowLatency={playbackLowLatency}
                    className="w-full h-full"
                    onError={(msg) => {
                      if (!/Waiting for OBS|obs_not_publishing/i.test(msg)) toast.error(msg);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewMuted((m) => !m)}
                    className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white border border-white/20"
                  >
                    {previewMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              ) : active && playbackUrl && mode === 'obs' && hlsReady ? (
                <div className="relative w-full" style={{ minHeight: '22rem', height: '22rem' }}>
                  <UniversalVideoPlayer
                    key={`obs-hls-${active.id}-${hlsReady}`}
                    src={playbackUrl}
                    context="fullscreen"
                    live
                    lowLatency={playbackLowLatency}
                    loop={false}
                    muted={previewMuted}
                    autoplay
                    isActive
                    preload="auto"
                    className="w-full h-full"
                    style={{ minHeight: '22rem', height: '22rem' }}
                    onError={() => toast.error('Live video failed — set OBS B-frames=0 (see note below)')}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewMuted((m) => !m)}
                    className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white border border-white/20"
                  >
                    {previewMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[22rem]">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${active ? 'bg-red-600/30' : 'bg-red-600/20'}`}>
                    <Radio className="text-red-500" size={32} />
                  </div>
                  {active ? (
                    <>
                      <div className="px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">Live</div>
                      <h3 className="text-xl font-bold text-white text-center">{active.title}</h3>
                      <p className="text-xs text-white/70 text-center max-w-sm">
                        {mode === 'camera'
                          ? cameraOn
                            ? 'Broadcasting from camera…'
                            : 'Stream is live — tap “Start camera” below if preview is off, or switch to OBS tab.'
                          : active.mediaConfigured
                            ? 'Waiting for OBS… Start Streaming in OBS with the Server + Key below — preview appears within a few seconds.'
                            : 'Set LIVESTREAM_* env + MediaMTX — see docs/video-engine/LIVE.md'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-white">
                        {mode === 'camera' ? 'Go live with camera' : 'Go live with OBS'}
                      </h3>
                      <p className="text-xs text-white/55 text-center max-w-sm">
                        {mode === 'camera'
                          ? 'Facebook-style: browser camera publishes via WHIP. Viewers watch on /live.'
                          : 'Desktop creators: copy Server + Key into OBS Custom stream settings.'}
                      </p>
                      <label className="w-full max-w-md text-left">
                        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/60">
                          Stream title (optional)
                        </span>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void startStream();
                          }}
                          placeholder={`e.g. ${(userName || 'Creator').trim().split(/\s+/)[0] || 'Creator'}'s Live`}
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
                          autoFocus
                        />
                      </label>
                      <label className="w-full max-w-md text-left">
                        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/60">
                          Who can watch
                        </span>
                        <select
                          value={visibility}
                          onChange={(e) =>
                            setVisibility(e.target.value as 'public' | 'friends' | 'followers' | 'private')
                          }
                          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                        >
                          <option value="public" className="bg-zinc-900">
                            Public — anyone
                          </option>
                          <option value="friends" className="bg-zinc-900">
                            Friends only
                          </option>
                          <option value="followers" className="bg-zinc-900">
                            Followers only
                          </option>
                          <option value="private" className="bg-zinc-900">
                            Only me
                          </option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => void startStream()}
                        disabled={busy}
                        className="px-6 py-3 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {busy ? 'Starting…' : 'Go Live'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {active && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase">Live</span>
                  <span className="text-sm font-bold text-foreground">{active.title}</span>
                  <span className="text-xs text-muted-foreground">
                    Viewers: {active.viewerCount ?? active._count?.viewers ?? 0}
                  </span>
                  <Link
                    to={`/live/${active.id}`}
                    className="ml-auto text-xs font-bold text-primary flex items-center gap-1"
                  >
                    Open viewer <ExternalLink size={12} />
                  </Link>
                  {mode === 'camera' && cameraOn && (
                    <button
                      type="button"
                      onClick={() => void flipCamera()}
                      disabled={busy}
                      className="px-3 py-2 rounded-full border border-border text-xs font-bold flex items-center gap-1.5"
                    >
                      <SwitchCamera size={14} /> Flip
                    </button>
                  )}
                  {mode === 'camera' && active && !cameraOn && ingest?.whipPublishPath && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void (async () => {
                        setBusy(true);
                        try {
                          const handle = await startWhipCameraPublish({
                            whipPublishPath: ingest.whipPublishPath,
                            token: token!,
                            facingMode: facing,
                          });
                          whipRef.current = handle;
                          setCameraOn(true);
                          window.setTimeout(() => attachPreview(handle.stream), 50);
                          toast.success('Camera publishing');
                        } catch (e: any) {
                          toast.error(e?.message || 'Camera failed');
                        } finally {
                          setBusy(false);
                        }
                      })()}
                      className="px-3 py-2 rounded-full bg-red-600 text-white text-xs font-bold"
                    >
                      Start camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void endStream()}
                    disabled={busy}
                    className="px-4 py-2 bg-zinc-800 text-white rounded-full text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Square size={12} fill="currentColor" /> End
                  </button>
                </div>

                {mode === 'obs' && (
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs">
                    <div className="rounded-xl border border-border bg-primary/10 px-3 py-2 text-primary">
                      <p className="font-bold text-primary">OBS must use B-frames = 0</p>
                      <p className="mt-1 text-[11px] text-primary/90 leading-relaxed">
                        Settings → Output → Streaming → set <strong>B-frames to 0</strong>, Keyframe Interval <strong>2</strong>,
                        x264 Options: <code className="font-mono">bframes=0</code>. Otherwise HLS crashes and the player stays black.
                      </p>
                    </div>
                    <p className="font-bold text-foreground">OBS / RTMP ingest</p>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16 shrink-0">Server</span>
                      <code className="flex-1 truncate font-mono">{ingest?.rtmpUrl || '— set LIVESTREAM_RTMP_URL —'}</code>
                      {ingest?.rtmpUrl && (
                        <button type="button" onClick={() => void copyText('Server', ingest.rtmpUrl)} className="p-1.5 rounded-lg border border-border">
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-16 shrink-0">Key</span>
                      <code className="flex-1 truncate font-mono">{ingest?.streamKey || active.streamKey || '—'}</code>
                      {(ingest?.streamKey || active.streamKey) && (
                        <button
                          type="button"
                          onClick={() => void copyText('Stream key', ingest?.streamKey || active.streamKey)}
                          className="p-1.5 rounded-lg border border-border"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    {playbackUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-16 shrink-0">HLS</span>
                        <code className="flex-1 truncate font-mono">{playbackUrl}</code>
                        <button type="button" onClick={() => void copyText('HLS', playbackUrl)} className="p-1.5 rounded-lg border border-border">
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'camera' && (
                  <p className="text-xs text-muted-foreground">
                    {ingest?.cameraIngestConfigured
                      ? 'Camera uses WHIP through the API (MediaMTX). Allow browser camera/mic permission when prompted.'
                      : 'Add LIVESTREAM_WHIP_BASE=http://127.0.0.1:8889 to backend/.env and restart API. OBS tab works without it.'}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-card border border-border rounded-2xl text-center text-sm font-semibold text-muted-foreground">
                <Users size={20} className="mx-auto mb-2" />
                Past streams: {streams.length}
              </div>
              <div className="p-4 bg-card border border-border rounded-2xl text-center text-sm font-semibold text-muted-foreground">
                <Settings size={20} className="mx-auto mb-2" />
                Chat & gifts via livestream API
              </div>
            </div>

            {streams.length > 0 && (
              <div className="mt-6 space-y-2">
                <h2 className="text-[15px] font-semibold text-foreground">Recent</h2>
                {streams.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border text-sm">
                    <span className="font-semibold text-foreground truncate">{s.title}</span>
                    <span className={`text-[10px] font-bold uppercase ${s.status === 'live' ? 'text-red-400' : 'text-muted-foreground'}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
