import { X } from 'lucide-react';
import type { CallDeviceInfo } from '../../hooks/useCall';

type Props = {
  open: boolean;
  onClose: () => void;
  audioInputs: CallDeviceInfo[];
  videoInputs: CallDeviceInfo[];
  audioOutputs: CallDeviceInfo[];
  selectedAudioInputId: string;
  selectedVideoInputId: string;
  selectedAudioOutputId: string;
  canSelectSpeaker: boolean;
  onSwitchAudioInput: (id: string) => void;
  onSwitchVideoInput: (id: string) => void;
  onSetAudioOutput: (id: string) => void;
  onRefreshDevices: () => void;
};

function SelectRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: CallDeviceInfo[];
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/60">{label}</span>
      <select
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400 disabled:opacity-40"
      >
        {options.length === 0 ? (
          <option value="">No devices</option>
        ) : (
          options.map((d) => (
            <option key={d.deviceId} value={d.deviceId} className="bg-zinc-900 text-white">
              {d.label || d.deviceId.slice(0, 12)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function ConnectDevicePanel(props: Props) {
  if (!props.open) return null;

  return (
    <div className="absolute inset-0 z-30" role="dialog" aria-modal="true" aria-label="Devices">
      <button
        type="button"
        aria-label="Close devices"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={props.onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-white/10 border-b-0 bg-zinc-950/95 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:inset-x-auto sm:bottom-24 sm:left-1/2 sm:w-[min(420px,92vw)] sm:-translate-x-1/2 sm:rounded-3xl sm:border-b">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300/90">
              WebSoft Connect
            </p>
            <h3 className="text-base font-semibold text-white">Devices</h3>
          </div>
          <button
            type="button"
            aria-label="Close devices"
            onClick={props.onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <SelectRow
            label="Microphone"
            value={props.selectedAudioInputId}
            options={props.audioInputs}
            onChange={props.onSwitchAudioInput}
          />
          <SelectRow
            label="Camera"
            value={props.selectedVideoInputId}
            options={props.videoInputs}
            onChange={props.onSwitchVideoInput}
          />
          <SelectRow
            label="Speaker"
            value={props.selectedAudioOutputId}
            options={props.audioOutputs}
            disabled={!props.canSelectSpeaker}
            onChange={props.onSetAudioOutput}
          />
          {!props.canSelectSpeaker && (
            <p className="text-xs text-white/50">Speaker selection isn’t supported in this browser.</p>
          )}
          <button
            type="button"
            onClick={props.onRefreshDevices}
            className="w-full rounded-xl border border-white/15 px-3 py-2.5 text-sm text-white/80 hover:bg-white/10"
          >
            Refresh devices
          </button>
        </div>
      </div>
    </div>
  );
}
