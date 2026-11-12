/**
 * The customize surface: theme, accent, call-to-action, features, tabs, links,
 * business hours and visibility.
 *
 * Deliberately a controlled component over a SpaceDraft-shaped object so the
 * creation wizard and the (later) edit screen drive the same UI, and so every
 * keystroke can feed the live preview.
 */

import type { ReactNode } from 'react';
import { GripVertical, Info, Plus, Trash2 } from 'lucide-react';
import {
  ALWAYS_ON_TABS,
  MAX_SPACE_LINKS,
  SPACE_CTA_TYPES,
  SPACE_FEATURES,
  SPACE_FEATURE_LABELS,
  SPACE_LIMITS,
  SPACE_LINK_PLATFORMS,
  SPACE_TABS,
  SPACE_TAB_LABELS,
  SPACE_THEMES,
  SPACE_VISIBILITIES,
  SPACE_VISIBILITY_LABELS,
  WEEK_DAYS,
  defaultBusinessHours,
  isSpaceFeature,
  normalizeHexColor,
  resolveSpaceAccent,
  spaceCtaDef,
  type SpaceCtaType,
  type SpaceDraft,
  type SpaceFeature,
  type SpaceLinkPlatform,
  type SpaceTab,
  type SpaceThemeId,
  type SpaceVisibility,
} from '@wevsoft/shared/wevspace';
import Switch from '../ui/Switch';
import SpaceImagePicker from './SpaceImagePicker';
import { spaceLinkIcon } from './spaceIcons';

