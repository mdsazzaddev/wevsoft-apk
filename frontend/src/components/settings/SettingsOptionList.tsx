import React, { useMemo } from 'react';
import {
  Contrast,
  Monitor,
  Moon,
  Palette,
  Sliders,
  Sun,
} from 'lucide-react';
import type { ConsumerSettingOption } from '../../pages/consumerSettingsData';
import { getSettingsControlKind } from '../../lib/settingsControlKind';
import {
  SettingsChannelAccordion,
  SettingsChoiceAccordion,
  SettingsNavRow,
  SettingsSwitchRow,
  type ChoiceOption,
} from './SettingsRows';
import { useSettingsTr } from '../../i18n/settingsBn';
import { ACCENT_THEMES } from '@wevsoft/shared/accentThemes';
import { ACCENT_OPTION_ID, THEME_MODE_OPTION_ID } from '../../lib/settingsControlKind';

const THEME_CHOICES: ChoiceOption[] = [
  { value: 'Light mode', short: 'Light', label: 'Light mode', icon: <Sun size={18} /> },
  { value: 'Dark mode', short: 'Dark', label: 'Dark mode', icon: <Moon size={18} /> },
  { value: 'System default', short: 'System', label: 'System default', icon: <Monitor size={18} /> },
  { value: 'OLED True Black', short: 'OLED', label: 'OLED True Black', icon: <Contrast size={18} /> },
];

function themeIcon(value: unknown) {
  const v = String(value || '').toLowerCase();
  if (v.includes('oled')) return <Contrast size={20} />;
  if (v.includes('light')) return <Sun size={20} />;
  if (v.includes('system')) return <Monitor size={20} />;
  return <Moon size={20} />;
}

export type SettingsOptionListProps = {
  options: ConsumerSettingOption[];
  valuesMap: Record<string, any>;
  isSaving: Record<string, boolean>;
  /** Currently expanded accordion option id (from ?opt=). */
  expandedOptionId?: string | null;
  onToggleExpand: (opt: ConsumerSettingOption) => void;
  onNavigate: (opt: ConsumerSettingOption) => void;
  onSave: (optionId: string, value: any) => void | Promise<void>;
  /** Optional per-option subtitle override (e.g. account status badges). */
  subtitleFor?: (opt: ConsumerSettingOption) => string | undefined;
  /** Optional trailing node for nav rows. */
  trailingFor?: (opt: ConsumerSettingOption) => React.ReactNode;
  /** Hide accent when Theme accordion embeds it. */
  embedAccentInTheme?: boolean;
};

/**
 * Renders a Facebook-style settings card body: switches, choice/channel accordions, nav rows.
 */
