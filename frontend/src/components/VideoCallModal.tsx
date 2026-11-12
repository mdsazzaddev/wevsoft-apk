import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Minimize2 } from 'lucide-react';

interface VideoCallModalProps {
  // Incoming call scenario
  incomingCall?: {
    callerId: string;
    callerName: string;
    callerAvatar?: string;
    isVideo: boolean;
    offer: any;
    socketId: string;
  };
  // Active call scenario
  activeCall?: {
    peerId: string;
    peerName: string;
    peerAvatar?: string;
    isVideo: boolean;
  };
  onAccept?: (answer: any) => void;
  onReject?: () => void;
  onEnd?: () => void;
  onInitiate?: (userId: string, isVideo: boolean) => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
}

export default function VideoCallModal({
  incomingCall,
  activeCall,
  onAccept,
  onReject,
  onEnd,
  localStream,
  remoteStream,
}: VideoCallModalProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (activeCall) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeCall]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsMuted(m => !m);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsVideoOff(v => !v);
    }
  };

  // ── Incoming Call UI ──────────────────────────────────────
  if (incomingCall && !activeCall) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="fixed top-6 right-6 z-[9999] w-80 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-700 overflow-hidden"
        >
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-blue-900/40" />
          
          {/* Pulse ring animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute w-24 h-24 rounded-full border-2 border-violet-500/30"
                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
              />
            ))}
          </div>

          <div className="relative p-6 text-center space-y-4">
            {/* Avatar */}
            <div className="relative mx-auto w-20 h-20">
              {incomingCall.callerAvatar ? (
                <img src={incomingCall.callerAvatar} className="w-20 h-20 rounded-full object-cover border-4 border-violet-500" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center border-4 border-violet-500">
                  <span className="text-2xl font-bold text-foreground dark:text-white">{incomingCall.callerName[0]}</span>
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${incomingCall.isVideo ? 'bg-blue-500' : 'bg-green-500'}`}>
                {incomingCall.isVideo ? <Video className="w-3 h-3 text-foreground dark:text-white" /> : <Phone className="w-3 h-3 text-foreground dark:text-white" />}
              </span>
            </div>

            <div>
              <p className="text-foreground dark:text-white font-bold text-lg">{incomingCall.callerName}</p>
              <p className="text-zinc-400 text-sm animate-pulse">
                Incoming {incomingCall.isVideo ? 'video' : 'voice'} call...
              </p>
            </div>

            {/* Accept/Reject buttons */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                onClick={onReject}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:bg-red-600 transition-colors">
                  <PhoneOff className="w-6 h-6 text-foreground dark:text-white" />
                </span>
                <span className="text-xs text-zinc-400">Decline</span>
              </button>

              <button
                onClick={() => onAccept?.(null)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:bg-emerald-600 transition-colors">
                  {incomingCall.isVideo ? <Video className="w-6 h-6 text-foreground dark:text-white" /> : <Phone className="w-6 h-6 text-foreground dark:text-white" />}
                </span>
                <span className="text-xs text-zinc-400">Accept</span>
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Active Call UI ────────────────────────────────────────
  if (activeCall) {
    if (minimized) {
      return (
        <motion.div
          className="fixed bottom-6 right-6 z-[9999] w-48 h-32 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 cursor-pointer"
          onClick={() => setMinimized(false)}
          whileHover={{ scale: 1.02 }}
        >
          {remoteStream ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900 to-blue-900 flex items-center justify-center">
              <span className="text-foreground dark:text-white font-bold">{activeCall.peerName[0]}</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1">
            <span className="text-foreground dark:text-white text-xs font-mono">{formatDuration(callDuration)}</span>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col"
      >
        {/* Remote video / avatar */}
        <div className="flex-1 relative bg-zinc-900">
          {remoteStream && activeCall.isVideo ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              {activeCall.peerAvatar ? (
                <img src={activeCall.peerAvatar} className="w-28 h-28 rounded-full object-cover border-4 border-zinc-700" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-foreground dark:text-white">{activeCall.peerName[0]}</span>
                </div>
              )}
              <p className="text-foreground dark:text-white text-xl font-bold">{activeCall.peerName}</p>
              <p className="text-zinc-400 font-mono text-lg">{formatDuration(callDuration)}</p>
            </div>
          )}

          {/* Local video (PiP) */}
          {activeCall.isVideo && localStream && (
            <div className="absolute top-4 right-4 w-28 h-20 rounded-xl overflow-hidden border-2 border-zinc-700 shadow-xl">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-foreground dark:text-white text-sm font-mono">{formatDuration(callDuration)}</span>
            </div>
          </div>

          {/* Minimize */}
          <button
            onClick={() => setMinimized(true)}
            className="absolute top-4 right-36 bg-black/60 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/30 dark:bg-black/80"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Controls */}
        <div className="bg-zinc-900 border-t border-zinc-800 px-6 py-6 flex items-center justify-center gap-6">
          <button
            onClick={toggleMute}
            className={`flex flex-col items-center gap-2 group`}
          >
            <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 border-2 border-red-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
              {isMuted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6 text-foreground dark:text-white" />}
            </span>
            <span className="text-xs text-zinc-500">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {activeCall.isVideo && (
            <button onClick={toggleVideo} className="flex flex-col items-center gap-2">
              <span className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/20 border-2 border-red-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                {isVideoOff ? <VideoOff className="w-6 h-6 text-red-400" /> : <Video className="w-6 h-6 text-foreground dark:text-white" />}
              </span>
              <span className="text-xs text-zinc-500">{isVideoOff ? 'Show' : 'Hide'}</span>
            </button>
          )}

          <button onClick={onEnd} className="flex flex-col items-center gap-2">
            <span className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
              <PhoneOff className="w-7 h-7 text-foreground dark:text-white" />
            </span>
            <span className="text-xs text-zinc-500">End</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}