interface Props {
  draft: SpaceDraft;
  onChange: (patch: Partial<SpaceDraft>) => void;
  /** Attributes uploads to an existing Space instead of the draft. */
  spaceId?: string;
  /** Hides the images block when the caller already renders it (wizard step 2). */
  showImages?: boolean;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-3xl p-4 sm:p-5">
      <h3 className="font-black text-sm">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

export default function SpaceCustomizeForm({ draft, onChange, spaceId, showImages = true }: Props) {
  const accent = resolveSpaceAccent(draft);
  const ctaDef = spaceCtaDef(draft.ctaType);
  const hours = draft.businessHours;

  const toggleFeature = (feature: SpaceFeature, on: boolean) => {
    const features = { ...draft.features, [feature]: on };
    // A tab whose feature just went off must leave the tab list too, otherwise
    // the stored tabs and the rendered tabs would disagree.
    const tabs = on
      ? draft.tabs.includes(feature as SpaceTab) || !SPACE_TABS.includes(feature as SpaceTab)
        ? draft.tabs
        : [...draft.tabs, feature as SpaceTab]
      : draft.tabs.filter((tab) => tab !== (feature as SpaceTab));
    onChange({ features, tabs });
  };

  const toggleTab = (tab: SpaceTab, on: boolean) => {
    if (ALWAYS_ON_TABS.includes(tab)) return;
    onChange({ tabs: on ? [...draft.tabs, tab] : draft.tabs.filter((t) => t !== tab) });
  };

  const setLink = (index: number, patch: Partial<SpaceDraft['links'][number]>) => {
    const links = draft.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    onChange({ links });
  };

  const tabAvailable = (tab: SpaceTab) =>
    ALWAYS_ON_TABS.includes(tab) || !isSpaceFeature(tab) || draft.features[tab as SpaceFeature];

  return (
    <div className="space-y-3.5">
      {showImages && (
        <Section title="Images" hint="A clear profile image and a wide cover make a Space feel finished.">
          <div className="space-y-4">
            <SpaceImagePicker
              value={draft.avatar}
              onChange={(url) => onChange({ avatar: url })}
              shape="avatar"
              spaceId={spaceId}
              label="Profile image"
              hint="Square works best — at least 400×400."
            />
            <SpaceImagePicker
              value={draft.cover}
              onChange={(url) => onChange({ cover: url })}
              shape="cover"
              spaceId={spaceId}
              label="Cover image"
              hint="Wide image, around 1600×600."
            />
          </div>
        </Section>
      )}

      <Section title="Theme" hint="Sets the accent colour and the gradient shown before you upload a cover.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SPACE_THEMES.map((theme) => {
            const active = draft.themePreset === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChange({ themePreset: theme.id as SpaceThemeId, accentColor: null })}
                aria-pressed={active}
                className={`p-2 rounded-2xl border-2 text-left transition-colors ${
                  active ? 'border-primary' : 'border-border hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <span className={`block h-8 rounded-xl bg-gradient-to-br ${theme.cover}`} />
                <span className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
                  <span className="text-xs font-extrabold">{theme.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="space-accent" className="text-sm font-extrabold">
            Accent colour
          </label>
          <input
            id="space-accent"
            type="color"
            value={accent}
            onChange={(e) => onChange({ accentColor: normalizeHexColor(e.target.value) })}
            className="w-10 h-10 rounded-xl border border-border bg-transparent cursor-pointer"
          />
          <code className="text-xs font-bold text-muted-foreground">{accent}</code>
          {draft.accentColor && (
            <button
              type="button"
              onClick={() => onChange({ accentColor: null })}
              className="text-xs font-extrabold text-muted-foreground hover:text-foreground"
            >
              Use theme colour
            </button>
          )}
        </div>
      </Section>

      <Section title="Features" hint="Turn off what you don't need — the matching tab disappears from your Space.">
        <div className="grid gap-2 sm:grid-cols-2">
          {SPACE_FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl bg-muted/50"
            >
              <span className="text-sm font-bold">{SPACE_FEATURE_LABELS[feature]}</span>
              <Switch
                checked={!!draft.features[feature]}
                onChange={(next: boolean) => toggleFeature(feature, next)}
                label={SPACE_FEATURE_LABELS[feature]}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tabs" hint="Home and About always stay. Everything else is up to you.">
        <div className="flex flex-wrap gap-2">
          {SPACE_TABS.map((tab) => {
            const locked = ALWAYS_ON_TABS.includes(tab);
            const available = tabAvailable(tab);
            const active = locked || draft.tabs.includes(tab);
            return (
              <button
                key={tab}
                type="button"
                disabled={locked || !available}
                onClick={() => toggleTab(tab, !active)}
                title={available ? undefined : `Turn on ${SPACE_TAB_LABELS[tab]} in Features first`}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-colors ${
                  active
                    ? 'text-primary-foreground border-transparent'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                } ${locked ? 'opacity-70 cursor-default' : ''} ${!available ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={active ? { background: accent } : undefined}
              >
                {SPACE_TAB_LABELS[tab]}
                {locked && ' ·'}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Call-to-action button" hint="The main button visitors see next to Follow.">
        <div className="grid gap-2 sm:grid-cols-3">
          {SPACE_CTA_TYPES.map((cta) => {
            const active = draft.ctaType === cta.id;
            return (
              <button
                key={cta.id}
                type="button"
                onClick={() => onChange({ ctaType: cta.id as SpaceCtaType, ctaLabel: '' })}
                aria-pressed={active}
                className={`px-3 py-2 rounded-2xl text-sm font-extrabold border transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                {cta.label}
              </button>
            );
          })}
        </div>

        {draft.ctaType !== 'NONE' && (
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cta-label" className="block text-xs font-extrabold mb-1.5">
                Button text
              </label>
              <input
                id="cta-label"
                value={draft.ctaLabel}
                maxLength={30}
                placeholder={ctaDef.defaultLabel}
                onChange={(e) => onChange({ ctaLabel: e.target.value })}
                className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-sm font-bold outline-none focus:border-primary transition-colors"
              />
            </div>
            {ctaDef.needsUrl && (
              <div>
                <label htmlFor="cta-url" className="block text-xs font-extrabold mb-1.5">
                  Button link
                </label>
                <input
                  id="cta-url"
                  value={draft.ctaUrl}
                  maxLength={SPACE_LIMITS.linkUrl.max}
                  placeholder="https://"
                  onChange={(e) => onChange({ ctaUrl: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-sm font-bold outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Links" hint={`Website and social profiles. Up to ${MAX_SPACE_LINKS}.`}>
        <div className="space-y-2">
          {draft.links.map((link, index) => {
            const Icon = spaceLinkIcon(link.platform);
            return (
              <div key={index} className="flex items-center gap-2">
                <GripVertical size={14} className="shrink-0 text-muted-foreground/60" />
                <span className="shrink-0 grid place-items-center w-9 h-9 rounded-xl bg-muted">
                  <Icon size={15} />
                </span>
                <select
                  value={link.platform}
                  onChange={(e) => setLink(index, { platform: e.target.value as SpaceLinkPlatform })}
                  className="shrink-0 w-28 px-2 py-2 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:border-primary"
                >
                  {SPACE_LINK_PLATFORMS.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.label}
                    </option>
                  ))}
                </select>
                <input
                  value={link.url}
                  placeholder="https://"
                  maxLength={SPACE_LIMITS.linkUrl.max}
                  onChange={(e) => setLink(index, { url: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-card border border-border text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => onChange({ links: draft.links.filter((_, i) => i !== index) })}
                  aria-label="Remove link"
                  className="shrink-0 p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>

        {draft.links.length < MAX_SPACE_LINKS && (
          <button
            type="button"
            onClick={() => onChange({ links: [...draft.links, { platform: 'website', label: '', url: '' }] })}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Plus size={14} /> Add link
          </button>
        )}
      </Section>

      <Section title="Business hours" hint="Optional. Shown in your About section when set.">
        {!hours ? (
          <button
            type="button"
            onClick={() => onChange({ businessHours: defaultBusinessHours() })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Plus size={14} /> Add opening hours
          </button>
        ) : (
          <div className="space-y-2">
            {WEEK_DAYS.map((day) => {
              const entry = hours[day.id];
              return (
                <div key={day.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-20 text-sm font-bold shrink-0">{day.short}</span>
                  <Switch
                    checked={!entry.closed}
                    onChange={(next: boolean) =>
                      onChange({ businessHours: { ...hours, [day.id]: { ...entry, closed: !next } } })
                    }
                    label={`${day.label} open`}
                    size="sm"
                  />
                  {entry.closed ? (
                    <span className="text-xs font-bold text-muted-foreground">Closed</span>
                  ) : (
                    <>
                      <input
                        type="time"
                        value={entry.open}
                        onChange={(e) =>
                          onChange({ businessHours: { ...hours, [day.id]: { ...entry, open: e.target.value } } })
                        }
                        className="px-2 py-1.5 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="time"
                        value={entry.close}
                        onChange={(e) =>
                          onChange({ businessHours: { ...hours, [day.id]: { ...entry, close: e.target.value } } })
                        }
                        className="px-2 py-1.5 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:border-primary"
                      />
                    </>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => onChange({ businessHours: null })}
              className="text-xs font-extrabold text-muted-foreground hover:text-red-500 transition-colors"
            >
              Remove hours
            </button>
          </div>
        )}
      </Section>

      <Section title="Who can see this Space" hint="You can change this at any time.">
        <div className="grid gap-2 sm:grid-cols-3">
          {SPACE_VISIBILITIES.map((visibility) => {
            const active = draft.visibility === visibility;
            return (
              <button
                key={visibility}
                type="button"
                onClick={() => onChange({ visibility: visibility as SpaceVisibility })}
                aria-pressed={active}
                className={`px-3 py-2.5 rounded-2xl text-sm font-extrabold border transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                {SPACE_VISIBILITY_LABELS[visibility]}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl bg-muted/50">
          <span className="min-w-0">
            <span className="block text-sm font-bold">Show in Explore</span>
            <span className="block text-xs text-muted-foreground">
              Lets people find this Space through discovery and search.
            </span>
          </span>
          <Switch
            checked={draft.discoverable}
            onChange={(next: boolean) => onChange({ discoverable: next })}
            label="Show in Explore"
          />
        </div>

        {draft.visibility !== 'public' && draft.discoverable && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info size={13} className="mt-0.5 shrink-0" />
            Non-public Spaces never appear in Explore, whatever this is set to.
          </p>
        )}
      </Section>
    </div>
  );
}
