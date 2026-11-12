import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DoorOpen,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Plus,
  UserMinus,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { ConnectionState } from 'livekit-client';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { getSocket } from '../../lib/socket';
import { useLiveKitGroupRoom, type LiveKitTile } from '../../hooks/useLiveKitGroupRoom';
import { adaptiveModeLabel } from '../../lib/callLowNetwork.logic';
import {
  sfuApproveSpeaker,
  sfuLowerHand,
  sfuRaiseHand,
  sfuRemoveParticipant,
  sfuSetHlsUrl,
} from '../../lib/sfuApi';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';
import { useValueChanged } from '../../hooks/useValueChanged';

type SfuStatus = {
  enabled: boolean;
  provider: string;
  iceServers?: Array<Record<string, unknown>>;
  stage?: Record<string, unknown>;
  capacity?: {
    defaultRegionId?: string;
    multiRegionReady?: boolean;
    regions?: Array<{ id: string; label: string; hasLivekitUrl?: boolean }>;
    notes?: string[];
  };
};

type SfuMember = {
  userId: string;
  role?: string;
  displayName?: string | null;
  handRaised?: boolean;
  isSelf?: boolean;
};

type SfuDelivery = {
  hint?: string;
  reason?: string;
  useHlsForAudience?: boolean;
};

type SfuRoom = {
  id: string;
  name?: string;
  title?: string;
  status: string;
  hostUserId: string;
  maxParticipants: number;
  mode?: 'hangout' | 'stage';
  maxStagePublishers?: number;
  publisherCount?: number;
  audienceCount?: number;
  handsRaised?: number;
  hlsPlaybackUrl?: string | null;
  delivery?: SfuDelivery;
  members?: SfuMember[];
};

type JoinPayload = {
  room: SfuRoom;
  join: {
    provider: string;
    token: string;
    url: string | null;
    iceServers: RTCIceServer[];
    roomName: string;
    role: string;
  };
  socketRoom: string;
};

function authHeaders(token: string | null | undefined) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function roleCanPublish(role: string | undefined | null) {
  return role === 'host' || role === 'moderator' || role === 'publisher';
}

function roleCanModerate(role: string | undefined | null) {
  return role === 'host' || role === 'moderator';
}

type PeerSlot = {
  userId: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  pendingIce: RTCIceCandidateInit[];
};

