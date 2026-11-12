import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TrackPublication,
} from 'livekit-client';
import {
  nextAdaptiveMode,
  shouldPauseOutboundVideo,
  type AdaptiveMediaMode,
} from '../lib/callLowNetwork.logic';
import type { CallNetworkQuality } from '../lib/callQuality.logic';

function livekitQualityToCall(q: ConnectionQuality): CallNetworkQuality {
  switch (q) {
    case ConnectionQuality.Excellent:
      return 'excellent';
    case ConnectionQuality.Good:
      return 'good';
    case ConnectionQuality.Poor:
      return 'poor';
    case ConnectionQuality.Lost:
      return 'reconnecting';
    default:
      return 'unknown';
  }
}

export type LiveKitTile = {
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenShareEnabled: boolean;
  videoTrack?: MediaStreamTrack | null;
  audioTrack?: MediaStreamTrack | null;
  screenTrack?: MediaStreamTrack | null;
};

function trackMedia(pub: TrackPublication | undefined): MediaStreamTrack | null {
  const t = pub?.track;
  if (!t) return null;
  return (t as { mediaStreamTrack?: MediaStreamTrack }).mediaStreamTrack || null;
}

function participantToTile(p: Participant, isLocal: boolean): LiveKitTile {
  const cam = p.getTrackPublication(Track.Source.Camera);
  const mic = p.getTrackPublication(Track.Source.Microphone);
  const screen = p.getTrackPublication(Track.Source.ScreenShare);
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isLocal,
    isSpeaking: p.isSpeaking,
    isMicrophoneEnabled: p.isMicrophoneEnabled,
    isCameraEnabled: p.isCameraEnabled,
    isScreenShareEnabled: p.isScreenShareEnabled,
    videoTrack: trackMedia(cam),
    audioTrack: trackMedia(mic),
    screenTrack: trackMedia(screen),
  };
}

