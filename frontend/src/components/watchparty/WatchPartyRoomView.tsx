import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Video, Play, Pause, Users, Send, Share2, LogOut, Plus, DoorOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { getSocket } from '../../lib/socket';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import {
  WatchPartyYoutubePlayer,
  type YtPlayerHandle,
} from './WatchPartyYoutubePlayer';
import { isYoutubeWatchUrl } from '../../lib/youtubeWatchParty';
import {
  formatWatchTime,
  resolvePlaybackAction,
  shouldApplyRemoteSeek,
} from '../../lib/watchPartySync';

type MemberChip = {
  userId?: string;
  id?: string;
  user?: { id: string; name?: string | null; avatar?: string | null };
  role?: string;
  name?: string;
  avatar?: string;
};

type Party = {
  id: string;
  title: string;
  videoUrl: string;
  status: string;
  currentTime: number;
  inviteCode: string;
  hostId: string;
  maxMembers: number;
  host?: { id: string; name?: string | null; avatar?: string | null };
  members?: MemberChip[];
  _count?: { members: number };
};

type ChatMsg = { id: string; sender: string; text: string; reaction?: string };

function authHeaders(token: string | null | undefined) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function memberKey(m: MemberChip): string {
  return m.user?.id || m.userId || m.id || '';
}

function memberName(m: MemberChip): string {
  return m.user?.name || m.name || 'Watcher';
}

