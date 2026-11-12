import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import { useStore } from '../store';
import {
  acceptCallRequest,
  cancelCallRequest,
  createCallRequest,
  endCallRequest,
  missCallRequest,
  rejectCallRequest,
  type CallMediaType,
} from '../lib/callApi';
import { apiFetch } from '../lib/apiBase';
import {
  listCallDevices,
  nextFacingMode,
  supportsAudioOutputSelect,
  type CallDeviceInfo,
} from '../lib/callDevices';
import {
  qualityFromStats,
  sampleFromRtcStats,
  type CallNetworkQuality,
} from '../lib/callQuality.logic';
import {
  applyVideoEncodingToSender,
  nextAdaptiveMode,
  shouldAttemptIceRestart,
  shouldPauseOutboundVideo,
  type AdaptiveMediaMode,
} from '../lib/callLowNetwork.logic';
import {
  applyScreenTrackHints,
  buildScreenShareConstraints,
  detectScreenShareSupport,
} from '../lib/callScreenShare.logic';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ended';
export type { CallNetworkQuality, CallDeviceInfo, AdaptiveMediaMode };

interface IncomingCallInfo {
  callerId: string;
  callerName: string;
  callerSocket: string;
  type: CallMediaType;
  callId?: string;
  offer?: RTCSessionDescriptionInit;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
const DEFAULT_RING_MS = 45_000;

/**
 * 1:1 WebRTC call (audio/video).
 * Control plane: POST /api/calls* (persist + ACL + busy/timeout).
 * Signaling: Socket.IO (offer/answer/ICE) — media stays P2P.
 */
export function useCall() {
  const user = useStore((s) => s.user);
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallMediaType | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [remoteName, setRemoteName] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionLabel, setConnectionLabel] = useState<string>('idle');
  const [networkQuality, setNetworkQuality] = useState<CallNetworkQuality>('unknown');
  const [adaptiveMode, setAdaptiveMode] = useState<AdaptiveMediaMode>('full');
  const [audioInputs, setAudioInputs] = useState<CallDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<CallDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<CallDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string>('');
  const [selectedVideoInputId, setSelectedVideoInputId] = useState<string>('');
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string>('');
  const [canSelectSpeaker, setCanSelectSpeaker] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);
  // Detected once at mount (was: default true + setState in an effect).
  const [screenShareSupported] = useState(() => detectScreenShareSupport({
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : true,
    hasGetDisplayMedia: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  }).supported);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const ringTimerRef = useRef<number | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const endingRef = useRef(false);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const stopScreenShareRef = useRef<() => Promise<void>>(async () => {});
  const adaptiveModeRef = useRef<AdaptiveMediaMode>('full');
  const degradeStreakRef = useRef(0);
  const recoverStreakRef = useRef(0);
  const lastIceRestartRef = useRef(0);
  /** User manually turned camera off — adaptive must not force it back on. */
  const userVideoOffRef = useRef(false);

  const socket = getSocket(user?.id);

  const clearRingTimer = useCallback(() => {
    if (ringTimerRef.current) {
      window.clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const stopStatsTimer = useCallback(() => {
    if (statsTimerRef.current) {
      window.clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopStatsTimer();
    pcRef.current?.close();
    pcRef.current = null;
    stopTracks();
    setRemoteStream(null);
    if (durationTimerRef.current) window.clearInterval(durationTimerRef.current);
    durationTimerRef.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setConnectionLabel('idle');
    setNetworkQuality('unknown');
    setAdaptiveMode('full');
    adaptiveModeRef.current = 'full';
    degradeStreakRef.current = 0;
    recoverStreakRef.current = 0;
    lastIceRestartRef.current = 0;
    userVideoOffRef.current = false;
    facingModeRef.current = 'user';
    setIsScreenSharing(false);
    setPeerScreenSharing(false);
    cameraTrackRef.current?.stop();
    cameraTrackRef.current = null;
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    screenAudioTrackRef.current?.stop();
    screenAudioTrackRef.current = null;
  }, [stopTracks, stopStatsTimer]);

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await listCallDevices();
      setAudioInputs(devices.audioInputs);
      setVideoInputs(devices.videoInputs);
      setAudioOutputs(devices.audioOutputs);
      setCanSelectSpeaker(supportsAudioOutputSelect());
    } catch {
      /* ignore */
    }
  }, []);

  const resetToIdle = useCallback(() => {
    clearRingTimer();
    cleanupMedia();
    remoteUserIdRef.current = null;
    callIdRef.current = null;
    setIncomingCall(null);
    setCallType(null);
    setRemoteName('');
    setCallState('ended');
    window.setTimeout(() => setCallState('idle'), 250);
    endingRef.current = false;
  }, [cleanupMedia, clearRingTimer]);

  useEffect(() => {
    // TURN credentials are short-lived (TURN_TTL_SEC, default 1h): load now and refresh periodically.
    const load = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      apiFetch('/api/v1/turn/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.iceServers) && data.iceServers.length) iceServersRef.current = data.iceServers;
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 45 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const endCallRef = useRef<() => Promise<void>>(async () => {});

  const createPeerConnection = useCallback(
    (toUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        socket.emit('ice-candidate', {
          to: toUserId,
          candidate: e.candidate,
          callId: callIdRef.current || undefined,
        });
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0] || null);
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        setConnectionLabel(st);
        if (st === 'connected' && !durationTimerRef.current) {
          clearRingTimer();
          startTimeRef.current = Date.now();
          durationTimerRef.current = window.setInterval(() => {
            setCallDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
          }, 1000);
          setCallState('active');
          stopStatsTimer();
          statsTimerRef.current = window.setInterval(() => {
            void (async () => {
              const peer = pcRef.current;
              if (!peer) return;
              try {
                const report = await peer.getStats();
                const sample = sampleFromRtcStats(report, peer.connectionState);
                const q = qualityFromStats(sample);
                setNetworkQuality(q);

                const stepped = nextAdaptiveMode({
                  current: adaptiveModeRef.current,
                  observedQuality: q,
                  degradeStreak: degradeStreakRef.current,
                  recoverStreak: recoverStreakRef.current,
                });
                degradeStreakRef.current = stepped.degradeStreak;
                recoverStreakRef.current = stepped.recoverStreak;
                if (stepped.changed || stepped.mode !== adaptiveModeRef.current) {
                  adaptiveModeRef.current = stepped.mode;
                  setAdaptiveMode(stepped.mode);
                  const videoSender = peer.getSenders().find((s) => s.track?.kind === 'video');
                  await applyVideoEncodingToSender(videoSender, stepped.mode);
                  const stream = localStreamRef.current;
                  const vt = stream?.getVideoTracks()[0];
                  if (vt && !userVideoOffRef.current) {
                    const pause = shouldPauseOutboundVideo(stepped.mode, true);
                    vt.enabled = !pause;
                    // Reflect adaptive pause in UI without flipping userVideoOffRef.
                    setIsVideoOff(pause);
                  }
                }

                const now = Date.now();
                if (
                  shouldAttemptIceRestart({
                    connectionState: peer.connectionState,
                    quality: q,
                    lastRestartAtMs: lastIceRestartRef.current,
                    nowMs: now,
                  })
                ) {
                  try {
                    peer.restartIce();
                    lastIceRestartRef.current = now;
                  } catch {
                    /* older browsers */
                  }
                }
              } catch {
                /* ignore */
              }
            })();
          }, 3000);
        }
        if (st === 'disconnected') {
          setNetworkQuality('reconnecting');
          const now = Date.now();
          if (
            shouldAttemptIceRestart({
              connectionState: st,
              quality: 'reconnecting',
              lastRestartAtMs: lastIceRestartRef.current,
              nowMs: now,
            })
          ) {
            try {
              pc.restartIce();
              lastIceRestartRef.current = now;
            } catch {
              /* ignore */
            }
          }
        }
        if (st === 'failed') {
          setLastError('Connection failed');
          setNetworkQuality('poor');
          void endCallRef.current();
        }
      };
      pcRef.current = pc;
      return pc;
    },
    [socket, clearRingTimer, stopStatsTimer],
  );

  const replaceSenderTrack = useCallback(async (kind: 'audio' | 'video', track: MediaStreamTrack) => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === kind);
    if (sender) await sender.replaceTrack(track);
    else pc.addTrack(track, stream);
    const old = stream.getTracks().filter((t) => t.kind === kind);
    old.forEach((t) => {
      stream.removeTrack(t);
      t.stop();
    });
    stream.addTrack(track);
    setLocalStream(new MediaStream(stream.getTracks()));
  }, []);

  const startCall = useCallback(
    async (toUserId: string, toName: string, type: CallMediaType, conversationId?: string | null): Promise<boolean> => {
      if (!user?.id || callState !== 'idle') return false;
      setLastError(null);
      endingRef.current = false;
      try {
        const created = await createCallRequest({
          receiverId: toUserId,
          type,
          conversationId: conversationId || null,
        });
        if (created.ok === false) {
          setLastError(created.code === 'peer_busy' ? 'User is busy' : created.error);
          return false;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { facingMode: facingModeRef.current } : false,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCallType(type);
        setRemoteName(toName);
        remoteUserIdRef.current = toUserId;
        callIdRef.current = created.call.id;
        setCallState('outgoing');
        setConnectionLabel('ringing');
        const aId = stream.getAudioTracks()[0]?.getSettings().deviceId;
        const vId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (aId) setSelectedAudioInputId(aId);
        if (vId) setSelectedVideoInputId(vId);
        void refreshDevices();

        const pc = createPeerConnection(toUserId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call-user', {
          userToCall: toUserId,
          offer,
          callerName: user.name || 'Someone',
          type,
          callId: created.call.id,
        });

        const ringMs = created.ringTimeoutMs || DEFAULT_RING_MS;
        clearRingTimer();
        ringTimerRef.current = window.setTimeout(() => {
          void (async () => {
            const id = callIdRef.current;
            // If media already connected, duration timer is running — do not miss.
            if (!id || durationTimerRef.current) return;
            await missCallRequest(id).catch(() => {});
            setLastError('No answer');
            resetToIdle();
          })();
        }, ringMs);
        return true;
      } catch (err) {
        console.error('Failed to start call:', err);
        setLastError('Could not start call');
        if (callIdRef.current) {
          await cancelCallRequest(callIdRef.current).catch(() => {});
        }
        resetToIdle();
        return false;
      }
    },
    [clearRingTimer, createPeerConnection, resetToIdle, socket, user, callState, refreshDevices],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    setLastError(null);
    try {
      if (incomingCall.callId) {
        const accepted = await acceptCallRequest(incomingCall.callId);
        if (accepted.ok === false) {
          setLastError(accepted.error);
          return;
        }
        callIdRef.current = accepted.call.id;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.type === 'video' ? { facingMode: facingModeRef.current } : false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      remoteUserIdRef.current = incomingCall.callerId;
      setRemoteName(incomingCall.callerName);
      setCallType(incomingCall.type);
      clearRingTimer();
      const aId = stream.getAudioTracks()[0]?.getSettings().deviceId;
      const vId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (aId) setSelectedAudioInputId(aId);
      if (vId) setSelectedVideoInputId(vId);
      void refreshDevices();

      const pc = createPeerConnection(incomingCall.callerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('make-answer', {
        to: incomingCall.callerId,
        answer,
        callId: callIdRef.current || incomingCall.callId,
      });
      setIncomingCall(null);
      setCallState('active');
      setConnectionLabel('connecting');
    } catch (err) {
      console.error('Failed to accept call:', err);
      setLastError('Could not accept call');
    }
  }, [incomingCall, createPeerConnection, socket, clearRingTimer, refreshDevices]);

  const rejectCall = useCallback(async () => {
    const incoming = incomingCall;
    if (incoming?.callId) await rejectCallRequest(incoming.callId).catch(() => {});
    if (incoming) {
      socket.emit('reject-call', {
        to: incoming.callerId,
        callId: incoming.callId,
      });
    }
    setIncomingCall(null);
    resetToIdle();
  }, [incomingCall, socket, resetToIdle]);

  const endCall = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    const peerId = remoteUserIdRef.current;
    const callId = callIdRef.current;
    const duration = callDuration;
    const wasOutgoingRing = callState === 'outgoing';

    clearRingTimer();
    if (peerId) {
      socket.emit('end-call', { to: peerId, callId: callId || undefined, duration });
    }
    if (callId) {
      if (wasOutgoingRing) await cancelCallRequest(callId).catch(() => {});
      else await endCallRequest(callId, duration).catch(() => {});
    }
    resetToIdle();
  }, [callDuration, callState, clearRingTimer, resetToIdle, socket]);

  // Keep the latest endCall for socket handlers (assigned after render, not during it).
  useLayoutEffect(() => { endCallRef.current = endCall; }, [endCall]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const off = !videoTrack.enabled;
      userVideoOffRef.current = off;
      setIsVideoOff(off);
    }
  }, []);

  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      if (!deviceId || !localStreamRef.current) return;
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
          video: false,
        });
        const track = media.getAudioTracks()[0];
        if (!track) return;
        const wasMuted = isMuted;
        await replaceSenderTrack('audio', track);
        if (wasMuted) track.enabled = false;
        setSelectedAudioInputId(deviceId);
        setIsMuted(wasMuted);
        media.getTracks().forEach((t) => {
          if (t !== track) t.stop();
        });
      } catch (err) {
        console.error('switchAudioInput failed', err);
        setLastError('Could not switch microphone');
      }
    },
    [isMuted, replaceSenderTrack],
  );

  const switchVideoInput = useCallback(
    async (deviceId: string) => {
      if (!deviceId || callType !== 'video') return;
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { deviceId: { exact: deviceId } },
        });
        const track = media.getVideoTracks()[0];
        if (!track) return;
        await replaceSenderTrack('video', track);
        track.enabled = !isVideoOff;
        setSelectedVideoInputId(deviceId);
        media.getTracks().forEach((t) => {
          if (t !== track) t.stop();
        });
      } catch (err) {
        console.error('switchVideoInput failed', err);
        setLastError('Could not switch camera');
      }
    },
    [callType, isVideoOff, replaceSenderTrack],
  );

  const flipCamera = useCallback(async () => {
    if (callType !== 'video') return;
    const next = nextFacingMode(facingModeRef.current);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { exact: next } },
      });
      const track = media.getVideoTracks()[0];
      if (!track) return;
      facingModeRef.current = next;
      await replaceSenderTrack('video', track);
      track.enabled = !isVideoOff;
      const id = track.getSettings().deviceId;
      if (id) setSelectedVideoInputId(id);
      media.getTracks().forEach((t) => {
        if (t !== track) t.stop();
      });
      void refreshDevices();
    } catch {
      // exact facingMode often fails on desktop — soft fallback
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: next },
        });
        const track = media.getVideoTracks()[0];
        if (!track) return;
        facingModeRef.current = next;
        await replaceSenderTrack('video', track);
        track.enabled = !isVideoOff;
      } catch (err) {
        console.error('flipCamera failed', err);
        setLastError('Camera flip not supported on this device');
      }
    }
  }, [callType, isVideoOff, replaceSenderTrack, refreshDevices]);

  const setAudioOutput = useCallback(async (deviceId: string) => {
    if (!supportsAudioOutputSelect()) {
      setLastError('Speaker selection not supported in this browser');
      return;
    }
    setSelectedAudioOutputId(deviceId);
  }, []);

  const enableVideo = useCallback(async () => {
    const pc = pcRef.current;
    const peerId = remoteUserIdRef.current;
    const stream = localStreamRef.current;
    if (!pc || !peerId || !stream) return;
    if (callType === 'video' && stream.getVideoTracks().length) {
      const t = stream.getVideoTracks()[0];
      t.enabled = true;
      userVideoOffRef.current = false;
      setIsVideoOff(false);
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: facingModeRef.current },
      });
      const track = media.getVideoTracks()[0];
      if (!track) return;
      stream.addTrack(track);
      pc.addTrack(track, stream);
      setLocalStream(new MediaStream(stream.getTracks()));
      setCallType('video');
      userVideoOffRef.current = false;
      setIsVideoOff(false);
      const id = track.getSettings().deviceId;
      if (id) setSelectedVideoInputId(id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call-renegotiate', {
        to: peerId,
        offer,
        callId: callIdRef.current || undefined,
      });
      void refreshDevices();
    } catch (err) {
      console.error('enableVideo failed', err);
      setLastError('Could not enable camera');
    }
  }, [callType, socket, refreshDevices]);

  const disableVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = false;
    });
    userVideoOffRef.current = true;
    setIsVideoOff(true);
  }, []);

  const notifyScreenShare = useCallback(
    (active: boolean) => {
      const peerId = remoteUserIdRef.current;
      if (!peerId) return;
      socket.emit('call-screen-share', {
        to: peerId,
        active,
        callId: callIdRef.current || undefined,
      });
    },
    [socket],
  );

  const renegotiateOffer = useCallback(async () => {
    const pc = pcRef.current;
    const peerId = remoteUserIdRef.current;
    if (!pc || !peerId) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call-renegotiate', {
      to: peerId,
      offer,
      callId: callIdRef.current || undefined,
    });
  }, [socket]);

  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    const screen = screenTrackRef.current;
    const screenAudio = screenAudioTrackRef.current;
    if (screen) {
      try {
        screen.onended = null;
      } catch {
        /* ignore */
      }
      screen.stop();
    }
    screenTrackRef.current = null;
    if (screenAudio) {
      const sender = pc?.getSenders().find((s) => s.track === screenAudio);
      if (sender) {
        try {
          await sender.replaceTrack(null);
          pc?.removeTrack(sender);
        } catch {
          /* ignore */
        }
      }
      stream?.removeTrack(screenAudio);
      screenAudio.stop();
      screenAudioTrackRef.current = null;
    }

    const camera = cameraTrackRef.current;
    if (pc && stream && camera && camera.readyState !== 'ended') {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video' || s.track === screen);
      if (videoSender) await videoSender.replaceTrack(camera);
      else pc.addTrack(camera, stream);
      if (!stream.getVideoTracks().includes(camera)) stream.addTrack(camera);
      camera.enabled = !isVideoOff;
      setCallType('video');
      setLocalStream(new MediaStream(stream.getTracks()));
    } else if (stream && screen) {
      stream.getVideoTracks().forEach((t) => {
        if (t === screen) stream.removeTrack(t);
      });
      setLocalStream(new MediaStream(stream.getTracks()));
    }

    cameraTrackRef.current = null;
    setIsScreenSharing(false);
    notifyScreenShare(false);
  }, [isVideoOff, notifyScreenShare]);

  useLayoutEffect(() => { stopScreenShareRef.current = stopScreenShare; }, [stopScreenShare]);

  const startScreenShare = useCallback(
    async (opts?: { withSystemAudio?: boolean; preferMotion?: boolean }) => {
      if (callState !== 'active') return;
      if (!screenShareSupported || !navigator.mediaDevices?.getDisplayMedia) {
        setLastError('Screen sharing is not supported here');
        return;
      }
      if (isScreenSharing) return;
      const pc = pcRef.current;
      const stream = localStreamRef.current;
      if (!pc || !stream) return;

      try {
        const constraints = buildScreenShareConstraints({
          withSystemAudio: opts?.withSystemAudio !== false,
          preferMotion: opts?.preferMotion,
        });
        const display = await navigator.mediaDevices.getDisplayMedia(constraints);
        const screenTrack = display.getVideoTracks()[0];
        if (!screenTrack) {
          display.getTracks().forEach((t) => t.stop());
          setLastError('No screen track selected');
          return;
        }
        applyScreenTrackHints(screenTrack, Boolean(opts?.preferMotion));

        // Keep camera (if any) for restore; do not stop it yet.
        const currentVideo = stream.getVideoTracks()[0] || null;
        if (currentVideo && currentVideo !== screenTrack) {
          cameraTrackRef.current = currentVideo;
          stream.removeTrack(currentVideo);
        }

        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, stream);
          await renegotiateOffer();
        }
        stream.addTrack(screenTrack);
        screenTrackRef.current = screenTrack;
        screenTrack.onended = () => {
          void stopScreenShareRef.current();
        };

        const displayAudio = display.getAudioTracks()[0];
        if (displayAudio) {
          // Keep mic; publish system/tab audio as an extra sender when available.
          pc.addTrack(displayAudio, stream);
          stream.addTrack(displayAudio);
          screenAudioTrackRef.current = displayAudio;
          await renegotiateOffer();
        }

        setCallType('video');
        setIsVideoOff(false);
        setIsScreenSharing(true);
        setLocalStream(new MediaStream(stream.getTracks()));
        notifyScreenShare(true);
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setLastError('Screen share permission denied');
        } else {
          console.error('startScreenShare failed', err);
          setLastError('Could not start screen share');
        }
      }
    },
    [callState, isScreenSharing, notifyScreenShare, renegotiateOffer, screenShareSupported],
  );

  useEffect(() => {
    const onCallMade = (data: any) => {
      if (callState !== 'idle' && callState !== 'ended') {
        // Auto-signal busy path is server-side on create; just ignore extra rings while busy.
        return;
      }
      setIncomingCall({
        callerId: data.callerId,
        callerName: data.callerName || 'Someone',
        callerSocket: data.socket,
        type: data.type === 'video' ? 'video' : 'audio',
        callId: data.callId,
        offer: data.offer,
      });
      setCallType(data.type === 'video' ? 'video' : 'audio');
      setRemoteName(data.callerName || 'Someone');
      callIdRef.current = data.callId || null;
      remoteUserIdRef.current = data.callerId || null;
      setCallState('incoming');
      setConnectionLabel('ringing');
      clearRingTimer();
      ringTimerRef.current = window.setTimeout(() => {
        void (async () => {
          if (callIdRef.current) await missCallRequest(callIdRef.current).catch(() => {});
          resetToIdle();
        })();
      }, DEFAULT_RING_MS);
    };

    const onAnswerMade = async (data: any) => {
      try {
        if (pcRef.current && data.answer) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        if (data.responderId) remoteUserIdRef.current = data.responderId;
        clearRingTimer();
        setConnectionLabel('connecting');
      } catch (err) {
        console.error('Failed to apply answer:', err);
      }
    };

    const onIceCandidate = async (data: any) => {
      try {
        if (pcRef.current && data.candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error('Failed to add ICE candidate:', err);
      }
    };

    const onCallRejected = () => {
      setLastError('Call declined');
      resetToIdle();
    };

    const onCallEnded = () => {
      resetToIdle();
    };

    const onCallBusy = () => {
      setLastError('User is busy');
      resetToIdle();
    };

    const onCallError = (data: any) => {
      const code = data?.code ? String(data.code) : '';
      const msg = data?.error || 'Call error';
      if (code === 'rate_limited') setLastError('Too many call signals — slow down');
      else if (code === 'forbidden' || code === 'peer_mismatch') setLastError('Call not allowed');
      else if (code === 'not_live' || code === 'not_found') setLastError('Call ended or not found');
      else if (code === 'payload_too_large') setLastError('Call signal too large');
      else setLastError(msg);
    };

    const onRenegotiate = async (data: any) => {
      const pc = pcRef.current;
      const peerId = remoteUserIdRef.current || data?.fromUserId;
      if (!pc || !data?.offer || !peerId) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        // Ensure we can receive/send video after peer upgrades.
        if (!localStreamRef.current?.getVideoTracks().length) {
          try {
            const media = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: { facingMode: facingModeRef.current },
            });
            const track = media.getVideoTracks()[0];
            if (track && localStreamRef.current) {
              localStreamRef.current.addTrack(track);
              pc.addTrack(track, localStreamRef.current);
              setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
              setCallType('video');
              setIsVideoOff(false);
            }
          } catch {
            // Peer upgraded; we may remain audio-only locally.
            setCallType('video');
          }
        } else {
          setCallType('video');
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call-renegotiate-answer', {
          to: peerId,
          answer,
          callId: callIdRef.current || data.callId,
        });
      } catch (err) {
        console.error('call-renegotiate failed', err);
      }
    };

    const onRenegotiateAnswer = async (data: any) => {
      try {
        if (pcRef.current && data?.answer) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      } catch (err) {
        console.error('call-renegotiate-answer failed', err);
      }
    };

    socket.on('call-made', onCallMade);
    socket.on('answer-made', onAnswerMade);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('call-rejected', onCallRejected);
    socket.on('call-ended', onCallEnded);
    socket.on('call-busy', onCallBusy);
    socket.on('call-error', onCallError);
    const onPeerScreenShare = (data: any) => {
      setPeerScreenSharing(Boolean(data?.active));
    };

    socket.on('call-renegotiate', onRenegotiate);
    socket.on('call-renegotiate-answer', onRenegotiateAnswer);
    socket.on('call-screen-share', onPeerScreenShare);

    return () => {
      socket.off('call-made', onCallMade);
      socket.off('answer-made', onAnswerMade);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('call-rejected', onCallRejected);
      socket.off('call-ended', onCallEnded);
      socket.off('call-busy', onCallBusy);
      socket.off('call-error', onCallError);
      socket.off('call-renegotiate', onRenegotiate);
      socket.off('call-renegotiate-answer', onRenegotiateAnswer);
      socket.off('call-screen-share', onPeerScreenShare);
    };
  }, [socket, callState, clearRingTimer, resetToIdle]);

  const clearLastError = useCallback(() => setLastError(null), []);

  return {
    callState,
    callType,
    incomingCall,
    remoteName,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    callDuration,
    lastError,
    connectionLabel,
    networkQuality,
    adaptiveMode,
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInputId,
    selectedVideoInputId,
    selectedAudioOutputId,
    canSelectSpeaker,
    isScreenSharing,
    peerScreenSharing,
    screenShareSupported,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
    switchAudioInput,
    switchVideoInput,
    setAudioOutput,
    enableVideo,
    disableVideo,
    startScreenShare,
    stopScreenShare,
    refreshDevices,
    clearLastError,
  };
}
