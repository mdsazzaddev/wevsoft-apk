import { useEffect, useRef, useState } from 'react';
import { Phone, Video as VideoIcon, Minimize2 } from 'lucide-react';
import {
  formatCallDuration,
  outgoingStatusLabel,
  resolveConnectViewMode,
  type ConnectChromeMode,
} from '../../lib/connectUi.logic';
import { ConnectControlDock } from './ConnectControlDock';
import { ConnectDevicePanel } from './ConnectDevicePanel';
import { ConnectMoreMenu } from './ConnectMoreMenu';
import { ConnectMiniBar } from './ConnectMiniBar';
import type { UseCallReturn } from './connectTypes';
import { useValueChanged } from '../../hooks/useValueChanged';

type Props = {
  call: UseCallReturn;
};

function useAttachStream(ref: React.RefObject<HTMLVideoElement | null>, stream: MediaStream | null) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (stream) {
      void el.play().catch(() => undefined);
    }
  }, [ref, stream]);
}

function QualityChip({
  networkQuality,
  adaptiveMode,
}: {
  networkQuality: string | null;
  adaptiveMode: string | null;
}) {
  if (!networkQuality && !adaptiveMode) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80">
      {networkQuality || 'ok'}
      {adaptiveMode && adaptiveMode !== 'full' && adaptiveMode !== 'unknown' ? ` · ${adaptiveMode}` : ''}
    </span>
  );
}

function AvatarHero({ name }: { name: string }) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <div className="relative">
      <div className="absolute inset-0 animate-pulse rounded-full bg-sky-500/20 blur-2xl" />
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/40 to-indigo-600/40 text-4xl font-semibold text-white ring-2 ring-white/20 sm:h-36 sm:w-36 sm:text-5xl">
        {initial}
      </div>
    </div>
  );
}

export function ConnectCallShell({ call }: Props) {
  const view = resolveConnectViewMode({
    callState: call.callState,
    callType: call.callType,
    isScreenSharing: call.isScreenSharing,
    peerScreenSharing: call.peerScreenSharing,
  });

  const [chrome, setChrome] = useState<ConnectChromeMode>('full');
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useAttachStream(localVideoRef, call.localStream);
  useAttachStream(remoteVideoRef, call.remoteStream);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    if (audio.srcObject !== call.remoteStream) {
      audio.srcObject = call.remoteStream;
    }
    if (call.remoteStream) void audio.play().catch(() => undefined);
  }, [call.remoteStream]);

  // Call hidden → reset chrome + close menus (adjusted during render).
  const viewChanged = useValueChanged(view);
  if (viewChanged && view === 'hidden') {
    setChrome('full');
    setDevicesOpen(false);
    setMoreOpen(false);
  }

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  if (view === 'hidden') return null;

  const showMini = chrome === 'mini' || chrome === 'bar';
  if (showMini) {
    return (
      <ConnectMiniBar
        remoteName={call.remoteName}
        callDuration={call.callDuration}
        callType={call.callType}
        isMuted={call.isMuted}
        isVideoOff={call.isVideoOff}
        variant={isNarrow ? 'mobile' : 'desktop'}
        onExpand={() => setChrome('full')}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.callType === 'video' ? call.toggleVideo : undefined}
        onEndCall={call.endCall}
      />
    );
  }

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void el.requestFullscreen?.().catch(() => undefined);
    }
  };

  const isRinging = view === 'incoming' || view === 'outgoing';
  const showVideoStage = view === 'video' || view === 'screen';

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[90] flex flex-col bg-zinc-950 text-white"
      data-testid="connect-call-shell"
      data-view={view}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(79,70,229,0.12),_transparent_50%)]" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/90">
            WebSoft Connect
          </p>
          <h1 className="truncate text-lg font-semibold sm:text-xl">{call.remoteName || 'Call'}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/65">
            {view === 'incoming' && (
              <span className="inline-flex items-center gap-1">
                {call.callType === 'video' ? <VideoIcon className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                Incoming {call.callType || 'audio'} call
              </span>
            )}
            {view === 'outgoing' && <span>{outgoingStatusLabel({ callState: call.callState, connectionLabel: call.connectionLabel })}</span>}
            {view !== 'incoming' && view !== 'outgoing' && (
              <span>{formatCallDuration(call.callDuration)}</span>
            )}
            <QualityChip networkQuality={call.networkQuality} adaptiveMode={call.adaptiveMode} />
          </div>
        </div>
        {!isRinging && (
          <button
            type="button"
            title="Minimize"
            aria-label="Minimize call"
            onClick={() => setChrome(isNarrow ? 'bar' : 'mini')}
            className="rounded-full bg-white/10 p-2.5 text-white/80 hover:bg-white/20"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        {showVideoStage ? (
          <div className="relative h-full w-full max-w-5xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full rounded-2xl bg-black object-contain"
            />
            {call.isVideoOff || !call.localStream ? null : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-3 right-3 h-28 w-20 rounded-xl border border-white/20 bg-black object-cover shadow-lg sm:h-36 sm:w-28"
              />
            )}
            {(call.isScreenSharing || call.peerScreenSharing) && (
              <span className="absolute left-3 top-3 rounded-full bg-sky-500/90 px-2.5 py-1 text-xs font-medium">
                {call.isScreenSharing ? 'You are sharing' : 'Screen share'}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 text-center">
            <AvatarHero name={call.remoteName} />
            {call.lastError ? (
              <p className="max-w-sm text-sm text-amber-200/90">{call.lastError}</p>
            ) : null}
            {view === 'incoming' && (
              <p className="text-sm text-white/55">Camera stays off until you accept.</p>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <ConnectControlDock
          view={view}
          isMuted={call.isMuted}
          isVideoOff={call.isVideoOff}
          isScreenSharing={call.isScreenSharing}
          screenShareSupported={call.screenShareSupported}
          callType={call.callType}
          onToggleMute={call.toggleMute}
          onToggleVideo={call.toggleVideo}
          onEnableVideo={call.enableVideo}
          onFlipCamera={call.flipCamera}
          onStartScreenShare={() => void call.startScreenShare()}
          onStopScreenShare={() => void call.stopScreenShare()}
          onEndCall={call.endCall}
          onAccept={call.acceptCall}
          onReject={call.rejectCall}
          onOpenDevices={() => {
            setMoreOpen(false);
            setDevicesOpen(true);
            call.refreshDevices();
          }}
          onOpenMore={() => {
            setDevicesOpen(false);
            setMoreOpen(true);
          }}
        />
      </footer>

      <ConnectDevicePanel
        open={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        audioInputs={call.audioInputs}
        videoInputs={call.videoInputs}
        audioOutputs={call.audioOutputs}
        selectedAudioInputId={call.selectedAudioInputId}
        selectedVideoInputId={call.selectedVideoInputId}
        selectedAudioOutputId={call.selectedAudioOutputId}
        canSelectSpeaker={call.canSelectSpeaker}
        onSwitchAudioInput={call.switchAudioInput}
        onSwitchVideoInput={call.switchVideoInput}
        onSetAudioOutput={call.setAudioOutput}
        onRefreshDevices={call.refreshDevices}
      />

      <ConnectMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        networkQuality={call.networkQuality}
        adaptiveMode={call.adaptiveMode}
        connectionLabel={call.connectionLabel}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onMinimize={() => setChrome(isNarrow ? 'bar' : 'mini')}
        onLeave={call.endCall}
      />
    </div>
  );
}
