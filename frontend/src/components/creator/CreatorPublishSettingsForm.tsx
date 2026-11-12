import React from 'react';
import type { CreatorPublishSettings } from '../../lib/creatorPublish';
import {
  StepAccessibility,
  StepAudienceVisibility,
  StepContentDetails,
  StepContentDisclosure,
  StepInteractionControls,
  StepMonetizationCopyright,
  StepPublishingOptions,
  StepQualityPicker,
  PublishSettingsSummary,
} from './CreatorPublishSteps';

export { PublishSettingsSummary };

interface Props {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
  hideHashtags?: boolean;
  hideLocation?: boolean;
  /** Tighter spacing for nested panels (e.g. AI Post Creator settings). */
  compact?: boolean;
}

function Block({ title, children, compact }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
      <h4 className={`font-bold uppercase tracking-wide text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs tracking-widest font-extrabold'}`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

/** Stacked editor for admin / post settings. Video upload uses the stepped wizard instead. */
export function CreatorPublishSettingsForm({ value, onChange, hideHashtags, hideLocation, compact }: Props) {
  return (
    <div className={compact ? 'space-y-3 [&_label]:mb-1 [&_label]:text-[10px] [&_select]:py-1.5 [&_select]:text-xs [&_select]:rounded-lg [&_input]:py-1.5 [&_input]:text-xs [&_input]:rounded-lg [&_textarea]:text-xs [&_textarea]:py-1.5 [&_textarea]:rounded-lg [&_p.text-sm]:text-xs [&_.py-2]:py-1' : 'space-y-6'}>
      <Block compact={compact} title="Original Quality Upload">
        <StepQualityPicker value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Content Details">
        <StepContentDetails value={value} onChange={onChange} hideHashtags={hideHashtags} hideLocation={hideLocation} />
      </Block>
      <Block compact={compact} title="Content Disclosure">
        <StepContentDisclosure value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Audience & Visibility">
        <StepAudienceVisibility value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Interaction Controls">
        <StepInteractionControls value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Accessibility">
        <StepAccessibility value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Monetization & Copyright">
        <StepMonetizationCopyright value={value} onChange={onChange} />
      </Block>
      <Block compact={compact} title="Publishing">
        <StepPublishingOptions
          value={value}
          onChange={onChange}
          scheduleMode={value.scheduledPublishAt ? 'schedule' : 'now'}
          onScheduleMode={(mode) => {
            if (mode === 'now') {
              onChange({ ...value, scheduledPublishAt: '' });
              return;
            }
            if (!value.scheduledPublishAt) {
              const next = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
              onChange({ ...value, scheduledPublishAt: next });
            }
          }}
          scheduleDate={value.scheduledPublishAt ? value.scheduledPublishAt.slice(0, 10) : ''}
          scheduleTime={value.scheduledPublishAt ? value.scheduledPublishAt.slice(11, 16) : ''}
          timezone="auto"
          onScheduleDate={(d) => {
            const t = value.scheduledPublishAt ? value.scheduledPublishAt.slice(11, 16) : '12:00';
            onChange({ ...value, scheduledPublishAt: d && t ? `${d}T${t}` : '' });
          }}
          onScheduleTime={(t) => {
            const d = value.scheduledPublishAt ? value.scheduledPublishAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
            onChange({ ...value, scheduledPublishAt: d && t ? `${d}T${t}` : '' });
          }}
          onTimezone={() => undefined}
        />
      </Block>
    </div>
  );
}
