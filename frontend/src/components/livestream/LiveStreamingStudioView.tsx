import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Radio, Users, Send, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { getSocket } from '../../lib/socket';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import { LiveWhepPlayer } from './LiveWhepPlayer';
import { watchLiveHlsReady } from '../../lib/liveHlsReady';

type StreamRow = {
  id: string;
  title: string;
  status: string;
  userId: string;
  playbackUrl?: string | null;
  whepPlayPath?: string | null;
  mediaConfigured?: boolean;
  viewerCount?: number;
  _count?: { viewers?: number };
  user?: { id: string; name?: string | null; avatar?: string | null };
  comments?: Array<{ id: string; text?: string; content?: string; user?: { name?: string | null } }>;
};

type ChatLine = { id: string; sender: string; text: string };

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const LiveStreamingStudioView: React.FC = () => {
  const { streamId } = useParams<{ streamId?: string }>();
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const [list, setList] = useState<StreamRow[]>([]);
  const [stream, setStream] = useState<StreamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [input, setInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [hlsReady, setHlsReady] = useState(false);
  const [watchMuted, setWatchMuted] = useState(true);
  const whepPlayPath = stream?.whepPlayPath as string | null | undefined;
  const playbackLowLatency = !!(stream as any)?.playbackLowLatency;

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/livestream', { headers: authHeaders(token) });
      if (!res.ok) throw new Error('list failed');
      setList(await res.json());
    } catch {
      toast.error('Could not load live streams');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadStream = useCallback(async (id: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/livestream/${id}`, { headers: authHeaders(token) });
      if (!res.ok) throw new Error('not found');
      const data: StreamRow = await res.json();
      setStream(data);
      setViewerCount(data.viewerCount ?? data._count?.viewers ?? 0);
      setChat(
        (data.comments || []).map((c) => ({
          id: c.id,
          sender: c.user?.name || 'Viewer',
          text: c.text || c.content || '',
        })),
      );
      await fetch(`/api/livestream/${id}/join`, { method: 'POST', headers: authHeaders(token) });
    } catch {
      toast.error('Stream not found');
      setStream(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    if (streamId) void loadStream(streamId);
    else void loadList();
  }, [streamId, loadList, loadStream]);

  // Lobby: pick up newly started lives without a full page reload.
  useEffect(() => {
    if (streamId) return;
    const id = window.setInterval(() => {
      void loadList();
    }, 8000);
    return () => window.clearInterval(id);
  }, [streamId, loadList]);

  useEffect(() => {
    if (!streamId || !user?.id || !stream) return;
    const socket = getSocket(user.id);
    socket.emit('livestream:join', { streamId });

    const onComment = (payload: {
      id?: string;
      content?: string;
      text?: string;
      userName?: string;
      user?: { name?: string };
      userId?: string;
      createdAt?: string;
    }) => {
      setChat((prev) => [
        ...prev.slice(-100),
        {
          id: payload.id || `${payload.createdAt || Date.now()}-${payload.userId || 'u'}`,
          sender: payload.userName || payload.user?.name || 'Viewer',
          text: payload.text || payload.content || '',
        },
      ]);
    };
    const onViewer = (payload: { viewerCount?: number }) => {
      if (typeof payload.viewerCount === 'number') setViewerCount(payload.viewerCount);
    };
    const onEnded = () => {
      toast('Stream ended');
      navigate('/live');
    };

    socket.on('livestream:comment', onComment);
    socket.on('livestream:viewer-joined', onViewer);
    socket.on('livestream:viewer-left', onViewer);
    socket.on('livestream:ended', onEnded);

    return () => {
      socket.emit('livestream:leave', { streamId });
      socket.off('livestream:comment', onComment);
      socket.off('livestream:viewer-joined', onViewer);
      socket.off('livestream:viewer-left', onViewer);
      socket.off('livestream:ended', onEnded);
      if (token) {
        void fetch(`/api/livestream/${streamId}/leave`, { method: 'POST', headers: authHeaders(token) });
      }
    };
  }, [streamId, user?.id, stream?.id, token, navigate]);

  useEffect(() => {
    const url = stream?.playbackUrl;
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external subscription: resets state, then follows the subscribed source
      setHlsReady(false);
      return;
    }
    return watchLiveHlsReady(url, setHlsReady);
  }, [stream?.playbackUrl, stream?.id]);

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !streamId || !token || !user?.id) return;
    const text = input.trim();
    setInput('');
    try {
      const res = await fetch(`/api/livestream/${streamId}/comment`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Chat failed');
        return;
      }
      // Socket fan-out comes from the REST handler (avoid duplicate local + relay).
      await res.json().catch(() => null);
    } catch {
      toast.error('Chat failed');
    }
  };

  if (!streamId) {
    return (
      <div className="space-y-6 pt-4 sm:pt-6">
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Radio className="text-red-500" size={20} /> Live
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active lives show here. To broadcast: Creator Hub → Live Studio → Go Live, then start OBS with that stream key.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/creator-hub?tab=live_studio"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
            >
              <Radio size={14} /> Go Live (Studio)
            </Link>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/40"
            >
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
            <Radio className="mx-auto mb-3 text-red-500/80" size={28} />
            <p className="text-sm font-semibold text-foreground">No one is live right now</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
              OBS alone is not enough — you must click <span className="font-bold">Go Live</span> in Live Studio first so the stream appears on this page for friends and viewers.
            </p>
            <Link
              to="/creator-hub?tab=live_studio"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white"
            >
              Open Live Studio
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/live/${s.id}`)}
                  className="w-full text-left rounded-xl border border-border px-4 py-3 hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    {s.status === 'live' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">Live</span>
                    )}
                    <span className="font-semibold text-sm">{s.title}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {s.user?.name || 'Creator'} · {s.viewerCount ?? s._count?.viewers ?? 0} watching
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (loading || !stream) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-black text-white">
        {loading ? <Loader2 className="animate-spin text-white/50" /> : <p className="text-sm text-white/60">Stream not found</p>}
      </div>
    );
  }

  const playback = stream.playbackUrl;

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-black text-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => navigate('/live')}
          className="text-xs font-bold flex items-center gap-1 text-white/70 hover:text-white"
        >
          <ArrowLeft size={14} /> All live
        </button>
        {stream.status === 'live' && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">Live</span>
        )}
        <span className="truncate text-sm font-bold">{stream.title}</span>
        <span className="text-xs text-white/60 flex items-center gap-1">
          <Users size={12} /> {viewerCount}
        </span>
        {user?.id === stream.userId && (
          <Link to="/creator-hub?tab=live_studio" className="ml-auto text-xs font-bold text-sky-400 hover:text-sky-300">
            Studio controls
          </Link>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_360px]">
        <div className="relative min-h-0 bg-black flex items-center justify-center">
          {whepPlayPath && token ? (
            <div className="relative h-full w-full min-h-[16rem]">
              <LiveWhepPlayer
                key={`live-whep-${stream.id}`}
                whepPlayPath={whepPlayPath}
                token={token}
                muted={watchMuted}
                hlsUrl={playback}
                lowLatency={playbackLowLatency}
                className="h-full w-full min-h-[16rem]"
                onError={(msg) => {
                  if (!/Waiting for OBS|obs_not_publishing/i.test(msg)) toast.error(msg);
                }}
              />
              <button
                type="button"
                onClick={() => setWatchMuted((m) => !m)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white border border-white/20"
              >
                {watchMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          ) : playback && hlsReady ? (
            <div className="relative h-full w-full min-h-[16rem]">
              <UniversalVideoPlayer
                key={`live-hls-${stream.id}-${hlsReady}`}
                src={playback}
                context="fullscreen"
                live
                lowLatency={playbackLowLatency}
                loop={false}
                muted={watchMuted}
                autoplay
                isActive
                preload="auto"
                className="h-full w-full max-h-full min-h-[16rem]"
                onError={() => toast.error('Live video failed to play')}
              />
              <button
                type="button"
                onClick={() => setWatchMuted((m) => !m)}
                className="absolute bottom-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-white border border-white/20"
              >
                {watchMuted ? 'Unmute' : 'Mute'}
              </button>
            </div>
          ) : (
            <div className="text-center p-6 text-white/80 text-sm max-w-md">
              <Radio className="mx-auto mb-3 text-red-500" size={28} />
              <p className="font-bold">{stream.title}</p>
              <p className="mt-2 text-xs text-white/60">
                {stream.mediaConfigured
                  ? playback
                    ? 'Connecting to live video…'
                    : 'HLS not ready yet — waiting for the encoder / media server.'
                  : 'Playback URL not configured. Deploy MediaMTX and set LIVESTREAM_HLS_PUBLIC_BASE (see docs/video-engine/LIVE.md).'}
              </p>
            </div>
          )}
        </div>

        <div className="flex min-h-[240px] flex-col border-t border-white/10 bg-zinc-950 lg:min-h-0 lg:border-t-0 lg:border-l">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-bold">Live chat</div>
          <div className="flex-1 overflow-y-auto space-y-2 px-4 py-3 text-xs">
            {chat.map((m) => (
              <div key={m.id}>
                <span className="font-bold text-sky-400">{m.sender}: </span>
                <span className="text-white/90">{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => void sendChat(e)} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something…"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-primary-foreground">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