export const SfuRoomView: React.FC<{ routeRoomId?: string }> = ({ routeRoomId }) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const livekit = useLiveKitGroupRoom();

  const [status, setStatus] = useState<SfuStatus | null>(null);
  const [title, setTitle] = useState(() => searchParams.get('title')?.slice(0, 120) || 'WevSoft room');
  const [joinId, setJoinId] = useState(routeRoomId || '');
  const [room, setRoom] = useState<SfuRoom | null>(null);
  const [joinCred, setJoinCred] = useState<JoinPayload['join'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [roomMode, setRoomMode] = useState<'hangout' | 'stage'>('hangout');
  const [joinAsAudience, setJoinAsAudience] = useState(false);
  const [hlsUrlDraft, setHlsUrlDraft] = useState('');
  const [preferHls, setPreferHls] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState<Array<{ userId: string; stream: MediaStream }>>([]);
  const autoCreateTried = useRef(false);
  const autoJoinTried = useRef<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerSlot>>(new Map());
  const myId = user?.id || '';
  const roomIdRef = useRef<string>('');
  const unbindSocketRef = useRef<(() => void) | null>(null);

  const myMember = (room?.members || []).find((m) => m.userId === myId);
  const myRole = joinCred?.role || myMember?.role || 'publisher';
  const isModerator = roleCanModerate(myRole);
  const isLivekit = joinCred?.provider === 'livekit';
  const isStage = (room?.mode || 'hangout') === 'stage';
  const publisherIds = new Set(
    (room?.members || []).filter((m) => roleCanPublish(m.role)).map((m) => m.userId),
  );

  // Route / ?title= changes → adopt them (adjusted during render; mount handled by the initializers).
  const routeRoomChanged = useValueChanged(routeRoomId);
  if (routeRoomChanged && routeRoomId) setJoinId(routeRoomId);
  const searchChanged = useValueChanged(searchParams);
  if (searchChanged) {
    const qTitle = searchParams.get('title');
    if (qTitle) setTitle(qTitle.slice(0, 120));
  }

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await fetch('/api/sfu/status', { headers: authHeaders(token) });
        if (!res.ok) throw new Error('status failed');
        setStatus(await res.json());
      } catch {
        setStatus({ enabled: false, provider: 'none' });
      }
    })();
  }, [token]);

  const teardownPeers = () => {
    for (const peer of peersRef.current.values()) {
      try {
        peer.pc.close();
      } catch {
        /* ignore */
      }
    }
    peersRef.current.clear();
    setRemoteStreams([]);
  };

  const stopLocal = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => {
      unbindSocketRef.current?.();
      unbindSocketRef.current = null;
      teardownPeers();
      stopLocal();
      void livekit.disconnect();
      const sock = getSocket(myId);
      if (roomIdRef.current) sock?.emit('sfu:leave', { roomId: roomIdRef.current });
      roomIdRef.current = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => {});
    }
    return stream;
  };

  const upsertRemote = (userId: string, stream: MediaStream) => {
    setRemoteStreams((prev) => {
      const without = prev.filter((r) => r.userId !== userId);
      return [...without, { userId, stream }];
    });
  };

  const getOrCreatePeer = async (remoteUserId: string, iceServers: RTCIceServer[], polite: boolean) => {
    const existing = peersRef.current.get(remoteUserId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers });
    const slot: PeerSlot = { userId: remoteUserId, pc, pendingIce: [] };
    peersRef.current.set(remoteUserId, slot);

    const local = localStreamRef.current;
    local?.getTracks().forEach((track) => pc.addTrack(track, local));

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      slot.stream = stream;
      upsertRemote(remoteUserId, stream);
    };

    pc.onicecandidate = (ev) => {
      const rid = roomIdRef.current;
      if (!ev.candidate || !rid) return;
      getSocket(myId)?.emit('sfu:signal', {
        roomId: rid,
        toUserId: remoteUserId,
        payload: { type: 'ice', candidate: ev.candidate },
      });
    };

    if (polite) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      getSocket(myId)?.emit('sfu:signal', {
        roomId: roomIdRef.current,
        toUserId: remoteUserId,
        payload: { type: 'offer', sdp: offer },
      });
    }

    return slot;
  };

  const flushIce = async (peer: PeerSlot) => {
    const queued = peer.pendingIce.splice(0);
    for (const c of queued) {
      try {
        await peer.pc.addIceCandidate(c);
      } catch {
        /* stale candidate */
      }
    }
  };

  const leaveRoom = async (opts?: { kicked?: boolean }) => {
    unbindSocketRef.current?.();
    unbindSocketRef.current = null;
    const rid = room?.id || roomIdRef.current;
    roomIdRef.current = '';
    if (token && rid && !opts?.kicked) {
      try {
        await fetch(`/api/sfu/rooms/${encodeURIComponent(rid)}/leave`, {
          method: 'POST',
          headers: authHeaders(token),
          body: '{}',
        });
      } catch {
        /* ignore */
      }
      getSocket(myId)?.emit('sfu:leave', { roomId: rid });
    }
    teardownPeers();
    stopLocal();
    await livekit.disconnect();
    setRoom(null);
    setJoinCred(null);
    navigate('/sfu', { replace: true });
  };

  const bindRoomSockets = (roomId: string, iceServers: RTCIceServer[], provider: string) => {
    const sock = getSocket(myId);
    if (!sock) return undefined;
    unbindSocketRef.current?.();

    const onJoined = () => {
      /* membership confirmed */
    };

    const onMember = async (payload: { userId?: string | null; roomId?: string }) => {
      if (provider === 'livekit') return;
      const peerId = String(payload?.userId || '');
      if (!peerId || peerId === myId) return;
      const polite = myId < peerId;
      try {
        await getOrCreatePeer(peerId, iceServers, polite);
      } catch (e: any) {
        toast.error(e?.message || 'Peer connect failed');
      }
    };

    const onSignal = async (envelope: {
      fromUserId?: string;
      toUserId?: string | null;
      payload?: any;
      roomId?: string;
    }) => {
      if (provider === 'livekit') return;
      const from = String(envelope.fromUserId || '');
      if (!from || from === myId) return;
      if (envelope.toUserId && envelope.toUserId !== myId) return;
      const payload = envelope.payload;
      if (!payload) return;

      try {
        const peer = await getOrCreatePeer(from, iceServers, false);
        if (payload.type === 'offer' && payload.sdp) {
          await peer.pc.setRemoteDescription(payload.sdp);
          await flushIce(peer);
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          sock.emit('sfu:signal', {
            roomId,
            toUserId: from,
            payload: { type: 'answer', sdp: answer },
          });
        } else if (payload.type === 'answer' && payload.sdp) {
          await peer.pc.setRemoteDescription(payload.sdp);
          await flushIce(peer);
        } else if (payload.type === 'ice' && payload.candidate) {
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(payload.candidate);
          else peer.pendingIce.push(payload.candidate);
        }
      } catch {
        /* ignore transient signal races */
      }
    };

    const onDenied = (p: { reason?: string }) => {
      toast.error(p?.reason || 'SFU join denied');
    };

    const onMemberLeft = (payload: { userId?: string | null }) => {
      if (provider === 'livekit') return;
      const peerId = String(payload?.userId || '');
      const slot = peersRef.current.get(peerId);
      if (!slot) return;
      try {
        slot.pc.close();
      } catch {
        /* ignore */
      }
      peersRef.current.delete(peerId);
      setRemoteStreams((prev) => prev.filter((r) => r.userId !== peerId));
    };

    const onRoomPatch = (payload: { room?: SfuRoom }) => {
      if (payload?.room?.id === roomId) setRoom(payload.room);
    };

    const onCredential = async (payload: { roomId?: string; join?: JoinPayload['join'] }) => {
      if (payload?.roomId !== roomId || !payload.join) return;
      setJoinCred(payload.join);
      if (payload.join.provider === 'livekit' && payload.join.url && payload.join.token) {
        try {
          await livekit.reconnectWithToken({
            url: payload.join.url,
            token: payload.join.token,
            publish: roleCanPublish(payload.join.role),
          });
          toast.success('Speaker access granted');
        } catch (e: any) {
          toast.error(e?.message || 'Could not refresh LiveKit session');
        }
      }
    };

    const onKicked = (payload: { roomId?: string }) => {
      if (payload?.roomId !== roomId) return;
      toast.error('Removed from the room');
      void leaveRoom({ kicked: true });
    };

    sock.on('sfu:joined', onJoined);
    sock.on('sfu:member-left', onMemberLeft);
    sock.on('sfu:member-joined', onMember);
    sock.on('sfu:signal', onSignal);
    sock.on('sfu:denied', onDenied);
    sock.on('sfu:room-updated', onRoomPatch);
    sock.on('sfu:hand-raised', onRoomPatch);
    sock.on('sfu:hand-lowered', onRoomPatch);
    sock.on('sfu:speaker-approved', onRoomPatch);
    sock.on('sfu:member-removed', onRoomPatch);
    sock.on('sfu:credential', onCredential);
    sock.on('sfu:kicked', onKicked);
    sock.emit('sfu:join', { roomId });

    const unbind = () => {
      sock.off('sfu:joined', onJoined);
      sock.off('sfu:member-left', onMemberLeft);
      sock.off('sfu:member-joined', onMember);
      sock.off('sfu:signal', onSignal);
      sock.off('sfu:denied', onDenied);
      sock.off('sfu:room-updated', onRoomPatch);
      sock.off('sfu:hand-raised', onRoomPatch);
      sock.off('sfu:hand-lowered', onRoomPatch);
      sock.off('sfu:speaker-approved', onRoomPatch);
      sock.off('sfu:member-removed', onRoomPatch);
      sock.off('sfu:credential', onCredential);
      sock.off('sfu:kicked', onKicked);
    };
    unbindSocketRef.current = unbind;
    return unbind;
  };

  const enterRoom = async (payload: JoinPayload) => {
    roomIdRef.current = payload.room.id;
    setRoom(payload.room);
    setJoinCred(payload.join);
    if (payload.room.hlsPlaybackUrl) setHlsUrlDraft(payload.room.hlsPlaybackUrl);
    if (payload.room.delivery?.useHlsForAudience && payload.room.hlsPlaybackUrl && !roleCanPublish(payload.join.role)) {
      setPreferHls(true);
    }
    navigate(`/sfu/${payload.room.id}`, { replace: true });
    bindRoomSockets(payload.room.id, payload.join.iceServers || [], payload.join.provider);

    if (payload.join.provider === 'livekit') {
      if (!payload.join.url || !payload.join.token) {
        toast.error('LiveKit join missing url/token');
        return;
      }
      try {
        await livekit.connect({
          url: payload.join.url,
          token: payload.join.token,
          publish: roleCanPublish(payload.join.role),
        });
        toast.success('Joined LiveKit room');
      } catch (e: any) {
        toast.error(e?.message || 'LiveKit connect failed');
      }
      return;
    }

    try {
      await ensureLocalMedia();
      for (const m of payload.room.members || []) {
        if (m.userId === myId) continue;
        const polite = myId < m.userId;
        await getOrCreatePeer(m.userId, payload.join.iceServers || [], polite);
      }
      toast.success('Joined SFU room');
    } catch (e: any) {
      toast.error(e?.message || 'Camera/mic blocked');
    }
  };

  const createRoom = async (overrideTitle?: string) => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch('/api/sfu/rooms', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          title: (overrideTitle || title).trim() || 'WevSoft room',
          mode: roomMode,
          ...(roomMode === 'stage'
            ? {
                maxParticipants: 200,
                maxStagePublishers: 8,
                hlsPlaybackUrl: hlsUrlDraft.trim() || undefined,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Create failed');
      await enterRoom(data as JoinPayload);
    } catch (e: any) {
      toast.error(e?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = async (id?: string) => {
    const target = (id || joinId).trim();
    if (!token || !target) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sfu/rooms/${encodeURIComponent(target)}/join`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(joinAsAudience ? { role: 'subscriber' } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Join failed');
      if (data?.room?.mode === 'stage' && !joinAsAudience && data?.join?.role === 'subscriber') {
        /* server defaulted audience for stage — fine */
      }
      await enterRoom(data as JoinPayload);
    } catch (e: any) {
      toast.error(e?.message || 'Join failed');
    } finally {
      setBusy(false);
    }
  };

  // Messenger / deep-link: /sfu?create=1&title=...
  useEffect(() => {
    if (!token || room || autoCreateTried.current || status?.enabled === false) return;
    if (searchParams.get('create') !== '1') return;
    autoCreateTried.current = true;
    const t = searchParams.get('title') || title;
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void createRoom(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, room, searchParams]);

  // Deep-link join when navigating to /sfu/:roomId while not already in room
  useEffect(() => {
    if (!token || !routeRoomId || room || status?.enabled === false) return;
    if (busy) return;
    if (autoJoinTried.current === routeRoomId) return;
    autoJoinTried.current = routeRoomId;
    void joinRoom(routeRoomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, routeRoomId, status?.enabled]);

  const toggleMic = () => {
    if (isLivekit) {
      void livekit.toggleMic();
      return;
    }
    const next = !micOn;
    setMicOn(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const toggleCam = () => {
    if (isLivekit) {
      void livekit.toggleCam();
      return;
    }
    const next = !camOn;
    setCamOn(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
  };

  const handleRaiseHand = async () => {
    if (!token || !room) return;
    try {
      const data = await sfuRaiseHand(token, room.id);
      if (data?.room) setRoom(data.room);
      toast.success('Hand raised');
    } catch (e: any) {
      toast.error(e?.message || 'Raise hand failed');
    }
  };

  const handleLowerHand = async (userId?: string) => {
    if (!token || !room) return;
    try {
      const data = await sfuLowerHand(token, room.id, userId);
      if (data?.room) setRoom(data.room);
    } catch (e: any) {
      toast.error(e?.message || 'Lower hand failed');
    }
  };

  const handleApprove = async (userId: string) => {
    if (!token || !room) return;
    try {
      const data = await sfuApproveSpeaker(token, room.id, userId);
      if (data?.room) setRoom(data.room);
      toast.success('Speaker approved');
    } catch (e: any) {
      toast.error(e?.message || 'Approve failed');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!token || !room) return;
    try {
      const data = await sfuRemoveParticipant(token, room.id, userId);
      if (data?.room) setRoom(data.room);
      toast.success('Participant removed');
    } catch (e: any) {
      toast.error(e?.message || 'Remove failed');
    }
  };

  const uiMicOn = isLivekit ? livekit.micOn : micOn;
  const uiCamOn = isLivekit ? livekit.camOn : camOn;
  const canPublishNow = isLivekit ? livekit.canPublish : true;

  if (!token) {
    return <p className="text-muted-foreground">Sign in to use SFU rooms.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
          WebSoft Connect
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Group rooms</h1>
        <p className="text-sm text-muted-foreground">
          Hangout & stage (LiveKit SFU). Separate from Live / Watch Party / 1:1 Connect. Provider:{' '}
          <span className="font-mono">{status?.provider || '…'}</span>
          {status && !status.enabled ? ' — set SFU_PROVIDER=stub or livekit' : null}
          {status?.capacity?.defaultRegionId
            ? ` · region ${status.capacity.defaultRegionId}${status.capacity.multiRegionReady ? ' (multi-region ready)' : ''}`
            : null}
        </p>
        {status?.capacity?.notes?.[0] ? (
          <p className="text-[11px] text-muted-foreground">{status.capacity.notes[0]}</p>
        ) : null}
      </header>

      {!room ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Plus className="h-4 w-4" /> Create room
            </div>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Room title"
            />
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRoomMode('hangout')}
                className={`rounded-lg border px-2.5 py-1.5 ${
                  roomMode === 'hangout' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                Hangout
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoomMode('stage');
                  setJoinAsAudience(true);
                }}
                className={`rounded-lg border px-2.5 py-1.5 ${
                  roomMode === 'stage' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                }`}
              >
                Stage (audience)
              </button>
            </div>
            {roomMode === 'stage' ? (
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                value={hlsUrlDraft}
                onChange={(e) => setHlsUrlDraft(e.target.value)}
                placeholder="Optional HLS URL (listen-only fallback)"
              />
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              {roomMode === 'stage'
                ? 'Stage caps publishers (≤8 default); joiners are audience. Needs LiveKit.'
                : 'Hangout = small group, everyone can publish.'}
            </p>
            <button
              type="button"
              disabled={busy || status?.enabled === false}
              onClick={() => void createRoom()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Video className="h-4 w-4" /> Create & join
            </button>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <DoorOpen className="h-4 w-4" /> Join by id
            </div>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              placeholder="room id"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={joinAsAudience}
                onChange={(e) => setJoinAsAudience(e.target.checked)}
              />
              Join as audience (raise hand to speak)
            </label>
            <button
              type="button"
              disabled={busy || !joinId.trim() || status?.enabled === false}
              onClick={() => void joinRoom()}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              <Users className="h-4 w-4" /> Join
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl"
          data-testid="connect-sfu-stage"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(79,70,229,0.1),_transparent_50%)]" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                WebSoft Connect · {isStage ? 'Stage' : 'Hangout'}
              </p>
              <h2 className="truncate text-lg font-semibold sm:text-xl">
                {room.title || room.name || room.id}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-white/50">
                {room.id.slice(0, 12)}
                {isLivekit ? ` · LiveKit ${livekit.connectionState}` : ' · stub mesh'}
                {myRole ? ` · ${myRole}` : ''}
                {isLivekit && livekit.adaptiveMode !== 'full'
                  ? ` · ${adaptiveModeLabel(livekit.adaptiveMode)}`
                  : null}
                {isStage
                  ? ` · ${room.publisherCount ?? publisherIds.size}/${room.maxStagePublishers ?? 8} on stage · ${room.audienceCount ?? 0} audience`
                  : null}
              </p>
              {room.delivery?.reason ? (
                <p className="mt-1 max-w-xl text-[11px] text-white/45">{room.delivery.reason}</p>
              ) : null}
            </div>
          </div>

          {livekit.error ? (
            <p className="relative z-10 px-4 pt-2 text-sm text-amber-200 sm:px-5">{livekit.error}</p>
          ) : null}

          {isStage && room.hlsPlaybackUrl && !canPublishNow ? (
            <div className="relative z-10 px-4 pt-3 sm:px-5">
              <button
                type="button"
                onClick={() => setPreferHls((v) => !v)}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/15"
              >
                {preferHls ? 'Switch to LiveKit stage' : 'Watch via HLS (higher latency)'}
              </button>
            </div>
          ) : null}

          <div className="relative z-10 min-h-[280px] px-3 py-4 sm:px-5">
            {preferHls && room.hlsPlaybackUrl && !canPublishNow ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video">
                <UniversalVideoPlayer
                  src={room.hlsPlaybackUrl}
                  context="fullscreen"
                  autoplay
                  muted
                  live
                  isActive
                  className="h-full w-full"
                />
              </div>
            ) : isLivekit ? (
              <SfuParticipantGrid
                tiles={
                  isStage
                    ? livekit.tiles.filter((t) => t.isLocal || publisherIds.has(t.identity))
                    : livekit.tiles
                }
                activeSpeakerIds={livekit.activeSpeakerIds}
                connecting={livekit.connectionState === ConnectionState.Connecting}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-black">
                  <video ref={localVideoRef} muted playsInline autoPlay className="h-full w-full object-cover" />
                  <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white/90">
                    You
                  </div>
                </div>
                {remoteStreams.map((r) => (
                  <RemoteTile key={r.userId} userId={r.userId} stream={r.stream} />
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 px-4 pb-5 pt-1 sm:px-5">
            {canPublishNow ? (
              <>
                <SfuDockBtn
                  title={uiMicOn ? 'Mute' : 'Unmute'}
                  active={!uiMicOn}
                  onClick={toggleMic}
                >
                  {uiMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </SfuDockBtn>
                <SfuDockBtn
                  title={uiCamOn ? 'Camera off' : 'Camera on'}
                  active={!uiCamOn}
                  onClick={toggleCam}
                >
                  {uiCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </SfuDockBtn>
                {isLivekit ? (
                  <SfuDockBtn
                    title={livekit.screenOn ? 'Stop sharing' : 'Share screen'}
                    active={livekit.screenOn}
                    onClick={() => void livekit.toggleScreen()}
                  >
                    <MonitorUp className="h-5 w-5" />
                  </SfuDockBtn>
                ) : null}
              </>
            ) : (
              <SfuDockBtn
                title={myMember?.handRaised ? 'Hand raised' : 'Raise hand'}
                active={Boolean(myMember?.handRaised)}
                disabled={Boolean(myMember?.handRaised)}
                onClick={() => void handleRaiseHand()}
              >
                <Hand className="h-5 w-5" />
              </SfuDockBtn>
            )}
            {myMember?.handRaised && myRole !== 'host' && myRole !== 'moderator' ? (
              <button
                type="button"
                onClick={() => void handleLowerHand()}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/85 hover:bg-white/15"
              >
                Lower hand
              </button>
            ) : null}
            <SfuDockBtn danger title="Leave room" onClick={() => void leaveRoom()}>
              <PhoneOff className="h-5 w-5" />
            </SfuDockBtn>
          </div>

          {isStage && isModerator ? (
            <div className="relative z-10 mx-4 mb-4 flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:mx-5">
              <div className="min-w-[220px] flex-1 space-y-1">
                <label className="text-[11px] font-medium uppercase tracking-wide text-white/50">
                  HLS listen-only URL
                </label>
                <input
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-mono text-white outline-none focus:border-sky-400"
                  value={hlsUrlDraft}
                  onChange={(e) => setHlsUrlDraft(e.target.value)}
                  placeholder="https://…/index.m3u8"
                />
              </div>
              <button
                type="button"
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                onClick={() => {
                  if (!token || !room) return;
                  void sfuSetHlsUrl(token, room.id, hlsUrlDraft.trim() || null)
                    .then((data) => {
                      if (data?.room) setRoom(data.room);
                      toast.success(hlsUrlDraft.trim() ? 'HLS URL saved' : 'HLS URL cleared');
                    })
                    .catch((e: any) => toast.error(e?.message || 'Save failed'));
                }}
              >
                Save HLS
              </button>
            </div>
          ) : null}

          <div className="relative z-10 border-t border-white/10 bg-black/30 px-4 py-3 sm:px-5">
            <MemberPanel
              members={room.members || []}
              myId={myId}
              isModerator={isModerator}
              stageMode={isStage}
              onApprove={(id) => void handleApprove(id)}
              onLower={(id) => void handleLowerHand(id)}
              onRemove={(id) => void handleRemove(id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function SfuDockBtn({
  onClick,
  danger,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'bg-red-500 text-white hover:bg-red-600'
          : active
            ? 'bg-white text-zinc-900'
            : 'bg-white/15 text-white hover:bg-white/25',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SfuParticipantGrid({
  tiles,
  activeSpeakerIds,
  connecting,
}: {
  tiles: LiveKitTile[];
  activeSpeakerIds: string[];
  connecting: boolean;
}) {
  const speakerId = activeSpeakerIds[0];
  const focused = speakerId ? tiles.find((t) => t.identity === speakerId) : null;
  const rest = focused ? tiles.filter((t) => t.identity !== focused.identity) : tiles;

  if (!tiles.length) {
    return (
      <p className="py-16 text-center text-sm text-white/50">
        {connecting ? 'Connecting to LiveKit…' : 'Waiting for participants…'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {focused ? (
        <LiveKitTileView tile={focused} speaking emphasis />
      ) : null}
      <div
        className={[
          'grid gap-3',
          rest.length <= 1 ? 'grid-cols-1 max-w-xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3',
        ].join(' ')}
      >
        {(focused ? rest : tiles).map((tile) => (
          <LiveKitTileView
            key={tile.identity}
            tile={tile}
            speaking={activeSpeakerIds.includes(tile.identity)}
          />
        ))}
      </div>
      {connecting ? <p className="text-sm text-white/50">Connecting to LiveKit…</p> : null}
    </div>
  );
}

function MemberPanel({
  members,
  myId,
  isModerator,
  stageMode,
  onApprove,
  onLower,
  onRemove,
}: {
  members: SfuMember[];
  myId: string;
  isModerator: boolean;
  stageMode?: boolean;
  onApprove: (userId: string) => void;
  onLower: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  const stage = members.filter((m) => roleCanPublish(m.role));
  const audience = members.filter((m) => !roleCanPublish(m.role));
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-white/50">
        {stageMode ? `Stage (${stage.length}) · Audience (${audience.length})` : 'Members'}
      </div>
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-white/90">
              {m.displayName || m.userId.slice(0, 10)}
              <span className="ml-2 font-mono text-[11px] text-white/45">{m.role || '—'}</span>
              {m.handRaised ? (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-300">
                  <Hand className="h-3.5 w-3.5" /> hand
                </span>
              ) : null}
              {m.userId === myId ? <span className="ml-2 text-white/45">(you)</span> : null}
            </span>
            {isModerator && m.userId !== myId ? (
              <span className="flex flex-wrap gap-1">
                {m.handRaised ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(m.userId)}
                      className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onLower(m.userId)}
                      className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15"
                    >
                      Lower
                    </button>
                  </>
                ) : null}
                {m.role !== 'host' ? (
                  <button
                    type="button"
                    onClick={() => onRemove(m.userId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300"
                  >
                    <UserMinus className="h-3 w-3" /> Remove
                  </button>
                ) : null}
              </span>
            ) : null}
          </li>
        ))}
        {!members.length ? <li className="text-xs text-white/40">—</li> : null}
      </ul>
    </div>
  );
}

function LiveKitTileView({
  tile,
  speaking,
  emphasis,
}: {
  tile: LiveKitTile;
  speaking: boolean;
  emphasis?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (tile.videoTrack) {
      el.srcObject = new MediaStream([tile.videoTrack]);
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [tile.videoTrack]);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    if (tile.screenTrack) {
      el.srcObject = new MediaStream([tile.screenTrack]);
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [tile.screenTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || tile.isLocal) return;
    if (tile.audioTrack) {
      el.srcObject = new MediaStream([tile.audioTrack]);
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [tile.audioTrack, tile.isLocal]);

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border bg-black aspect-video',
        speaking ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-white/15',
        emphasis ? 'max-h-[52vh] w-full' : '',
      ].join(' ')}
    >
      <video ref={videoRef} muted={tile.isLocal} playsInline autoPlay className="h-full w-full object-cover" />
      {tile.screenTrack ? (
        <video
          ref={screenRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-contain bg-black/80"
        />
      ) : null}
      {!tile.isLocal ? <audio ref={audioRef} autoPlay playsInline /> : null}
      {!tile.isCameraEnabled && !tile.screenTrack ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/25 text-2xl font-semibold text-sky-200">
            {(tile.isLocal ? 'Y' : tile.name || '?').slice(0, 1).toUpperCase()}
          </span>
        </div>
      ) : null}
      <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white/90">
        {tile.isLocal ? 'You' : tile.name.slice(0, 24)}
        {!tile.isCameraEnabled && !tile.screenTrack ? ' · cam off' : ''}
        {!tile.isMicrophoneEnabled ? ' · muted' : ''}
      </div>
    </div>
  );
}

function RemoteTile({ userId, stream }: { userId: string; stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      void ref.current.play().catch(() => {});
    }
  }, [stream]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-black">
      <video ref={ref} playsInline autoPlay className="h-full w-full object-cover" />
      <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2.5 py-0.5 font-mono text-xs text-white/90">
        {userId.slice(0, 8)}
      </div>
    </div>
  );
}
