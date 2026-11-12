import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone, Video, VideoOff, Mic, MicOff, PhoneOff, Minimize2, Maximize2,
  SwitchCamera, Settings2, Signal, MonitorUp, MonitorOff,
} from 'lucide-react';
import type { AdaptiveMediaMode, CallDeviceInfo, CallNetworkQuality, CallState } from '../../hooks/useCall';
import { qualityLabel } from '../../lib/callQuality.logic';
import { adaptiveModeLabel } from '../../lib/callLowNetwork.logic';

interface CallOverlayProps {
  callState: CallState;
  callType: 'audio' | 'video' | null;
  remoteName: string;
  callDuration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionLabel?: string | null;
  statusHint?: string | null;
  networkQuality?: CallNetworkQuality;
  adaptiveMode?: AdaptiveMediaMode;
  audioInputs?: CallDeviceInfo[];
  videoInputs?: CallDeviceInfo[];
  audioOutputs?: CallDeviceInfo[];
  selectedAudioInputId?: string;
  selectedVideoInputId?: string;
  selectedAudioOutputId?: string;
  canSelectSpeaker?: boolean;
  isScreenSharing?: boolean;
  peerScreenSharing?: boolean;
  screenShareSupported?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onFlipCamera?: () => void;
  onEnableVideo?: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
  onSwitchAudioInput?: (deviceId: string) => void;
  onSwitchVideoInput?: (deviceId: string) => void;
  onSetAudioOutput?: (deviceId: string) => void;
  onRefreshDevices?: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function qualityColor(q: CallNetworkQuality | undefined): string {
  switch (q) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-sky-400';
    case 'weak':
      return 'text-amber-400';
    case 'poor':
    case 'reconnecting':
      return 'text-rose-400';
    default:
      return 'text-muted-foreground';
  }
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  callType,
  remoteName,
  callDuration,
  isMuted,
  isVideoOff,
  localStream,
  remoteStream,
  connectionLabel,
  statusHint,
  networkQuality = 'unknown',
  adaptiveMode = 'full',
  audioInputs = [],
  videoInputs = [],
  audioOutputs = [],
  selectedAudioInputId = '',
  selectedVideoInputId = '',
  selectedAudioOutputId = '',
  canSelectSpeaker = false,
  isScreenSharing = false,
  peerScreenSharing = false,
  screenShareSupported = true,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onFlipCamera,
  onEnableVideo,
  onStartScreenShare,
  onStopScreenShare,
  onSwitchAudioInput,
  onSwitchVideoInput,
  onSetAudioOutput,
  onRefreshDevices,
}) => {
  const [isPip, setIsPip] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    const el = remoteVideoRef.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el || !selectedAudioOutputId || typeof el.setSinkId !== 'function') return;
    void el.setSinkId(selectedAudioOutputId).catch(() => {});
  }, [selectedAudioOutputId, remoteStream, callState]);

  if (callState === 'idle' || callState === 'ended') return null;

  const isIncoming = callState === 'incoming';
  const isActive = callState === 'active';
  const statusLabel = isIncoming
    ? 'Incoming Call...'
    : callState === 'outgoing'
      ? connectionLabel === 'connecting'
        ? 'Connecting...'
        : 'Calling...'
      : formatDuration(callDuration);

  const openDevices = () => {
    setShowDevices((v) => !v);
    onRefreshDevices?.();
  };

  return (
    <AnimatePresence>
      {isPip ? (
        <motion.div
          drag
          dragConstraints={{ left: -300, right: 300, top: -400, bottom: 200 }}
          className="fixed bottom-24 right-6 z-[1000] w-64 bg-card/95 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-4 shadow-2xl space-y-3 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-extrabold text-foreground dark:text-white">{remoteName}</span>
            </div>
            <button onClick={() => setIsPip(false)} aria-label="Expand call" className="text-muted-foreground hover:text-foreground dark:text-white">
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="h-28 bg-black/60 rounded-2xl flex items-center justify-center border border-border overflow-hidden relative">
            {callType === 'video' && remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : callType === 'video' ? (
              <Video className="text-blue-400 animate-pulse" size={28} />
            ) : (
              <Phone className="text-emerald-400 animate-pulse" size={28} />
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className={`p-2 rounded-full border transition-all ${isMuted ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-black/5 dark:bg-white/5 border-border text-foreground'}`}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button onClick={onEndCall} aria-label="End call" className="p-2 rounded-full bg-rose-600 text-white shadow-md">
              <PhoneOff size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/30 dark:bg-black/80 backdrop-blur-xl"
        >
          <div className="w-full max-w-xl bg-card/90 border border-border rounded-3xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
            {isActive && (
              <div className="flex justify-between items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${qualityColor(networkQuality)}`}>
                    <Signal size={12} />
                    {qualityLabel(networkQuality)}
                  </div>
                  {adaptiveMode !== 'full' ? (
                    <div className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                      {adaptiveModeLabel(adaptiveMode)}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => setIsPip(true)}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 text-xs font-bold"
                >
                  <Minimize2 size={14} />
                  <span>Minimize to PiP</span>
                </button>
              </div>
            )}

            {(isScreenSharing || peerScreenSharing) && isActive ? (
              <div
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  isScreenSharing
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300'
                }`}
                role="status"
              >
                {isScreenSharing ? 'You are sharing your screen' : `${remoteName} is sharing a screen`}
              </div>
            ) : null}

            {callType === 'video' && (isActive || callState === 'outgoing') ? (
              <div className={`relative w-full rounded-2xl bg-black/80 overflow-hidden border border-border ${isScreenSharing || peerScreenSharing ? 'h-80' : 'h-64'}`}>
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full ${peerScreenSharing ? 'object-contain bg-black' : 'object-cover'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Video size={32} className="animate-pulse" />
                  </div>
                )}
                {localStream && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute bottom-3 right-3 w-24 h-16 rounded-lg border border-white/30 shadow-lg ${
                      isScreenSharing ? 'object-contain bg-black/80' : 'object-cover'
                    } ${isVideoOff && !isScreenSharing ? 'opacity-40' : ''}`}
                  />
                )}
              </div>
            ) : (
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border-4 border-border shadow-2xl flex items-center justify-center text-3xl font-extrabold text-white">
                  {remoteName.charAt(0)}
                </div>
                {/* Keep remote audio element attached for audio-only + speaker sink */}
                {remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="sr-only" />
                ) : null}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-extrabold text-foreground dark:text-white tracking-tight">{remoteName}</h2>
              <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-wider">{statusLabel}</p>
              {statusHint ? (
                <p className="text-xs text-rose-400 font-semibold mt-2" role="status">{statusHint}</p>
              ) : connectionLabel && isActive ? (
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{connectionLabel}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-4 pt-4 flex-wrap">
              {isIncoming ? (
                <>
                  <button onClick={onReject} aria-label="Decline call" className="p-5 rounded-2xl bg-rose-600 text-white shadow-2xl hover:opacity-90 transition-all scale-105">
                    <PhoneOff size={24} />
                  </button>
                  <button onClick={onAccept} aria-label="Accept call" className="p-5 rounded-2xl bg-emerald-600 text-white shadow-2xl hover:opacity-90 transition-all scale-105">
                    <Phone size={24} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onToggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    className={`p-4 rounded-2xl border transition-all ${isMuted ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-black/5 dark:bg-white/5 border-border text-foreground'}`}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {callType === 'video' ? (
                    <>
                      <button
                        onClick={onToggleVideo}
                        aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                        className={`p-4 rounded-2xl border transition-all ${isVideoOff ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-black/5 dark:bg-white/5 border-border text-foreground'}`}
                      >
                        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                      </button>
                      {onFlipCamera && isActive ? (
                        <button
                          onClick={onFlipCamera}
                          aria-label="Flip camera"
                          className="p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-border text-foreground transition-all"
                        >
                          <SwitchCamera size={20} />
                        </button>
                      ) : null}
                    </>
                  ) : isActive && onEnableVideo ? (
                    <button
                      onClick={onEnableVideo}
                      aria-label="Turn on video"
                      className="p-4 rounded-2xl border bg-black/5 dark:bg-white/5 border-border text-foreground transition-all"
                      title="Switch to video"
                    >
                      <Video size={20} />
                    </button>
                  ) : null}

                  {isActive && screenShareSupported && onStartScreenShare && onStopScreenShare ? (
                    <button
                      onClick={() => (isScreenSharing ? onStopScreenShare() : onStartScreenShare())}
                      aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
                      aria-pressed={isScreenSharing}
                      className={`p-4 rounded-2xl border transition-all ${
                        isScreenSharing
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                          : 'bg-black/5 dark:bg-white/5 border-border text-foreground'
                      }`}
                    >
                      {isScreenSharing ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
                    </button>
                  ) : null}

                  {isActive ? (
                    <button
                      onClick={openDevices}
                      aria-label="Device settings"
                      aria-expanded={showDevices}
                      className={`p-4 rounded-2xl border transition-all ${showDevices ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/5 dark:bg-white/5 border-border text-foreground'}`}
                    >
                      <Settings2 size={20} />
                    </button>
                  ) : null}

                  <button onClick={onEndCall} aria-label="End call" className="p-5 rounded-2xl bg-rose-600 text-white shadow-2xl hover:opacity-90 transition-all scale-105">
                    <PhoneOff size={24} />
                  </button>
                </>
              )}
            </div>

            {showDevices && isActive ? (
              <div className="text-left space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Microphone
                  <select
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                    value={selectedAudioInputId}
                    onChange={(e) => onSwitchAudioInput?.(e.target.value)}
                  >
                    {audioInputs.length === 0 ? <option value="">Default</option> : null}
                    {audioInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                  </select>
                </label>
                {callType === 'video' ? (
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Camera
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      value={selectedVideoInputId}
                      onChange={(e) => onSwitchVideoInput?.(e.target.value)}
                    >
                      {videoInputs.length === 0 ? <option value="">Default</option> : null}
                      {videoInputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {canSelectSpeaker ? (
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Speaker
                    <select
                      className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
                      value={selectedAudioOutputId}
                      onChange={(e) => onSetAudioOutput?.(e.target.value)}
                    >
                      <option value="">Default</option>
                      {audioOutputs.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Speaker selection is limited on this browser.</p>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