export function useLiveKitGroupRoom() {
  const roomRef = useRef<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [tiles, setTiles] = useState<LiveKitTile[]>([]);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [canPublish, setCanPublish] = useState(true);
  const [adaptiveMode, setAdaptiveMode] = useState<AdaptiveMediaMode>('full');
  const adaptiveModeRef = useRef<AdaptiveMediaMode>('full');
  const degradeStreakRef = useRef(0);
  const recoverStreakRef = useRef(0);
  const userCamOffRef = useRef(false);

  const refreshTiles = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setTiles([]);
      return;
    }
    const next: LiveKitTile[] = [participantToTile(room.localParticipant, true)];
    room.remoteParticipants.forEach((p) => next.push(participantToTile(p, false)));
    setTiles(next);
  }, []);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      try {
        await room.disconnect();
      } catch {
        /* ignore */
      }
    }
    setConnectionState(ConnectionState.Disconnected);
    setTiles([]);
    setActiveSpeakerIds([]);
    setScreenOn(false);
    setMicOn(false);
    setCamOn(false);
    setAdaptiveMode('full');
    adaptiveModeRef.current = 'full';
    degradeStreakRef.current = 0;
    recoverStreakRef.current = 0;
    userCamOffRef.current = false;
  }, []);

  const applyAdaptive = useCallback(
    async (mode: AdaptiveMediaMode) => {
      const local = roomRef.current?.localParticipant;
      if (!local || !canPublish || userCamOffRef.current) return;
      const pause = shouldPauseOutboundVideo(mode, true);
      try {
        if (pause) {
          await local.setCameraEnabled(false);
          setCamOn(false);
        } else if (mode === 'saver') {
          // Keep camera on; LiveKit adaptiveStream/dynacast already lowers layers.
          await local.setCameraEnabled(true);
          setCamOn(true);
        } else {
          await local.setCameraEnabled(true);
          setCamOn(true);
        }
        refreshTiles();
      } catch {
        /* permission / publish race */
      }
    },
    [canPublish, refreshTiles],
  );

  const wireRoom = useCallback(
    (room: Room) => {
      room
        .on(RoomEvent.ConnectionStateChanged, () => setConnectionState(room.state))
        .on(RoomEvent.ParticipantConnected, refreshTiles)
        .on(RoomEvent.ParticipantDisconnected, refreshTiles)
        .on(RoomEvent.TrackSubscribed, (_track: RemoteTrack, _pub: RemoteTrackPublication) => {
          refreshTiles();
        })
        .on(RoomEvent.TrackUnsubscribed, refreshTiles)
        .on(RoomEvent.TrackMuted, refreshTiles)
        .on(RoomEvent.TrackUnmuted, refreshTiles)
        .on(RoomEvent.LocalTrackPublished, refreshTiles)
        .on(RoomEvent.LocalTrackUnpublished, refreshTiles)
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          setActiveSpeakerIds(speakers.map((s) => s.identity));
          refreshTiles();
        })
        .on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (!participant.isLocal) return;
          const stepped = nextAdaptiveMode({
            current: adaptiveModeRef.current,
            observedQuality: livekitQualityToCall(quality),
            degradeStreak: degradeStreakRef.current,
            recoverStreak: recoverStreakRef.current,
          });
          degradeStreakRef.current = stepped.degradeStreak;
          recoverStreakRef.current = stepped.recoverStreak;
          if (stepped.changed) {
            adaptiveModeRef.current = stepped.mode;
            setAdaptiveMode(stepped.mode);
            void applyAdaptive(stepped.mode);
          }
        });
    },
    [applyAdaptive, refreshTiles],
  );

  const connect = useCallback(
    async (input: { url: string; token: string; publish?: boolean }) => {
      setError(null);
      await disconnect();
      const publish = input.publish !== false;
      setCanPublish(publish);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          simulcast: true,
          videoCodec: 'vp8',
        },
      });
      roomRef.current = room;
      wireRoom(room);

      try {
        await room.connect(input.url, input.token);
        if (publish) {
          await room.localParticipant.setMicrophoneEnabled(true);
          await room.localParticipant.setCameraEnabled(true);
          setMicOn(true);
          setCamOn(true);
        } else {
          setMicOn(false);
          setCamOn(false);
        }
        setConnectionState(room.state);
        refreshTiles();
      } catch (err: any) {
        setError(err?.message || 'Failed to connect to LiveKit');
        await disconnect();
        throw err;
      }
    },
    [disconnect, refreshTiles, wireRoom],
  );

  /** Re-join with a fresh token (e.g. after host approves speaker / publish rights). */
  const reconnectWithToken = useCallback(
    async (input: { url: string; token: string; publish?: boolean }) => {
      await connect(input);
    },
    [connect],
  );

  const toggleMic = useCallback(async () => {
    const local = roomRef.current?.localParticipant as LocalParticipant | undefined;
    if (!local || !canPublish) return;
    const next = !micOn;
    try {
      await local.setMicrophoneEnabled(next);
      setMicOn(next);
      refreshTiles();
    } catch (err: any) {
      setError(err?.message || 'Mic toggle failed');
    }
  }, [canPublish, micOn, refreshTiles]);

  const toggleCam = useCallback(async () => {
    const local = roomRef.current?.localParticipant as LocalParticipant | undefined;
    if (!local || !canPublish) return;
    const next = !camOn;
    try {
      await local.setCameraEnabled(next);
      userCamOffRef.current = !next;
      setCamOn(next);
      refreshTiles();
    } catch (err: any) {
      setError(err?.message || 'Camera toggle failed');
    }
  }, [canPublish, camOn, refreshTiles]);

  const toggleScreen = useCallback(async () => {
    const local = roomRef.current?.localParticipant as LocalParticipant | undefined;
    if (!local || !canPublish) return;
    const next = !screenOn;
    try {
      await local.setScreenShareEnabled(next, { audio: true });
      setScreenOn(next);
      refreshTiles();
    } catch (err: any) {
      setError(err?.message || 'Screen share failed');
    }
  }, [canPublish, screenOn, refreshTiles]);

  useEffect(() => () => {
    void disconnect();
  }, [disconnect]);

  return {
    connectionState,
    tiles,
    activeSpeakerIds,
    error,
    micOn,
    camOn,
    screenOn,
    canPublish,
    adaptiveMode,
    connect,
    reconnectWithToken,
    disconnect,
    toggleMic,
    toggleCam,
    toggleScreen,
    clearError: () => setError(null),
  };
}
