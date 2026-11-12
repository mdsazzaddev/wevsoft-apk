import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  MonitorUp,
  MonitorOff,
  SwitchCamera,
  Settings2,
  MoreHorizontal,
} from 'lucide-react';
import type { ConnectViewMode } from '../../lib/connectUi.logic';
import { connectDockFlags } from '../../lib/connectUi.logic';

type Props = {
  view: ConnectViewMode;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenShareSupported: boolean;
  callType: 'audio' | 'video' | null;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEnableVideo: () => void;
  onFlipCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onEndCall: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onOpenDevices: () => void;
  onOpenMore: () => void;
};

function DockBtn({
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

export function ConnectControlDock(props: Props) {
  const flags = connectDockFlags(props.view);

  if (flags.showAcceptReject) {
    return (
      <div className="flex items-center justify-center gap-6">
        <DockBtn danger title="Decline" onClick={() => props.onReject?.()}>
          <PhoneOff className="h-5 w-5" />
        </DockBtn>
        <DockBtn
          title="Accept"
          onClick={() => props.onAccept?.()}
          active
        >
          <Phone className="h-5 w-5 text-emerald-700" />
        </DockBtn>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {flags.showMic && (
        <DockBtn
          title={props.isMuted ? 'Unmute' : 'Mute'}
          active={props.isMuted}
          onClick={props.onToggleMute}
        >
          {props.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </DockBtn>
      )}

      {flags.showCam && (
        <DockBtn
          title={props.isVideoOff ? 'Camera on' : 'Camera off'}
          active={props.isVideoOff}
          onClick={props.onToggleVideo}
        >
          {props.isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </DockBtn>
      )}

      {flags.showEnableVideo && props.callType === 'audio' && (
        <DockBtn title="Turn on camera" onClick={props.onEnableVideo}>
          <Video className="h-5 w-5" />
        </DockBtn>
      )}

      {flags.showFlip && (
        <DockBtn title="Flip camera" onClick={props.onFlipCamera}>
          <SwitchCamera className="h-5 w-5" />
        </DockBtn>
      )}

      {flags.showScreen && (
        <DockBtn
          title={
            !props.screenShareSupported
              ? 'Screen share not supported in this browser'
              : props.isScreenSharing
                ? 'Stop sharing'
                : 'Share screen'
          }
          disabled={!props.screenShareSupported && !props.isScreenSharing}
          active={props.isScreenSharing}
          onClick={() =>
            props.isScreenSharing ? props.onStopScreenShare() : props.onStartScreenShare()
          }
        >
          {props.isScreenSharing ? (
            <MonitorOff className="h-5 w-5" />
          ) : (
            <MonitorUp className="h-5 w-5" />
          )}
        </DockBtn>
      )}

      {flags.showDevices && (
        <DockBtn title="Devices" onClick={props.onOpenDevices}>
          <Settings2 className="h-5 w-5" />
        </DockBtn>
      )}

      <DockBtn title="More" onClick={props.onOpenMore}>
        <MoreHorizontal className="h-5 w-5" />
      </DockBtn>

      {flags.showEnd && (
        <DockBtn danger title="Leave call" onClick={props.onEndCall}>
          <PhoneOff className="h-5 w-5" />
        </DockBtn>
      )}
    </div>
  );
}
