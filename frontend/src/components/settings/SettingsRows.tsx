import React from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useSettingsTr } from '../../i18n/settingsBn';

const rowPad = 'px-4 sm:px-5';
const touchMin = 'min-h-[48px]';

type SwitchProps = {
  id: string;
  title: string;
  description?: string;
  checked: boolean;
  saving?: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  icon?: React.ReactNode;
};

/** Boolean setting: title + On/Off subtitle, native-feeling switch on the right. Instant save. */
export function SettingsSwitchRow({
  id,
  title,
  description,
  checked,
  saving,
  disabled,
  onChange,
  icon,
}: SwitchProps) {
  const tr = useSettingsTr();
  return (
    <div
      className={`w-full ${rowPad} py-3 flex items-center gap-3 ${touchMin} hover:bg-muted/50 transition-colors`}
    >
      {icon ? (
        <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-foreground leading-tight">{tr(title)}</div>
        <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <span>{checked ? tr('On') : tr('Off')}</span>
          {saving ? <Loader2 size={12} className="animate-spin text-primary" /> : null}
        </div>
        {description ? (
          <p className="text-[12px] text-muted-foreground/80 mt-1 leading-snug line-clamp-2 sm:line-clamp-1">
            {tr(description)}
          </p>
        ) : null}
      </div>
      <label
        className={`relative inline-flex items-center flex-shrink-0 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        htmlFor={`settings-switch-${id}`}
      >
        <span className="sr-only">{tr(title)}</span>
        <input
          id={`settings-switch-${id}`}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          disabled={disabled || saving}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className="w-11 h-7 bg-muted rounded-full peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-checked:bg-primary after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow after:transition-all peer-checked:after:translate-x-4 border border-border/40 peer-checked:border-primary"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}

export type ChoiceOption = {
  value: string;
  label?: string;
  /** Optional short label for collapsed subtitle */
  short?: string;
  icon?: React.ReactNode;
};

type ChoiceProps = {
  id: string;
  title: string;
  description?: string;
  value: unknown;
  options: ChoiceOption[];
  expanded: boolean;
  saving?: boolean;
  onToggleExpand: () => void;
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
  /** Extra content under the radio list when expanded (e.g. accent colors). */
  expandedExtra?: React.ReactNode;
};

function resolveChoice(options: ChoiceOption[], value: unknown): ChoiceOption | undefined {
  const v = String(value ?? '');
  return options.find((o) => o.value === v) || options.find((o) => o.label === v);
}

/** Small enum → Facebook accordion: collapsed shows current value; expands to radio rows. */
export function SettingsChoiceAccordion({
  id,
  title,
  description,
  value,
  options,
  expanded,
  saving,
  onToggleExpand,
  onSelect,
  icon,
  expandedExtra,
}: ChoiceProps) {
  const tr = useSettingsTr();
  const current = resolveChoice(options, value);
  const subtitle = current ? tr(current.short || current.label || current.value) : tr(String(value ?? ''));
  const panelId = `settings-choice-${id}`;

  return (
    <div className="bg-card">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        id={`${panelId}-trigger`}
        onClick={onToggleExpand}
        className={`w-full text-left ${rowPad} py-3.5 flex items-center gap-3 ${touchMin} hover:bg-muted/50 active:bg-muted transition-colors`}
      >
        {icon ? (
          <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground leading-tight">{tr(title)}</span>
          <span className="block text-[13px] text-muted-foreground mt-0.5 truncate">
            {subtitle}
            {saving ? <Loader2 size={12} className="inline-block ml-1.5 animate-spin text-primary align-middle" /> : null}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className={`${rowPad} pb-3.5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {description ? (
            <p className={`text-[13px] text-muted-foreground leading-snug mb-2 ${icon ? 'pl-[52px]' : ''}`}>
              {tr(description)}
            </p>
          ) : null}
          <div
            role="radiogroup"
            aria-label={tr(title)}
            className="rounded-xl border border-border/70 bg-background/60 overflow-hidden divide-y divide-border/50 max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain"
          >
            {options.map((opt) => {
              const selected = (current?.value ?? String(value ?? '')) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!saving}
                  onClick={() => onSelect(opt.value)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors disabled:opacity-60 min-h-[48px] ${
                    selected ? 'bg-primary/5' : 'hover:bg-muted/60'
                  }`}
                >
                  {opt.icon ? (
                    <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      {opt.icon}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 text-sm font-semibold text-foreground leading-tight">
                    {tr(opt.label || opt.value)}
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
          {expandedExtra}
        </div>
      )}
    </div>
  );
}

export type ChannelToggle = {
  id: string;
  label: string;
  description?: string;
};

type ChannelProps = {
  id: string;
  title: string;
  description?: string;
  /** Map of channel id → enabled */
  values: Record<string, boolean>;
  channels: ChannelToggle[];
  expanded: boolean;
  saving?: boolean;
  onToggleExpand: () => void;
  onChangeChannel: (channelId: string, enabled: boolean) => void;
  icon?: React.ReactNode;
  /** Collapsed subtitle, e.g. "Push, Email" */
  subtitle?: string;
  /** Heading above channel switches when expanded. */
  channelsHeading?: string;
  /** Channel ids that cannot be toggled (e.g. SMS when sender unavailable). */
  disabledChannels?: string[];
};

/** Multi-channel prefs (Push / Email / SMS): accordion with switch rows — Facebook notification style. */
export function SettingsChannelAccordion({
  id,
  title,
  description,
  values,
  channels,
  expanded,
  saving,
  onToggleExpand,
  onChangeChannel,
  icon,
  subtitle,
  channelsHeading,
  disabledChannels,
}: ChannelProps) {
  const tr = useSettingsTr();
  const enabledLabels = channels.filter((c) => values[c.id]).map((c) => tr(c.label));
  const collapsedSub =
    subtitle ||
    (enabledLabels.length ? enabledLabels.join(', ') : tr('Off'));
  const panelId = `settings-channel-${id}`;

  return (
    <div className="bg-card">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        id={`${panelId}-trigger`}
        onClick={onToggleExpand}
        className={`w-full text-left ${rowPad} py-3.5 flex items-center gap-3 ${touchMin} hover:bg-muted/50 active:bg-muted transition-colors`}
      >
        {icon ? (
          <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-foreground leading-tight">{tr(title)}</span>
          <span className="block text-[13px] text-muted-foreground mt-0.5 truncate">
            {collapsedSub}
            {saving ? <Loader2 size={12} className="inline-block ml-1.5 animate-spin text-primary align-middle" /> : null}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`text-muted-foreground flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={`${panelId}-trigger`}
          className={`${rowPad} pb-3.5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {description ? (
            <p className={`text-[13px] text-muted-foreground leading-snug mb-2 ${icon ? 'pl-[52px]' : ''}`}>
              {tr(description)}
            </p>
          ) : null}
          {channelsHeading ? (
            <p className={`text-[13px] font-semibold text-foreground mb-2 ${icon ? 'pl-[52px]' : ''}`}>
              {tr(channelsHeading)}
            </p>
          ) : null}
          <div className="rounded-xl border border-border/70 bg-background/60 overflow-hidden divide-y divide-border/50">
            {channels.map((ch) => (
              <SettingsSwitchRow
                key={ch.id}
                id={`${id}-${ch.id}`}
                title={ch.label}
                description={ch.description}
                checked={!!values[ch.id]}
                saving={saving}
                disabled={disabledChannels?.includes(ch.id)}
                onChange={(next) => onChangeChannel(ch.id, next)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type NavProps = {
  title: string;
  subtitle?: string;
  onClick: () => void;
  icon?: React.ReactNode;
  saving?: boolean;
  destructive?: boolean;
  unavailable?: boolean;
  trailing?: React.ReactNode;
};

/** Complex / external / destructive: chevron row that opens a panel or confirm flow. */
export function SettingsNavRow({
  title,
  subtitle,
  onClick,
  icon,
  saving,
  destructive,
  unavailable,
  trailing,
}: NavProps) {
  const tr = useSettingsTr();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left ${rowPad} py-3.5 flex items-center gap-3 ${touchMin} hover:bg-muted/50 active:bg-muted transition-colors group`}
    >
      {icon ? (
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            destructive ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-foreground'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[15px] font-semibold leading-tight truncate ${
            destructive ? 'text-rose-600 dark:text-rose-400' : 'text-foreground group-hover:text-primary'
          } transition-colors`}
        >
          {tr(title)}
        </span>
        {subtitle ? (
          <span className="block text-[13px] text-muted-foreground mt-0.5 truncate">{tr(subtitle)}</span>
        ) : null}
      </span>
      <span className="flex items-center gap-2 flex-shrink-0">
        {saving ? <Loader2 size={14} className="animate-spin text-primary" /> : null}
        {unavailable ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tr('Not available')}
          </span>
        ) : null}
        {trailing}
        <ChevronRight
          size={18}
          className={`text-muted-foreground group-hover:translate-x-0.5 transition-transform ${
            destructive ? 'text-rose-400' : ''
          }`}
        />
      </span>
    </button>
  );
}