export const WatchPartyRoomView: React.FC<{ routeCode?: string }> = ({ routeCode }) => {
  const code = routeCode?.trim() || undefined;
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const [lobbyParties, setLobbyParties] = useState<Party[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<MemberChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: 'sys', sender: 'System', text: 'Welcome to Watch Party — VOD sync is live.' },
  ]);
  const [inputText, setInputText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: number; emoji: string; left: number }>>([]);
  const [syncedAt, setSyncedAt] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytApiRef = useRef<YtPlayerHandle | null>(null);
  const applyingRemote = useRef(false);
  const lastHostEmit = useRef(0);
  const lastPersist = useRef(0);
  const partyIdRef = useRef<string | null>(null);

  const isHost = !!(user?.id && party?.hostId === user.id);
  const isYoutube = !!(party?.videoUrl && isYoutubeWatchUrl(party.videoUrl));

  const loadLobby = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/watch-party', { headers: authHeaders(token) });
      if (res.ok) setLobbyParties(await res.json());
    } catch {
      /* ignore */
    }
  }, [token]);

  const enterParty = useCallback(
    async (partyCode: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const joinRes = await fetch(`/api/watch-party/${encodeURIComponent(partyCode)}/join`, {
          method: 'POST',
          headers: authHeaders(token),
        });
        if (!joinRes.ok) {
          const err = await joinRes.json().catch(() => ({}));
          toast.error(err.error || 'Could not join party');
          return;
        }
        const data: Party = await joinRes.json();
        setParty(data);
        setMembers(data.members || []);
        setIsPlaying(data.status === 'playing');
        setSyncedAt(Number(data.currentTime) || 0);
        partyIdRef.current = data.id;
        if (code !== data.inviteCode && code !== data.id) {
          navigate(`/watch-party/${data.inviteCode}`, { replace: true });
        }
      } catch {
        toast.error('Join failed');
      } finally {
        setLoading(false);
      }
    },
    [token, code, navigate],
  );

  // Lobby load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    if (!code) void loadLobby();
  }, [code, loadLobby]);

  // Room enter
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external subscription: resets state, then follows the subscribed source
    if (code && token) void enterParty(code);
  }, [code, token, enterParty]);

  // Socket wiring
  useEffect(() => {
    if (!party?.id || !user?.id) return;
    const socket = getSocket(user.id);
    const partyId = party.id;

    socket.emit('watchparty:join', {
      partyId,
      name: user.name,
      avatar: user.avatar,
    });

    const onDenied = () => toast.error('Not allowed in this party');
    const onJoined = (payload: MemberChip) => {
      setMembers((prev) => {
        const id = payload.userId || payload.id;
        if (!id || prev.some((m) => memberKey(m) === id)) return prev;
        return [...prev, { userId: id, name: payload.name, avatar: payload.avatar }];
      });
    };
    const onLeft = (payload: { userId: string }) => {
      setMembers((prev) => prev.filter((m) => memberKey(m) !== payload.userId));
    };
    const onSync = (payload: { status: string; currentTime: number }) => {
      if (isHost) return;
      applyingRemote.current = true;
      setSyncedAt(payload.currentTime || 0);
      const action = resolvePlaybackAction(payload.status);
      const yt = ytApiRef.current;
      if (yt) {
        if (shouldApplyRemoteSeek(yt.getCurrentTime(), payload.currentTime || 0)) {
          yt.seekTo(payload.currentTime || 0);
        }
        if (action === 'play') {
          setIsPlaying(true);
          yt.play();
        } else if (action === 'pause') {
          setIsPlaying(false);
          yt.pause();
        }
      } else {
        const el = videoRef.current;
        if (el) {
          if (shouldApplyRemoteSeek(el.currentTime || 0, payload.currentTime || 0)) {
            el.currentTime = payload.currentTime || 0;
          }
          if (action === 'play') {
            setIsPlaying(true);
            void el.play().catch(() => {});
          } else if (action === 'pause') {
            setIsPlaying(false);
            el.pause();
          }
        }
      }
      window.setTimeout(() => {
        applyingRemote.current = false;
      }, 80);
    };
    const onChat = (payload: {
      name?: string;
      text?: string;
      reaction?: string;
      userId?: string;
      at?: number;
    }) => {
      if (payload.reaction) {
        const id = Date.now() + Math.random();
        setFloatingEmojis((prev) => [...prev, { id, emoji: payload.reaction!, left: 10 + Math.random() * 70 }]);
        window.setTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
        }, 2500);
      }
      if (payload.text) {
        setChatMessages((prev) => [
          ...prev.slice(-80),
          {
            id: `${payload.at || Date.now()}-${payload.userId || 'u'}`,
            sender: payload.name || 'Watcher',
            text: payload.text!,
          },
        ]);
      }
    };
    const onEnded = () => {
      toast('Party ended by host');
      setParty(null);
      partyIdRef.current = null;
      navigate('/watch-party');
    };

    socket.on('watchparty:denied', onDenied);
    socket.on('watchparty:member-joined', onJoined);
    socket.on('watchparty:member-left', onLeft);
    socket.on('watchparty:sync', onSync);
    socket.on('watchparty:chat', onChat);
    socket.on('watchparty:ended', onEnded);

    return () => {
      socket.emit('watchparty:leave', { partyId });
      socket.off('watchparty:denied', onDenied);
      socket.off('watchparty:member-joined', onJoined);
      socket.off('watchparty:member-left', onLeft);
      socket.off('watchparty:sync', onSync);
      socket.off('watchparty:chat', onChat);
      socket.off('watchparty:ended', onEnded);
    };
  }, [party?.id, user?.id, user?.name, user?.avatar, isHost, navigate]);

  // Apply initial host position for late joiners
  useEffect(() => {
    if (!party || isHost) return;
    const el = videoRef.current;
    if (!el) return;
    const t = Number(party.currentTime) || 0;
    applyingRemote.current = true;
    el.currentTime = t;
    if (party.status === 'playing') {
      void el.play().catch(() => {});
      // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
    window.setTimeout(() => {
      applyingRemote.current = false;
    }, 100);
  }, [party?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitHostSync = useCallback(
    (status: string, currentTime: number, force = false) => {
      if (!isHost || !party?.id || !user?.id) return;
      const now = Date.now();
      if (!force && now - lastHostEmit.current < 400) return;
      lastHostEmit.current = now;
      getSocket(user.id).emit('watchparty:sync', {
        partyId: party.id,
        status,
        currentTime,
      });
      setSyncedAt(currentTime);
      if (force || now - lastPersist.current > 5000) {
        lastPersist.current = now;
        void fetch(`/api/watch-party/${party.id}/sync`, {
          method: 'PATCH',
          headers: authHeaders(token),
          body: JSON.stringify({ status, currentTime }),
        }).catch(() => {});
      }
    },
    [isHost, party?.id, user?.id, token],
  );

  const togglePlayPause = () => {
    if (!isHost) {
      toast('Only the host controls playback');
      return;
    }
    const yt = ytApiRef.current;
    if (yt) {
      if (isPlaying) {
        yt.pause();
        setIsPlaying(false);
        emitHostSync('paused', yt.getCurrentTime(), true);
      } else {
        yt.play();
        setIsPlaying(true);
        emitHostSync('playing', yt.getCurrentTime(), true);
      }
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      emitHostSync('paused', el.currentTime || 0, true);
    } else {
      void el.play().catch(() => {});
      setIsPlaying(true);
      emitHostSync('playing', el.currentTime || 0, true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/watch-party', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          title: title.trim() || 'Watch Party',
          videoUrl: videoUrl.trim(),
          isPublic,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Create failed');
        return;
      }
      toast.success('Party created');
      navigate(`/watch-party/${data.inviteCode}`);
    } catch {
      toast.error('Create failed');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = joinCode.trim();
    if (!c) return;
    navigate(`/watch-party/${c.toUpperCase()}`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !party?.id || !user?.id) return;
    getSocket(user.id).emit('watchparty:chat', {
      partyId: party.id,
      text: inputText.trim(),
      name: user.name,
    });
    setInputText('');
  };

  const handleSendReaction = (emoji: string) => {
    if (!party?.id || !user?.id) return;
    getSocket(user.id).emit('watchparty:chat', {
      partyId: party.id,
      reaction: emoji,
      name: user.name,
    });
  };

  const copyInvite = async () => {
    if (!party) return;
    const link = `${window.location.origin}/watch-party/${party.inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied');
    } catch {
      toast.success(`Code: ${party.inviteCode}`);
    }
  };

  const endOrLeave = async () => {
    if (!party?.id || !user?.id) return;
    if (isHost && token) {
      await fetch(`/api/watch-party/${party.id}/end`, {
        method: 'POST',
        headers: authHeaders(token),
      }).catch(() => {});
    }
    getSocket(user.id).emit('watchparty:leave', { partyId: party.id });
    setParty(null);
    partyIdRef.current = null;
    navigate('/watch-party');
  };

  // ── Lobby ──────────────────────────────────────────────────────────
  if (!code) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Video size={20} className="text-primary" /> Watch Party
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sync a direct video (mp4 / HLS /media) or a YouTube link with friends.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card/40 p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <Plus size={16} /> Create party
            </h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Party title"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Video URL (/media/…, mp4/HLS, or YouTube link)"
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              List in public lobby
            </label>
            <button
              type="submit"
              disabled={loading || !videoUrl.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              Create
            </button>
          </form>

          <form onSubmit={handleJoinSubmit} className="rounded-2xl border border-border bg-card/40 p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              <DoorOpen size={16} /> Join with code
            </h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Invite code"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="submit"
              className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold"
            >
              Join
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card/40 p-5">
          <h2 className="text-sm font-bold mb-3">Public parties</h2>
          {lobbyParties.length === 0 ? (
            <p className="text-xs text-muted-foreground">No public parties right now.</p>
          ) : (
            <ul className="space-y-2">
              {lobbyParties.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/watch-party/${p.inviteCode}`)}
                    className="w-full text-left rounded-xl border border-border px-3 py-2 hover:bg-muted/40"
                  >
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Host {p.host?.name || '—'} · {p._count?.members ?? 0} watching · {p.inviteCode}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Room ───────────────────────────────────────────────────────────
  if (!party) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {loading ? 'Joining party…' : 'Party not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Video className="text-primary" size={24} />
            <h1 className="text-xl font-extrabold text-foreground">{party.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {isPlaying ? 'PLAYING' : 'PAUSED'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Host: {party.host?.name || 'Host'} · Code:{' '}
            <strong className="text-primary font-mono">{party.inviteCode}</strong>
            {!isHost ? ' · Following host' : ' · You control playback'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void copyInvite()}
            className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-xs font-extrabold flex items-center gap-1.5"
          >
            <Share2 size={15} /> Share
          </button>
          <button
            type="button"
            onClick={() => void endOrLeave()}
            className="px-4 py-2 rounded-xl border border-border text-xs font-extrabold flex items-center gap-1.5 text-destructive"
          >
            <LogOut size={15} /> {isHost ? 'End' : 'Leave'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-border aspect-video">
            {isYoutube ? (
              <WatchPartyYoutubePlayer
                videoUrl={party.videoUrl}
                isHost={isHost}
                className="w-full h-full"
                onReady={(api) => {
                  ytApiRef.current = api;
                  if (!isHost && party.currentTime) {
                    applyingRemote.current = true;
                    api.seekTo(party.currentTime);
                    if (party.status === 'playing') api.play();
                    else api.pause();
                    window.setTimeout(() => {
                      applyingRemote.current = false;
                    }, 100);
                  }
                }}
                onHostPlay={() => {
                  if (applyingRemote.current) return;
                  setIsPlaying(true);
                  emitHostSync('playing', ytApiRef.current?.getCurrentTime() || 0, true);
                }}
                onHostPause={() => {
                  if (applyingRemote.current) return;
                  setIsPlaying(false);
                  emitHostSync('paused', ytApiRef.current?.getCurrentTime() || 0, true);
                }}
              />
            ) : (
              <UniversalVideoPlayer
                src={party.videoUrl}
                context="fullscreen"
                muted={false}
                autoplay={false}
                loop={false}
                isActive
                videoRef={videoRef}
                className="w-full h-full"
                onPlay={() => {
                  if (applyingRemote.current || !isHost) return;
                  setIsPlaying(true);
                  emitHostSync('playing', videoRef.current?.currentTime || 0, true);
                }}
                onPause={() => {
                  if (applyingRemote.current || !isHost) return;
                  setIsPlaying(false);
                  emitHostSync('paused', videoRef.current?.currentTime || 0, true);
                }}
                onTimeUpdate={(t) => {
                  if (!isHost || applyingRemote.current) return;
                  if (isPlaying) emitHostSync('playing', t, false);
                }}
              />
            )}

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {floatingEmojis.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 1, y: 280, scale: 0.8 }}
                  animate={{ opacity: 0, y: 40, scale: 1.5 }}
                  transition={{ duration: 2 }}
                  style={{ left: `${item.left}%` }}
                  className="absolute text-3xl"
                >
                  {item.emoji}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-xl border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={togglePlayPause}
              disabled={!isHost}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs shadow-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-40"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span>{isPlaying ? 'Pause for Room' : 'Play for Room'}</span>
            </button>

            <div className="flex items-center gap-2">
              {['❤️', '🔥', '👏', '😂', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendReaction(emoji)}
                  className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-border flex items-center justify-center text-lg active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-5 shadow-2xl flex flex-col h-[520px]">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
              <Users size={16} className="text-primary" /> Watchers ({members.length || 1})
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              Synced @ {formatWatchTime(syncedAt)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {members.slice(0, 12).map((m) => (
              <span
                key={memberKey(m)}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/30"
              >
                {memberName(m)}
                {(m.role === 'host' || memberKey(m) === party.hostId) ? ' · host' : ''}
              </span>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-xs space-y-0.5">
                <span className="font-extrabold text-primary">{msg.sender}:</span>{' '}
                <span className="text-foreground">{msg.text}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="pt-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Chat with watchers…"
              className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-extrabold text-xs"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
