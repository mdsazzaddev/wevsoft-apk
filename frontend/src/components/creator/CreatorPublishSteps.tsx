import React from 'react';
import {
  CONTENT_CATEGORIES,
  COPYRIGHT_TYPES,
  CreatorPublishSettings,
  DISCLOSURE_TYPES,
  PUBLISH_TIMEZONES,
  UPLOAD_QUALITIES,
  VISIBILITY_TYPES,
  disclosureLabels,
} from '../../lib/creatorPublish';
import type { ScheduleMode } from '../../lib/publishDraft';

export const selectClass =
  'w-full bg-muted/70 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40';
export const inputClass =
  'w-full bg-muted/70 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/40';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children}
    </label>
  );
}

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

function ChoiceCard({
  selected,
  title,
  hint,
  onClick,
}: {
  key?: string;
  selected: boolean;
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
      }`}
    >
      <p className="text-xs font-bold">{title}</p>
      {hint && <p className="text-[11px] opacity-80 mt-0.5">{hint}</p>}
    </button>
  );
}

function primaryDisclosure(s: CreatorPublishSettings): CreatorPublishSettings['contentDisclosureType'] {
  if (s.isAiGenerated) return 'ai_generated';
  if (s.isAiAssisted) return 'ai_assisted';
  if (s.isSponsoredContent) return 'sponsored';
  if (s.isPaidPartnership) return 'paid_partnership';
  if (s.isBrandCollaboration) return 'brand_collaboration';
  return 'none';
}

export function StepQualityPicker({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div>
      <FieldLabel>Original Quality Upload</FieldLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {UPLOAD_QUALITIES.map((q) => (
          <ChoiceCard
            key={q.value}
            selected={value.uploadQuality === q.value}
            title={q.label}
            hint={q.hint}
            onClick={() => onChange({ ...value, uploadQuality: q.value })}
          />
        ))}
      </div>
    </div>
  );
}

export function StepContentDetails({
  value,
  onChange,
  hideHashtags,
  hideLocation,
  hideTitleDescription,
  extra,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
  hideHashtags?: boolean;
  hideLocation?: boolean;
  hideTitleDescription?: boolean;
  extra?: React.ReactNode;
}) {
  const set = <K extends keyof CreatorPublishSettings>(key: K, val: CreatorPublishSettings[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-4">
      {!hideTitleDescription && (
        <>
          <div>
            <FieldLabel>Title</FieldLabel>
            <input value={value.title} onChange={(e) => set('title', e.target.value)} placeholder="Give this upload a title" className={inputClass} maxLength={200} />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              value={value.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Tell viewers what this is about"
              className={`${inputClass} min-h-[96px] resize-none`}
            />
          </div>
        </>
      )}
      <div>
        <FieldLabel>Content Category</FieldLabel>
        <select aria-label="Content category" value={value.contentCategory} onChange={(e) => set('contentCategory', e.target.value)} className={selectClass}>
          <option value="">Select content category</option>
          {CONTENT_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      {!hideHashtags && (
        <div>
          <FieldLabel>Hashtags</FieldLabel>
          <input value={value.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#gaming #tutorial" className={inputClass} />
        </div>
      )}
      <div>
        <FieldLabel>Tags</FieldLabel>
        <input value={value.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Comma-separated tags" className={inputClass} />
      </div>
      {!hideLocation && (
        <div>
          <FieldLabel>Location</FieldLabel>
          <input value={value.location} onChange={(e) => set('location', e.target.value)} placeholder="City, country" className={inputClass} />
        </div>
      )}
      {extra}
    </div>
  );
}

export function StepContentDisclosure({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  const toggle = (key: keyof CreatorPublishSettings, checked: boolean) => {
    const next = { ...value, [key]: checked } as CreatorPublishSettings;
    onChange({ ...next, contentDisclosureType: primaryDisclosure(next) });
  };

  return (
    <div className="space-y-1 rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
      <ToggleRow label="AI Generated" hint="This video was created by AI" checked={value.isAiGenerated} onChange={(v) => toggle('isAiGenerated', v)} />
      <ToggleRow label="AI Assisted" hint="AI helped create or edit this" checked={value.isAiAssisted} onChange={(v) => toggle('isAiAssisted', v)} />
      <ToggleRow label="Sponsored Content" checked={value.isSponsoredContent} onChange={(v) => toggle('isSponsoredContent', v)} />
      <ToggleRow label="Paid Partnership" checked={value.isPaidPartnership} onChange={(v) => toggle('isPaidPartnership', v)} />
      <ToggleRow label="Brand Collaboration" checked={value.isBrandCollaboration} onChange={(v) => toggle('isBrandCollaboration', v)} />
    </div>
  );
}

export function StepSafety({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
      <ToggleRow label="Sensitive Content Warning" checked={value.isSensitiveContent} onChange={(v) => onChange({ ...value, isSensitiveContent: v })} />
      <ToggleRow label="Age Restricted Content" checked={value.isAgeRestricted} onChange={(v) => onChange({ ...value, isAgeRestricted: v })} />
    </div>
  );
}

export function StepAudienceVisibility({
  value,
  onChange,
  showHeading = true,
  showSafety = true,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
  showHeading?: boolean;
  showSafety?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        {showHeading && <FieldLabel>Visibility</FieldLabel>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VISIBILITY_TYPES.map((opt) => (
            <ChoiceCard
              key={opt.value}
              selected={value.visibilityType === opt.value}
              title={opt.label}
              hint={opt.hint}
              onClick={() => onChange({ ...value, visibilityType: opt.value })}
            />
          ))}
        </div>
      </div>
      {showSafety && (
        <div>
          <FieldLabel>Content Safety</FieldLabel>
          <StepSafety value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

export function StepInteractionControls({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2 space-y-1">
      <ToggleRow label="Enable Comments" hint="Allow viewers to comment" checked={value.enableComments} onChange={(v) => onChange({ ...value, enableComments: v })} />
      <ToggleRow label="Allow Remix & Reuse" hint="Let others remix this video" checked={value.allowRemix} onChange={(v) => onChange({ ...value, allowRemix: v })} />
      <ToggleRow label="Allow Duets" checked={value.allowDuets} onChange={(v) => onChange({ ...value, allowDuets: v })} />
      <ToggleRow label="Allow Downloads" checked={value.allowDownloads} onChange={(v) => onChange({ ...value, allowDownloads: v })} />
      <ToggleRow label="Allow Sharing" checked={value.allowSharing} onChange={(v) => onChange({ ...value, allowSharing: v })} />
      <ToggleRow label="Allow Embeds" checked={value.allowEmbeds} onChange={(v) => onChange({ ...value, allowEmbeds: v })} />
    </div>
  );
}

export function StepAccessibility({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
        <ToggleRow label="Auto Captions" checked={value.autoCaptionsEnabled} onChange={(v) => onChange({ ...value, autoCaptionsEnabled: v })} />
        <ToggleRow label="Audio Description" checked={value.audioDescriptionEnabled} onChange={(v) => onChange({ ...value, audioDescriptionEnabled: v })} />
      </div>
      <div>
        <FieldLabel>Custom Captions</FieldLabel>
        <textarea
          value={value.captionText}
          onChange={(e) => onChange({ ...value, captionText: e.target.value })}
          placeholder="Paste or write captions…"
          className={`${inputClass} min-h-[88px] resize-none`}
        />
      </div>
      <div>
        <FieldLabel>Alt Text</FieldLabel>
        <input
          value={value.altText}
          onChange={(e) => onChange({ ...value, altText: e.target.value })}
          placeholder="Describe the visual content"
          className={inputClass}
        />
      </div>
    </div>
  );
}

export function StepMonetization({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
      <ToggleRow label="Enable Monetization" checked={value.monetizationEnabled} onChange={(v) => onChange({ ...value, monetizationEnabled: v })} />
      <ToggleRow label="Revenue Sharing Eligible" checked={value.revenueShareEligible} onChange={(v) => onChange({ ...value, revenueShareEligible: v })} />
    </div>
  );
}

export function StepCopyright({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {COPYRIGHT_TYPES.map((c) => (
          <ChoiceCard
            key={c.value}
            selected={value.copyrightType === c.value}
            title={c.label}
            onClick={() => onChange({ ...value, copyrightType: c.value })}
          />
        ))}
      </div>
      <div>
        <FieldLabel>Copyright Notes</FieldLabel>
        <textarea
          value={value.copyrightNotes}
          onChange={(e) => onChange({ ...value, copyrightNotes: e.target.value })}
          placeholder="License notes, credits, or rights information"
          className={`${inputClass} min-h-[72px] resize-none`}
        />
      </div>
    </div>
  );
}

export function StepMonetizationCopyright({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Monetization</FieldLabel>
        <StepMonetization value={value} onChange={onChange} />
      </div>
      <div>
        <FieldLabel>Copyright</FieldLabel>
        <StepCopyright value={value} onChange={onChange} />
      </div>
    </div>
  );
}

export function StepPublishingOptions({
  value,
  onChange,
  scheduleMode,
  onScheduleMode,
  scheduleDate,
  scheduleTime,
  timezone,
  onScheduleDate,
  onScheduleTime,
  onTimezone,
  showProfileOptions = true,
  showHeading = true,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
  scheduleMode: ScheduleMode;
  onScheduleMode: (mode: ScheduleMode) => void;
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
  onScheduleDate: (v: string) => void;
  onScheduleTime: (v: string) => void;
  onTimezone: (v: string) => void;
  showProfileOptions?: boolean;
  showHeading?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        {showHeading && <FieldLabel>Publishing</FieldLabel>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceCard
            selected={scheduleMode === 'now'}
            title="Publish Now"
            hint="Go live as soon as processing finishes"
            onClick={() => onScheduleMode('now')}
          />
          <ChoiceCard
            selected={scheduleMode === 'schedule'}
            title="Schedule Post"
            hint="Pick a date and time to publish"
            onClick={() => onScheduleMode('schedule')}
          />
        </div>
      </div>

      {scheduleMode === 'schedule' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={scheduleDate} onChange={(e) => onScheduleDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Time</FieldLabel>
            <input type="time" value={scheduleTime} onChange={(e) => onScheduleTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel>Timezone</FieldLabel>
            <select value={timezone} onChange={(e) => onTimezone(e.target.value)} className={selectClass}>
              {PUBLISH_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {showProfileOptions && (
        <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
          <ToggleRow label="Pin To Profile" hint="Keep this at the top of your profile" checked={value.pinToProfile} onChange={(v) => onChange({ ...value, pinToProfile: v })} />
          <ToggleRow label="Feature On Profile" hint="Highlight this in your featured row" checked={value.featuredContent} onChange={(v) => onChange({ ...value, featuredContent: v })} />
        </div>
      )}
    </div>
  );
}

export function StepProfileOptions({
  value,
  onChange,
}: {
  value: CreatorPublishSettings;
  onChange: (next: CreatorPublishSettings) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card dark:bg-card/60 px-4 py-2">
      <ToggleRow label="Pin To Profile" hint="Keep this at the top of your profile" checked={value.pinToProfile} onChange={(v) => onChange({ ...value, pinToProfile: v })} />
      <ToggleRow label="Feature On Profile" hint="Highlight this in your featured row" checked={value.featuredContent} onChange={(v) => onChange({ ...value, featuredContent: v })} />
    </div>
  );
}

export type ReviewEditTarget =
  | 'content'
  | 'visibility'
  | 'interaction'
  | 'disclosure'
  | 'safety'
  | 'schedule'
  | 'more';

export function PublishReviewCard({
  preview,
  thumbnail,
  settings,
  scheduleMode,
  scheduleDate,
  scheduleTime,
  timezone,
  onEdit,
}: {
  preview: string | null;
  thumbnail: string;
  settings: CreatorPublishSettings;
  scheduleMode: ScheduleMode;
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
  onEdit?: (target: ReviewEditTarget) => void;
}) {
  const category = CONTENT_CATEGORIES.find((c) => c.slug === settings.contentCategory)?.name || 'Uncategorized';
  const visibility = VISIBILITY_TYPES.find((v) => v.value === settings.visibilityType)?.label || 'Public';
  const labels = disclosureLabels(settings);
  const tzLabel = PUBLISH_TIMEZONES.find((t) => t.value === timezone)?.label || timezone;
  const scheduleInfo =
    scheduleMode === 'schedule' && scheduleDate
      ? `${scheduleDate} ${scheduleTime || ''} · ${tzLabel}`
      : 'Publish now';
  const interactions = [
    settings.enableComments && 'Comments',
    settings.allowRemix && 'Remix',
    settings.allowDuets && 'Duets',
    settings.allowDownloads && 'Downloads',
    settings.allowSharing && 'Sharing',
    settings.allowEmbeds && 'Embeds',
  ].filter(Boolean).join(' · ') || 'All off';
  const safety = [
    settings.isSensitiveContent && 'Sensitive content',
    settings.isAgeRestricted && 'Age restricted',
  ].filter(Boolean).join(' · ') || 'None';
  const monetization = settings.monetizationEnabled
    ? settings.revenueShareEligible
      ? 'Enabled · Revenue sharing eligible'
      : 'Enabled'
    : 'Off';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ReviewBlock title="Video Preview" onEdit={onEdit} target="content">
          <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-56">
            {preview ? (
              <video src={preview} className="w-full h-full object-contain" muted playsInline />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-white/60">No video</div>
            )}
          </div>
        </ReviewBlock>
        <ReviewBlock title="Thumbnail" onEdit={onEdit} target="content">
          <div className="rounded-2xl overflow-hidden bg-muted aspect-[9/16] max-h-56">
            {thumbnail ? (
              <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No thumbnail</div>
            )}
          </div>
        </ReviewBlock>
      </div>

      <div className="rounded-2xl border border-border divide-y divide-border">
        <ReviewRow label="Title" value={settings.title || 'Untitled'} onEdit={onEdit} target="content" />
        <ReviewRow label="Description" value={settings.description || '—'} onEdit={onEdit} target="content" />
        <ReviewRow label="Category" value={category} onEdit={onEdit} target="content" />
        <ReviewRow label="Hashtags" value={settings.hashtags || '—'} onEdit={onEdit} target="content" />
        <ReviewRow label="Visibility" value={visibility} onEdit={onEdit} target="visibility" />
        <ReviewRow label="Interaction Settings" value={interactions} onEdit={onEdit} target="interaction" />
        <ReviewRow label="Disclosure Labels" value={labels.length ? labels.join(' · ') : 'No disclosure'} onEdit={onEdit} target="disclosure" />
        <ReviewRow label="Safety Labels" value={safety} onEdit={onEdit} target="safety" />
        <ReviewRow label="Schedule Information" value={scheduleInfo} onEdit={onEdit} target="schedule" />
        <ReviewRow label="Monetization Status" value={monetization} onEdit={onEdit} target="more" />
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
  onEdit,
  target,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: (target: ReviewEditTarget) => void;
  target: ReviewEditTarget;
}) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{title}</p>
        {onEdit && (
          <button type="button" onClick={() => onEdit(target)} className="text-[11px] font-bold text-primary hover:underline">
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  target,
}: {
  label: string;
  value: string;
  onEdit?: (target: ReviewEditTarget) => void;
  target?: ReviewEditTarget;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pt-0.5">{label}</span>
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-sm font-semibold text-right text-foreground break-words">{value}</span>
        {onEdit && target && (
          <button type="button" onClick={() => onEdit(target)} className="text-[11px] font-bold text-primary hover:underline shrink-0">
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export function PublishSettingsSummary({ value }: { value: CreatorPublishSettings }) {
  const category = CONTENT_CATEGORIES.find((c) => c.slug === value.contentCategory)?.name || 'Uncategorized';
  const vis = VISIBILITY_TYPES.find((v) => v.value === value.visibilityType)?.label || 'Public';
  return (
    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{category}</span>
      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{vis}</span>
      {value.contentDisclosureType !== 'none' && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          {DISCLOSURE_TYPES.find((d) => d.value === value.contentDisclosureType)?.label}
        </span>
      )}
    </div>
  );
}