export default function SettingsOptionList({
  options,
  valuesMap,
  isSaving,
  expandedOptionId,
  onToggleExpand,
  onNavigate,
  onSave,
  subtitleFor,
  trailingFor,
  embedAccentInTheme = true,
}: SettingsOptionListProps) {
  const tr = useSettingsTr();

  const visible = useMemo(() => {
    const hasTheme = options.some((o) => o.id === THEME_MODE_OPTION_ID);
    return options.filter((opt) => {
      if (embedAccentInTheme && hasTheme && opt.id === ACCENT_OPTION_ID) return false;
      return true;
    });
  }, [options, embedAccentInTheme]);

  // Group headers
  const nodes: React.ReactNode[] = [];
  visible.forEach((opt, idx) => {
    if (opt.group && opt.group !== visible[idx - 1]?.group) {
      nodes.push(
        <div
          key={`g-${opt.group}`}
          role="heading"
          aria-level={3}
          className="px-4 sm:px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground bg-muted/30"
        >
          {tr(opt.group)}
        </div>,
      );
    }

    const kind = getSettingsControlKind(opt);
    const saving = !!isSaving[opt.id];
    const currentVal = valuesMap[opt.id];
    const expanded = expandedOptionId === opt.id;

    if (kind === 'switch') {
      nodes.push(
        <SettingsSwitchRow
          key={opt.id}
          id={opt.id}
          title={opt.name}
          description={opt.description}
          checked={Boolean(currentVal)}
          saving={saving}
          disabled={opt.id === 'student_mode' && Boolean(valuesMap['student_mode_locked'])}
          onChange={(next) => { void onSave(opt.id, next); }}
        />,
      );
      return;
    }

    if (kind === 'choice') {
      const isTheme = opt.id === THEME_MODE_OPTION_ID;
      const choiceOpts: ChoiceOption[] = isTheme
        ? THEME_CHOICES
        : (opt.options || []).map((v) => ({ value: v, label: v }));

      const accentExtra =
        isTheme && embedAccentInTheme ? (
          <div className="mt-3">
            <div className="flex items-center gap-2 px-0.5 mb-2">
              <Palette size={14} className="text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tr('Accent color')}
              </span>
              {isSaving[ACCENT_OPTION_ID] ? (
                <span className="text-[11px] text-muted-foreground">{tr('Saving...')}</span>
              ) : null}
            </div>
            <div
              role="radiogroup"
              aria-label={tr('Accent color')}
              className="rounded-xl border border-border/70 bg-background/60 overflow-hidden divide-y divide-border/50"
            >
              {ACCENT_THEMES.map((theme) => {
                const selected = String(valuesMap[ACCENT_OPTION_ID] || '') === theme.name;
                return (
                  <button
                    key={theme.name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!!isSaving[ACCENT_OPTION_ID]}
                    onClick={() => { void onSave(ACCENT_OPTION_ID, theme.name); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors disabled:opacity-60 min-h-[48px] ${
                      selected ? 'bg-primary/5' : 'hover:bg-muted/60'
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-full border border-border/60 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: theme.hex }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                      {tr(theme.name)}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? 'border-primary' : 'border-muted-foreground/35'
                      }`}
                      aria-hidden="true"
                    >
                      {selected ? <span className="w-2.5 h-2.5 rounded-full bg-primary" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null;

      nodes.push(
        <SettingsChoiceAccordion
          key={opt.id}
          id={opt.id}
          title={isTheme ? 'Theme' : opt.name}
          description={opt.description}
          value={currentVal}
          options={choiceOpts}
          expanded={expanded}
          saving={saving}
          onToggleExpand={() => onToggleExpand(opt)}
          onSelect={(v) => { void onSave(opt.id, v); }}
          icon={isTheme ? themeIcon(currentVal) : <Sliders size={20} />}
          expandedExtra={accentExtra}
        />,
      );
      return;
    }

    if (kind === 'channel') {
      const channels = ((opt as ConsumerSettingOption & {
        channels?: { id: string; label: string; description?: string }[];
      }).channels) || [];
      const raw = currentVal;
      let map: Record<string, boolean> = {};
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        map = raw as Record<string, boolean>;
      } else {
        channels.forEach((c) => { map[c.id] = false; });
      }
      nodes.push(
        <SettingsChannelAccordion
          key={opt.id}
          id={opt.id}
          title={opt.name}
          description={opt.description}
          values={map}
          channels={channels}
          expanded={expanded}
          saving={saving}
          onToggleExpand={() => onToggleExpand(opt)}
          onChangeChannel={(channelId, enabled) => {
            void onSave(opt.id, { ...map, [channelId]: enabled });
          }}
          icon={<Sliders size={20} />}
        />,
      );
      return;
    }

    // nav + destructive
    const sub =
      subtitleFor?.(opt) ||
      opt.actionText ||
      (opt.type === 'select' && currentVal != null ? String(currentVal) : opt.description);
    nodes.push(
      <SettingsNavRow
        key={opt.id}
        title={opt.name}
        subtitle={sub}
        onClick={() => onNavigate(opt)}
        saving={saving}
        destructive={kind === 'destructive'}
        unavailable={!!opt.unavailableNote}
        trailing={trailingFor?.(opt)}
        icon={<Sliders size={20} />}
      />,
    );
  });

  return <>{nodes}</>;
}
