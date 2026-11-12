/**
 * Batch Upload audience.
 * The top Audience tab sets the batch default (every post that still follows it).
 * Each post's Audience button uses the same platform tabs for one post.
 *
 * WevSoft uses the feed targeting editor. Facebook sends age / gender / country.
 * YouTube sends visibility and the made-for-kids flag. LinkedIn sends Public or Connections.
 * Instagram, X and TikTok have no audience gate on the APIs this app publishes with.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crosshair, X } from 'lucide-react';
import { TargetingFields } from '../targeting/TargetingButton';
import { Brand } from './SocialDestinations';
import { YT_PRIVACY, type YouTubeOpts, type YtPrivacy } from './YouTubeSettings';
import { AGE_MAX, AGE_MIN, COUNTRIES, countryName, NO_TARGETING, targetingPayload, targetingSummary, type TargetingValue } from '../../lib/postTargeting';
import { cleanFacebook, facebookSummary, type FacebookAudience, type LinkedInAudience, type LinkedInVisibility } from '../../lib/platformAudience';

export const AUDIENCE_TABS = [
  { id: 'wevsoft', label: 'WevSoft' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'tiktok', label: 'TikTok' },
] as const;
export type AudienceTabId = (typeof AUDIENCE_TABS)[number]['id'];

const sel = 'h-8 rounded-[9px] border border-[#dfe5ee] bg-white px-2 text-[12px] text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100';
const lbl = 'mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300';
const chip = 'inline-flex h-6 items-center gap-1 rounded-full bg-[#eef3ff] px-2 text-[11px] font-medium text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200';
const choice = (on: boolean) => `h-8 flex-1 rounded-[8px] text-[11.5px] font-semibold ${on ? 'bg-[#dfeaff] text-[#1d4ed8] dark:bg-blue-500/15 dark:text-blue-200' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'}`;

export function audienceButtonText(tg: TargetingValue, fb: FacebookAudience | null, ytPrivacy: YtPrivacy, ytKids: boolean, li: LinkedInVisibility): string {
  return targetingSummary(tg) || (facebookSummary(fb) ? `FB ${facebookSummary(fb)}` : '') || (ytKids ? 'YT Kids' : ytPrivacy !== 'public' ? `YT ${ytPrivacy}` : '') || (li === 'CONNECTIONS' ? 'LI Connections' : '');
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] bg-slate-50 px-2.5 py-2 text-[11.5px] leading-snug text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">{children}</p>;
}

function FacebookFields({ value, onChange, disabled }: { value: FacebookAudience | null; onChange: (v: FacebookAudience | null) => void; disabled?: boolean }) {
  const t = value ?? {};
  const set = (patch: Partial<FacebookAudience>) => onChange(cleanFacebook({ ...t, ...patch }));
  const countries = t.countries ?? [];
  const [cq, setCq] = useState('');
  const matches = useMemo(() => {
    const q = cq.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => !countries.includes(c.code) && (c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q)).slice(0, 6) : [];
  }, [cq, countries]);
  const gender = t.genders?.length === 1 ? t.genders[0] : 0;
  const ages = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);
  return (
    <div>
      <Note>Sent with the Facebook Page post. Facebook accepts age, gender and country. City and language apply on WevSoft only.</Note>
      <span className={`${lbl} mt-2.5`}>Age</span>
      <div className="mb-2.5 flex items-center gap-2">
        <select aria-label="Facebook minimum age" disabled={disabled} value={t.age_min ?? AGE_MIN} onChange={(e) => { const v = Number(e.target.value); set({ age_min: v, age_max: t.age_max && t.age_max < v ? v : t.age_max }); }} className={`${sel} flex-1`}>{ages.slice(0, -1).map((a) => <option key={a} value={a}>{a}</option>)}</select>
        <span className="text-slate-400">–</span>
        <select aria-label="Facebook maximum age" disabled={disabled} value={t.age_max ?? AGE_MAX} onChange={(e) => { const v = Number(e.target.value); set({ age_max: v, age_min: t.age_min && t.age_min > v ? v : t.age_min }); }} className={`${sel} flex-1`}>{ages.slice(1).map((a) => <option key={a} value={a}>{a === AGE_MAX ? '65+' : a}</option>)}</select>
      </div>
      <span className={lbl}>Countries</span>
      <div className="relative mb-1.5">
        <input value={cq} disabled={disabled} onChange={(e) => setCq(e.target.value)} placeholder="Add a country…" className={`${sel} w-full`} />
        {matches.length > 0 && (
          <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#1b1f2b]">
            {matches.map((c) => <button key={c.code} type="button" onClick={() => { set({ countries: [...countries, c.code] }); setCq(''); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"><span className="w-6 text-[10.5px] font-bold text-slate-400">{c.code}</span>{c.name}</button>)}
          </div>
        )}
      </div>
      <div className="mb-2.5 flex flex-wrap gap-1">
        {countries.map((c) => <span key={c} className={chip} title={countryName(c)}>{countryName(c)}{!disabled && <button type="button" aria-label={`Remove ${c}`} onClick={() => set({ countries: countries.filter((x) => x !== c) })}><X className="h-3 w-3" /></button>}</span>)}
        {!countries.length && <span className="text-[10.5px] text-slate-400">All countries</span>}
      </div>
      <span className={lbl}>Gender</span>
      <div className="mb-2 flex overflow-hidden rounded-[9px] border border-[#dfe5ee] dark:border-white/10">
        {[[0, 'All'], [1, 'Men'], [2, 'Women']].map(([g, l]) => <button key={String(g)} type="button" disabled={disabled} onClick={() => set({ genders: g ? [g as number] : [] })} className={choice(gender === g)}>{l}</button>)}
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange(null)} className="h-7 rounded-lg px-2 text-[11.5px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/5">Clear</button>
    </div>
  );
}

function YouTubeFields({ privacy, madeForKids, onChange, disabled }: { privacy: YtPrivacy; madeForKids: boolean; onChange: (privacy: YtPrivacy, madeForKids: boolean) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2.5">
      <Note>Saved with the YouTube upload. Title, tags and playlist stay in YouTube settings.</Note>
      <div>
        <span className={lbl}>Who can watch</span>
        <div className="flex gap-1.5">{YT_PRIVACY.map((p) => <button key={p.id} type="button" disabled={disabled} title={p.hint} onClick={() => onChange(p.id, madeForKids)} className={choice(privacy === p.id)}>{p.label}</button>)}</div>
      </div>
      <div>
        <span className={lbl}>Audience (required by YouTube)</span>
        <div className="flex gap-1.5">
          <button type="button" disabled={disabled} onClick={() => onChange(privacy, false)} className={choice(!madeForKids)}>Not made for kids</button>
          <button type="button" disabled={disabled} onClick={() => onChange(privacy, true)} className={choice(madeForKids)}>Made for kids</button>
        </div>
      </div>
    </div>
  );
}

function LinkedInFields({ value, onChange, disabled }: { value: LinkedInVisibility; onChange: (v: LinkedInVisibility) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2.5">
      <Note>Used when the LinkedIn post is text. Photo and video posts to LinkedIn are not available yet.</Note>
      <div className="flex gap-1.5">
        <button type="button" disabled={disabled} onClick={() => onChange('PUBLIC')} className={choice(value === 'PUBLIC')}>Anyone</button>
        <button type="button" disabled={disabled} onClick={() => onChange('CONNECTIONS')} className={choice(value === 'CONNECTIONS')}>Connections</button>
      </div>
    </div>
  );
}

export interface AudienceValue {
  tg: TargetingValue;
  fb: FacebookAudience | null;
  ytPrivacy: YtPrivacy;
  ytKids: boolean;
  li: LinkedInVisibility;
}

export function PlatformAudienceEditor({ value, onTg, onFb, onYouTube, onLinkedIn, active, disabled }: {
  value: AudienceValue;
  onTg: (v: TargetingValue) => void;
  onFb: (v: FacebookAudience | null) => void;
  onYouTube: (privacy: YtPrivacy, madeForKids: boolean) => void;
  onLinkedIn: (v: LinkedInVisibility) => void;
  active?: ReadonlySet<string>;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<AudienceTabId>('wevsoft');
  return (
    <div>
      <div role="tablist" aria-label="Platform audience" className="mb-2.5 flex flex-wrap gap-1">
        {AUDIENCE_TABS.map((p) => {
          const on = tab === p.id;
          const used = active?.has(p.id);
          return (
            <button key={p.id} type="button" role="tab" aria-selected={on} onClick={() => setTab(p.id)}
              className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold ${on ? 'bg-[#dfeaff] text-[#1d4ed8] ring-1 ring-inset ring-[#9dbcf5] dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40' : 'bg-white text-slate-600 ring-1 ring-inset ring-[#dfe5ee] hover:bg-slate-50 dark:bg-transparent dark:text-slate-300 dark:ring-white/10'}`}>
              {p.id === 'wevsoft' ? <Crosshair className="h-3.5 w-3.5" /> : <Brand id={p.id} size={14} />}
              {p.label}
              {used && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Selected as a destination" />}
            </button>
          );
        })}
      </div>
      {tab === 'wevsoft' && <TargetingFields value={value.tg} onChange={onTg} />}
      {tab === 'facebook' && <FacebookFields value={value.fb} onChange={onFb} disabled={disabled} />}
      {tab === 'youtube' && <YouTubeFields privacy={value.ytPrivacy} madeForKids={value.ytKids} onChange={onYouTube} disabled={disabled} />}
      {tab === 'linkedin' && <LinkedInFields value={value.li} onChange={onLinkedIn} disabled={disabled} />}
      {tab === 'instagram' && <Note>Instagram business posts are public. Organic posts cannot be limited by age, gender or country.</Note>}
      {tab === 'x' && <Note>X posts are public to everyone who can see the account. The posting API has no audience gate.</Note>}
      {tab === 'tiktok' && <Note>TikTok publishing is not available yet, so an audience is not sent.</Note>}
      {disabled && <p className="mt-2 text-[10.5px] text-slate-400">This post can no longer be edited.</p>}
    </div>
  );
}

const popBtn = 'flex w-full min-w-0 items-center gap-1 rounded-[7px] border px-1.5 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-60 h-[26px]';

/** One post's audience. Same platform tabs as the batch Audience tab. */
export function PostAudienceButton({ disabled, tg, onTg, fb, onFb, li, onLi, yt, onYouTube, bulk, active, onReset }: {
  disabled?: boolean;
  tg: TargetingValue;
  onTg: (v: TargetingValue) => void;
  fb: FacebookAudience | null | undefined;
  onFb: (v: FacebookAudience | null) => void;
  li: LinkedInAudience | null | undefined;
  onLi: (v: LinkedInVisibility) => void;
  yt: YouTubeOpts | null;
  onYouTube: (privacy: YtPrivacy, madeForKids: boolean) => void;
  bulk: AudienceValue;
  active?: ReadonlySet<string>;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const effFb = fb === undefined ? bulk.fb : fb;
  const effLi: LinkedInVisibility = (li === undefined ? bulk.li : li?.visibility) === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC';
  const ytPrivacy: YtPrivacy = yt?.privacy || bulk.ytPrivacy;
  const ytKids = yt?.madeForKids !== undefined ? !!yt.madeForKids : bulk.ytKids;
  const label = audienceButtonText(tg, effFb, ytPrivacy, ytKids, effLi);
  const custom = JSON.stringify(targetingPayload(tg)) !== JSON.stringify(targetingPayload(bulk.tg)) || fb !== undefined || li !== undefined || yt?.privacy !== undefined || yt?.madeForKids !== undefined;
  const value: AudienceValue = { tg, fb: effFb, ytPrivacy, ytKids, li: effLi };
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        title={label ? `Audience: ${label}${custom ? ' (custom for this post)' : ''}` : 'Audience'}
        className={`${popBtn} ${label ? 'border-[#9dbcf5] bg-[#f4f8ff] text-[#1d4ed8] dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200' : 'border-[#dfe5ee] bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'}`}>
        <Crosshair className="h-3 w-3 shrink-0" />
        <span className="truncate">{label || 'Public'}</span>
        {custom && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Custom for this post" />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[min(70vh,540px)] w-[360px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-800 shadow-xl dark:border-white/10 dark:bg-[#151823] dark:text-slate-100">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-bold">
            Audience
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold text-slate-500 dark:bg-white/10">{custom ? 'This post' : 'Batch'}</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
          {custom && <button type="button" onClick={onReset} className="mb-2 text-[11px] font-semibold text-blue-600 hover:underline">Reset to batch audience</button>}
          <PlatformAudienceEditor value={value} onTg={onTg} onFb={onFb} onYouTube={onYouTube} onLinkedIn={onLi} active={active} disabled={disabled} />
          <div className="mt-2 flex justify-end border-t border-slate-100 pt-2 dark:border-white/[0.06]">
            <button type="button" onClick={() => setOpen(false)} className="h-7 rounded-lg bg-[#1d63ed] px-3 text-[11.5px] font-semibold text-white hover:bg-blue-700">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BatchAudiencePanel({ value, onTg, onFb, onYouTube, onLinkedIn, active, customCount, total, onApply }: {
  value: AudienceValue;
  onTg: (v: TargetingValue) => void;
  onFb: (v: FacebookAudience | null) => void;
  onYouTube: (privacy: YtPrivacy, madeForKids: boolean) => void;
  onLinkedIn: (v: LinkedInVisibility) => void;
  active?: ReadonlySet<string>;
  customCount: number;
  total: number;
  onApply: () => void;
}) {
  const bits = [targetingSummary(value.tg), facebookSummary(value.fb) && `Facebook ${facebookSummary(value.fb)}`, (value.ytKids || value.ytPrivacy !== 'public') && `YouTube ${value.ytKids ? 'Kids' : value.ytPrivacy}`, value.li === 'CONNECTIONS' && 'LinkedIn connections'].filter(Boolean);
  return (
    <div className="max-w-[720px]">
      <p className="mb-2 text-[11.5px] text-slate-500 dark:text-slate-400">
        Sets every post that still uses the batch audience. A green dot is a destination already selected. Posts you change one by one stay as they are until you apply to all.
        {bits.length > 0 && <span className="mt-1 block font-medium text-slate-700 dark:text-slate-200">{bits.join(' · ')}</span>}
      </p>
      <PlatformAudienceEditor value={value} onTg={onTg} onFb={onFb} onYouTube={onYouTube} onLinkedIn={onLinkedIn} active={active} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1f7] pt-2.5 dark:border-white/[0.06]">
        <span className="text-[11px] text-slate-500">{total === 0 ? 'New posts will use this audience.' : customCount > 0 ? `${customCount} of ${total} customized` : `${total} post${total === 1 ? '' : 's'} linked`}</span>
        <button type="button" onClick={onApply} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-blue-600 px-3 text-[11.5px] font-semibold text-white hover:bg-blue-700">
          <Check className="h-3.5 w-3.5" />Apply to all posts
        </button>
      </div>
    </div>
  );
}

export const EMPTY_AUDIENCE: AudienceValue = { tg: NO_TARGETING, fb: null, ytPrivacy: 'public', ytKids: false, li: 'PUBLIC' };
