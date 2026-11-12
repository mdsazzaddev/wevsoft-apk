import { useEffect } from 'react';
import {
  Activity,
  Gauge,
  Maximize2,
  Minimize2,
  PhoneOff,
  PictureInPicture2,
  Signal,
  Wifi,
  X,
} from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  networkQuality: string | null;
  adaptiveMode: string | null;
  connectionLabel: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  onLeave: () => void;
};

function qualityTone(value: string | null): string {
  const v = (value || '').toLowerCase();
  if (v.includes('excellent') || v === 'good' || v === 'connected') return 'text-emerald-300';
  if (v.includes('fair') || v.includes('ring') || v.includes('connect')) return 'text-amber-300';
  if (v.includes('poor') || v.includes('bad') || v.includes('fail')) return 'text-rose-300';
  return 'text-sky-200';
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] px-3 py-2.5">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {icon}
        {label}
      </span>
      <span className={`truncate text-sm font-semibold capitalize ${qualityTone(value)}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
        danger
          ? 'border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.09]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          danger
            ? 'bg-rose-500/20 text-rose-300'
            : 'bg-sky-500/15 text-sky-200 group-hover:bg-sky-500/25',
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${danger ? 'text-rose-200' : 'text-white'}`}>
          {label}
        </span>
        {hint ? <span className="block text-xs text-white/45">{hint}</span> : null}
      </span>
    </button>
  );
}

export function ConnectMoreMenu(props: Props) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div className="absolute inset-0 z-30" role="dialog" aria-modal="true" aria-label="Call options">
      <button
        type="button"
        aria-label="Close call options"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={props.onClose}
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[min(88dvh,520px)] overflow-y-auto rounded-t-3xl border border-white/10 border-b-0 bg-zinc-950/95 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:inset-x-auto sm:bottom-24 sm:left-1/2 sm:w-[min(380px,92vw)] sm:-translate-x-1/2 sm:rounded-3xl sm:border-b">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              WebSoft Connect
            </p>
            <h3 className="text-base font-semibold text-white">Call options</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={props.onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatChip
            icon={<Signal className="h-3 w-3" />}
            label="Link"
            value={props.connectionLabel || '—'}
          />
          <StatChip
            icon={<Wifi className="h-3 w-3" />}
            label="Net"
            value={props.networkQuality || '—'}
          />
          <StatChip
            icon={<Gauge className="h-3 w-3" />}
            label="Mode"
            value={props.adaptiveMode || '—'}
          />
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/90">
          <Activity className="h-3.5 w-3.5 shrink-0" />
          Live diagnostics from the active call — no decorative extras.
        </div>

        <div className="space-y-2">
          <ActionRow
            icon={
              props.isFullscreen ? (
                <Minimize2 className="h-[18px] w-[18px]" />
              ) : (
                <Maximize2 className="h-[18px] w-[18px]" />
              )
            }
            label={props.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            hint="Fill the display with this call"
            onClick={() => {
              props.onToggleFullscreen();
              props.onClose();
            }}
          />
          <ActionRow
            icon={<PictureInPicture2 className="h-[18px] w-[18px]" />}
            label="Minimize call"
            hint="Keep talking while you browse"
            onClick={() => {
              props.onMinimize();
              props.onClose();
            }}
          />
          <ActionRow
            icon={<PhoneOff className="h-[18px] w-[18px]" />}
            label="Leave call"
            hint="End for everyone on this line"
            danger
            onClick={() => {
              props.onLeave();
              props.onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
