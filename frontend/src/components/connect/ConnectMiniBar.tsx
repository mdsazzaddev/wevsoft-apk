import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { formatCallDuration } from '../../lib/connectUi.logic';

type Props = {
  remoteName: string;
  callDuration: number;
  callType: 'audio' | 'video' | null;
  isMuted: boolean;
  isVideoOff: boolean;
  onExpand: () => void;
  onToggleMute: () => void;
  onToggleVideo?: () => void;
  onEndCall: () => void;
  /** Mobile compact bar vs desktop floating pill */
  variant?: 'desktop' | 'mobile';
};

export function ConnectMiniBar(props: Props) {
  const isMobile = props.variant === 'mobile';

  return (
    <div
      className={[
        'pointer-events-auto flex items-center gap-3 border border-white/10 bg-zinc-950/95 text-white shadow-2xl backdrop-blur-xl',
        isMobile
          ? 'fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[80] rounded-2xl px-3 py-2.5'
          : 'fixed bottom-6 right-6 z-[80] max-w-[320px] rounded-2xl px-3 py-2.5',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={props.onExpand}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        title="Expand call"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-semibold text-sky-300">
          {(props.remoteName || '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{props.remoteName || 'Call'}</span>
          <span className="block text-xs text-white/55">{formatCallDuration(props.callDuration)}</span>
        </span>
      </button>

      <button
        type="button"
        aria-label={props.isMuted ? 'Unmute' : 'Mute'}
        onClick={props.onToggleMute}
        className="rounded-full bg-white/10 p-2 hover:bg-white/20"
      >
        {props.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      {props.callType === 'video' && props.onToggleVideo && (
        <button
          type="button"
          aria-label={props.isVideoOff ? 'Camera on' : 'Camera off'}
          onClick={props.onToggleVideo}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
        >
          {props.isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>
      )}

      <button
        type="button"
        aria-label="Expand"
        onClick={props.onExpand}
        className="rounded-full bg-white/10 p-2 hover:bg-white/20"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        aria-label="Leave call"
        onClick={props.onEndCall}
        className="rounded-full bg-red-500 p-2 hover:bg-red-600"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}
