import { useSettingsTr } from '../../i18n/settingsBn';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import {
  DEFAULT_MOBILE_TOP_HEADER_STYLE,
  MOBILE_TOP_HEADER_STYLE_PREF_KEY,
  parseMobileTopHeaderStyle,
  type MobileTopHeaderStyle,
} from '../../lib/mobileTopHeader';

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-[13px]">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block py-2">
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

/** Settings panel — customize Mobile Preview top header appearance. */
export default function MobileTopHeaderPanel() {
  const tr = useSettingsTr();
  const token = useStore((s) => s.token);
  const stored = useStore((s) => s.mobileTopHeaderStyle);
  const setStyle = useStore((s) => s.setMobileTopHeaderStyle);
  const [draft, setDraft] = useState<MobileTopHeaderStyle>(() =>
    parseMobileTopHeaderStyle(stored),
  );
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => draft, [draft]);

  const patch = (partial: Partial<MobileTopHeaderStyle>) => {
    setDraft((d) => ({ ...d, ...partial }));
  };

  const save = async () => {
    if (!token) return;
    setSaving(true);
    try {
      setStyle(draft);
      const res = await fetch('/api/settings/account', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: { [MOBILE_TOP_HEADER_STYLE_PREF_KEY]: draft },
        }),
      });
      if (!res.ok) throw new Error('save failed');
      toast.success('Mobile header style saved');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft({ ...DEFAULT_MOBILE_TOP_HEADER_STYLE });
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground leading-snug">
        Mobile Preview only (phones / tablets). Desktop header stays unchanged.
      </p>

      <div className="rounded-xl border border-border bg-card/50 px-3 py-1 divide-y divide-border/50">
        <Toggle
          label="Transparent background"
          checked={preview.transparent}
          onChange={(v) => patch({ transparent: v })}
        />
        <Toggle label="Blur / glass" checked={preview.blur} onChange={(v) => patch({ blur: v })} />
        <Toggle label="Bottom border" checked={preview.border} onChange={(v) => patch({ border: v })} />
        <Toggle label="Subtle shadow" checked={preview.shadow} onChange={(v) => patch({ shadow: v })} />
        <Toggle
          label="Profile border"
          checked={preview.profileBorder}
          onChange={(v) => patch({ profileBorder: v })}
        />
      </div>

      {!preview.transparent && (
        <label className="block text-[13px]">
          <span className="font-medium">{tr('Background')}</span>
          <select
            value={preview.background}
            onChange={(e) => patch({ background: e.target.value as MobileTopHeaderStyle['background'] })}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="auto">Auto (page)</option>
            <option value="card">{tr('Card')}</option>
            <option value="background">{tr('Page background')}</option>
            <option value="primary">{tr('Brand / display color')}</option>
            <option value="custom">{tr('Custom color')}</option>
          </select>
        </label>
      )}

      {preview.background === 'custom' && !preview.transparent && (
        <label className="block text-[13px]">
          <span className="font-medium">{tr('Custom background')}</span>
          <input
            type="color"
            value={preview.customBackground || '#0b0e11'}
            onChange={(e) => patch({ customBackground: e.target.value })}
            className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-border bg-background"
          />
        </label>
      )}

      <label className="block text-[13px]">
        <span className="font-medium">{tr('Logo color')}</span>
        <select
          value={preview.logoColor}
          onChange={(e) => patch({ logoColor: e.target.value as MobileTopHeaderStyle['logoColor'] })}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="primary">{tr('Brand color')}</option>
          <option value="foreground">{tr('Foreground')}</option>
          <option value="auto">{tr('Auto')}</option>
          <option value="custom">{tr('Custom')}</option>
        </select>
      </label>

      <div className="rounded-xl border border-border bg-card/50 px-3 py-1">
        <Slider
          label="Blur intensity"
          value={preview.blurIntensity}
          min={0}
          max={32}
          onChange={(v) => patch({ blurIntensity: v })}
          suffix="px"
        />
        <Slider
          label="Border opacity"
          value={Math.round(preview.borderOpacity * 100)}
          min={0}
          max={100}
          onChange={(v) => patch({ borderOpacity: v / 100 })}
          suffix="%"
        />
        <Slider label="Header height" value={preview.height} min={40} max={64} onChange={(v) => patch({ height: v })} suffix="px" />
        <Slider label="Side padding" value={preview.paddingX} min={8} max={24} onChange={(v) => patch({ paddingX: v })} suffix="px" />
        <Slider label="Logo size" value={preview.logoSize} min={14} max={24} onChange={(v) => patch({ logoSize: v })} suffix="px" />
        <Slider label="Profile size" value={preview.profileSize} min={28} max={44} onChange={(v) => patch({ profileSize: v })} suffix="px" />
        <Slider
          label="Overall opacity"
          value={Math.round(preview.opacity * 100)}
          min={50}
          max={100}
          onChange={(v) => patch({ opacity: v / 100 })}
          suffix="%"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
