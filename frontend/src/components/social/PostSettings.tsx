import React, { useState, useEffect } from 'react';
import {
  MapPin, MessageSquare, Calendar, ArrowLeft, Loader2, Send, X, ChevronDown, ChevronRight, Settings2, PlusCircle, Users
} from 'lucide-react';
import { useStore } from '../../store';
import { CreatorPublishSettings, DEFAULT_PUBLISH_SETTINGS, wallClockToIso } from '../../lib/creatorPublish';
import type { VisibilityFlags } from '../../lib/postVisibility';
import { useEnBn } from '../../lib/useEnBn';
import { fetchPostDefaults } from '../../lib/postDefaults';
import { useValueChanged } from '../../hooks/useValueChanged';

const CONTENT_CATEGORIES = ['gaming', 'movies-tv', 'music', 'education', 'technology', 'ai-innovation', 'sports', 'news-politics', 'comedy', 'entertainment', 'lifestyle', 'travel', 'food-cooking', 'fashion-beauty', 'science', 'business-finance', 'art-design', 'photography', 'animation', 'podcasts', 'pets-animals', 'health-fitness', 'kids-family', 'automotive', 'diy-crafts', 'nature-wildlife'];
const DISCLOSURE_TYPES = ['none', 'ai_generated', 'ai_assisted', 'sponsored', 'paid_partnership', 'brand_collaboration'];
const PROFILE_FLAGS = [
  { key: 'pinToProfile', en: 'Pin to profile', bn: 'প্রোফাইলে পিন করুন' },
  { key: 'featuredContent', en: 'Featured content', bn: 'ফিচার্ড কনটেন্ট' },
];

export interface PostDraftSaveSettings {
  location?: string;
  hashtags: string[];
  isCommentEnabled: boolean;
  scheduledAt?: string | null;
}

interface PostSettingsProps {
  onBackStep: () => void;
  onSubmitPost: (settings: {
    location?: string;
    isCommentEnabled: boolean;
    scheduledAt?: string | null;
    hashtags: string[];
    privacy: string;
    visibilityFlags?: VisibilityFlags;
    customUserIds?: string[];
    publishSettings?: CreatorPublishSettings;
  }) => Promise<void>;
  submitting: boolean;
  visibilityFlags?: VisibilityFlags;
  customUserIds?: string[];
  privacy?: string;
  /** Explicit (never automatic) server-side draft save. */
  onSaveDraft?: (settings: PostDraftSaveSettings) => Promise<void>;
  savingDraft?: boolean;
  /** Values restored from an opened saved draft. */
  initialCommentsEnabled?: boolean;
  initialScheduledAt?: string | null;
  initialLocation?: string;
}

export const PostSettings: React.FC<PostSettingsProps> = ({
  onBackStep,
  onSubmitPost,
  submitting,
  visibilityFlags,
  customUserIds,
  privacy: privacyProp,
  onSaveDraft,
  savingDraft = false,
  initialCommentsEnabled,
  initialScheduledAt,
  initialLocation,
}) => {
  const token = useStore((s) => s.token);
  const { t } = useEnBn();
  const [showLocation, setShowLocation] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);

  const [privacy, setPrivacy] = useState<string>(privacyProp || 'private');
  const initialSchedule = (() => {
    if (!initialScheduledAt) return null;
    const d = new Date(initialScheduledAt);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
  })();
  const [location, setLocation] = useState<string>(initialLocation || '');
  const [isCommentEnabled, setIsCommentEnabled] = useState<boolean>(initialCommentsEnabled ?? true);
  const [showSchedule, setShowSchedule] = useState<boolean>(!!initialSchedule);
  const [scheduledDate, setScheduledDate] = useState<string>(initialSchedule?.date || '');
  const [scheduledTime, setScheduledTime] = useState<string>(initialSchedule?.time || '');
  const [publishSettings, setPublishSettings] = useState<CreatorPublishSettings>(DEFAULT_PUBLISH_SETTINGS);
  const [showMoreSettings, setShowMoreSettings] = useState(false);

  const privacyPropChanged = useValueChanged(privacyProp);
  if (privacyPropChanged && privacyProp) setPrivacy(privacyProp);

  // Settings > Posts & Content > Post defaults become this post's starting values.
  useEffect(() => {
    let live = true;
    void fetchPostDefaults(token).then((d) => {
      if (!live) return;
      setPublishSettings((s) => ({ ...s, allowDownloads: d.allowDownloads, allowRemix: d.allowRemix, allowDuets: d.allowRemix, isSensitiveContent: d.sensitiveWarning }));
    });
    return () => { live = false; };
  }, [token]);

  useEffect(() => {
    fetch('/api/settings/connected-accounts', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.accounts) ? data.accounts : [];
        setConnectedCount(list.length);
      })
      .catch(err => console.error('Failed to fetch connected accounts', err));
  }, [token]);

  // Compute effective privacy from flags (same logic as composer)
  let effectivePrivacy = privacyProp || privacy;
  if (visibilityFlags && 'public' in visibilityFlags) {
    if (visibilityFlags.public) effectivePrivacy = 'public';
    else if (visibilityFlags.followers) effectivePrivacy = 'followers';
    else if (visibilityFlags.custom) effectivePrivacy = 'custom';
    else if (visibilityFlags.friends) effectivePrivacy = 'friends';
  }

  // Schedule handling
  const handleScheduleModeChange = (mode: 'now' | 'schedule') => {
    setShowSchedule(mode === 'schedule');
    if (mode === 'now') { setScheduledDate(''); setScheduledTime(''); }
  };

  const isScheduleValid = (): boolean => {
    if (!scheduledDate || !scheduledTime) return false;
    return new Date(`${scheduledDate}T${scheduledTime}`) >= new Date();
  };

  const scheduleToIso = (): string | null => {
    if (!scheduledDate || !scheduledTime) return null;
    return wallClockToIso(scheduledDate, scheduledTime);
  };

  const handleFinalSubmit = async () => {
    const iso = scheduleToIso();
    let finalSchedule: string | null = null;
    if (showSchedule && iso && isScheduleValid()) finalSchedule = iso;

    const payload = {
      ...publishSettings,
      location: publishSettings.location || location,
      enableComments: isCommentEnabled,
      hashtags: publishSettings.hashtags || '',
      scheduledPublishAt: finalSchedule || publishSettings.scheduledPublishAt,
      visibilityType: effectivePrivacy as CreatorPublishSettings['visibilityType'],
    };

    await onSubmitPost({
      location: publishSettings.location || location,
      isCommentEnabled,
      scheduledAt: finalSchedule || null,
      hashtags: [],
      privacy: privacyProp || privacy,
      visibilityFlags,
      customUserIds,
      publishSettings: payload,
    });
  };

  // A scheduled time from publish settings → mirror it into the schedule fields (adjusted during render).
  const scheduledAtChanged = useValueChanged(publishSettings.scheduledPublishAt);
  if (scheduledAtChanged && publishSettings.scheduledPublishAt) {
    const iso = publishSettings.scheduledPublishAt;
    if (iso && iso.length >= 16) {
      setScheduledDate(iso.slice(0, 10));
      setScheduledTime(iso.slice(11, 16));
      setShowSchedule(true);
    }
  }

  const timeZone = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
  })();

  const audienceLabel = (() => {
    switch (effectivePrivacy) {
      case 'public': return t('Public', 'পাবলিক');
      case 'friends': return t('Friends', 'বন্ধুরা');
      case 'followers': return t('Followers', 'ফলোয়ার');
      case 'custom': return t('Custom', 'কাস্টম');
      default: return t('Only me', 'শুধু আমি');
    }
  })();

  const scheduleInvalid = showSchedule && (scheduledDate !== '' || scheduledTime !== '') && !isScheduleValid();
  const cardCls = 'rounded-2xl border border-border bg-card p-4';
  const rowBtnCls = 'flex w-full items-center gap-3 text-left';

  const handleSaveDraftClick = async () => {
    if (!onSaveDraft || savingDraft) return;
    const iso = showSchedule && isScheduleValid() ? scheduleToIso() : null;
    await onSaveDraft({ location: publishSettings.location || location, hashtags: [], isCommentEnabled, scheduledAt: iso });
  };

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-background text-[13px] text-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 pb-2 pt-2.5">
        <button type="button" onClick={onBackStep} className="flex items-center gap-1 rounded-lg p-1 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
          <ArrowLeft size={15} /><span>{t('Back', 'ফিরে যান')}</span>
        </button>
        <h4 className="text-[13px] font-bold">{t('Schedule & more', 'শিডিউল ও আরও')}</h4>
        <div className="w-12" />
      </div>

      <div className="composer-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {/* Publishing */}
        <div className={cardCls} data-testid="post-settings-publishing">
          <p className="mb-3 text-[14px] font-bold">{t('Publishing', 'পাবলিশিং')}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => handleScheduleModeChange('now')}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition-all ${!showSchedule ? 'border-purple-500 bg-purple-500/10 text-foreground' : 'border-border bg-muted/50 text-foreground/80 hover:text-foreground'}`}>
              <Send size={15} className={!showSchedule ? 'text-purple-600 dark:text-purple-400' : ''} />{t('Publish now', 'এখনই পাবলিশ')}
            </button>
            <button type="button" onClick={() => handleScheduleModeChange('schedule')}
              className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition-all ${showSchedule ? 'border-purple-500 bg-purple-500/10 text-foreground' : 'border-border bg-muted/50 text-foreground/80 hover:text-foreground'}`}>
              <Calendar size={15} className={showSchedule ? 'text-purple-600 dark:text-purple-400' : ''} />{t('Schedule', 'শিডিউল')}
            </button>
          </div>
          {showSchedule ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-2 py-2 text-xs text-foreground outline-none focus:border-purple-500/60" />
              <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-lg border border-border bg-muted px-2 py-2 text-xs text-foreground outline-none focus:border-purple-500/60" />
              {scheduleInvalid ? <p className="col-span-2 text-[11px] text-rose-600 dark:text-rose-400">{t('Pick a future date and time', 'ভবিষ্যতের তারিখ ও সময় দিন')}</p> : null}
            </div>
          ) : null}
          <p className="mt-3 text-[12px] text-muted-foreground">{t('Timezone', 'টাইমজোন')} · {timeZone}</p>
        </div>

        {/* Publish destinations */}
        <div className={cardCls} data-testid="post-settings-destinations">
          <p className="text-[14px] font-bold">{t('Publish destinations', 'পাবলিশ ডেস্টিনেশন')}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">{t('Choose connected accounts for cross-posting.', 'ক্রস-পোস্টিংয়ের জন্য কানেক্টেড অ্যাকাউন্ট বেছে নিন।')}</p>
          {connectedCount > 0 ? <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{t(`${connectedCount} connected`, `${connectedCount}টি কানেক্টেড`)}</p> : null}
          <button type="button" onClick={() => window.open('/settings', '_blank', 'noopener')} className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300">
            <PlusCircle size={16} />{t('Connect account', 'অ্যাকাউন্ট কানেক্ট করুন')}
          </button>
        </div>

        {/* Location */}
        <div className={cardCls} data-testid="post-settings-location">
          <button type="button" onClick={() => setShowLocation((v) => !v)} className={rowBtnCls}>
            <MapPin size={18} className="shrink-0 text-rose-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{t('Location', 'লোকেশন')}</p>
              <p className="truncate text-[12px] text-muted-foreground">{location.trim() || t('Add a place or venue', 'একটি জায়গা বা ভেন্যু যোগ করুন')}</p>
            </div>
            <span className="shrink-0 text-[12px] text-muted-foreground">{t('Optional', 'ঐচ্ছিক')}</span>
          </button>
          {showLocation ? (
            <div className="relative mt-3">
              <input type="text" value={location} autoFocus autoComplete="off" onChange={(e) => { const v = e.target.value; setLocation(v); setPublishSettings((s) => ({ ...s, location: v })); }}
                placeholder={t('City, place, or venue', 'শহর, জায়গা বা ভেন্যু')} className="w-full rounded-lg border border-border bg-muted py-2 pl-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-rose-500/60" />
              {location.trim() ? (
                <button type="button" onClick={() => { setLocation(''); setPublishSettings((s) => ({ ...s, location: '' })); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground" title={t('Clear location', 'লোকেশন মুছুন')}>
                  <X size={13} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Comments + Audience */}
        <div className="divide-y divide-border rounded-2xl border border-border bg-card px-4">
          <div className="flex items-center gap-3 py-3.5">
            <MessageSquare size={18} className="shrink-0 text-foreground/80" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{t('Comments', 'কমেন্ট')}</p>
              <p className="text-[12px] text-muted-foreground">{t('Allow replies to this post', 'এই পোস্টে রিপ্লাই করতে দিন')}</p>
            </div>
            <button type="button" role="switch" aria-checked={isCommentEnabled} data-testid="post-settings-comments-toggle"
              onClick={() => setIsCommentEnabled((prev) => { const next = !prev; setPublishSettings((s) => ({ ...s, enableComments: next })); return next; })}
              className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${isCommentEnabled ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {isCommentEnabled ? t('On', 'চালু') : t('Off', 'বন্ধ')}
            </button>
          </div>
          <button type="button" onClick={onBackStep} className={`${rowBtnCls} py-3.5`} data-testid="post-settings-audience">
            <Users size={18} className="shrink-0 text-foreground/80" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{t('Audience', 'অডিয়েন্স')}</p>
              <p className="text-[12px] text-muted-foreground">{t('Choose who can see this post', 'কে এই পোস্ট দেখতে পারবে বেছে নিন')} · <span className="text-foreground/80">{audienceLabel}</span></p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>
        </div>

        {/* Advanced settings */}
        <div className={cardCls} data-testid="post-settings-advanced">
          <button type="button" onClick={() => setShowMoreSettings((v) => !v)} className={rowBtnCls}>
            <Settings2 size={18} className="shrink-0 text-foreground/80" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{t('Advanced settings', 'অ্যাডভান্সড সেটিংস')}</p>
              <p className="text-[12px] text-muted-foreground">{t('Accessibility and additional options', 'অ্যাক্সেসিবিলিটি ও অতিরিক্ত অপশন')}</p>
            </div>
            <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${showMoreSettings ? 'rotate-180' : ''}`} />
          </button>
          {showMoreSettings ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{t('Content category', 'কনটেন্ট ক্যাটাগরি')}</label>
                <select aria-label={t('Content category', 'কনটেন্ট ক্যাটাগরি')} value={publishSettings.contentCategory || ''} onChange={(e) => setPublishSettings((s) => ({ ...s, contentCategory: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:border-purple-500/60">
                  <option value="">{t('Select content category', 'ক্যাটাগরি বেছে নিন')}</option>
                  {CONTENT_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">{t('Disclosure', 'প্রকাশ')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {DISCLOSURE_TYPES.map((d) => (
                    <button key={d} type="button" onClick={() => setPublishSettings((s) => ({ ...s, contentDisclosureType: d as CreatorPublishSettings['contentDisclosureType'] }))}
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold capitalize transition-all ${publishSettings.contentDisclosureType === d ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300' : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
                      {d.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {PROFILE_FLAGS.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-2 text-[12px] text-foreground/80">
                    <input type="checkbox" checked={!!(publishSettings as any)[f.key]} onChange={(e) => setPublishSettings((s) => ({ ...s, [f.key]: e.target.checked }))} className="h-4 w-4 rounded" />
                    {t(f.en, f.bn)}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 border-t border-border bg-background px-3 py-3">
        <button type="button" onClick={() => void handleSaveDraftClick()} disabled={!onSaveDraft || savingDraft || submitting} data-testid="post-settings-save-draft"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-3 text-[13px] font-semibold text-foreground/80 transition-all hover:bg-muted disabled:opacity-50">
          {savingDraft ? <Loader2 size={14} className="animate-spin" /> : null}{t('Save Draft', 'ড্রাফট সেভ করুন')}
        </button>
        <button type="button" onClick={() => void handleFinalSubmit()} disabled={submitting || scheduleInvalid} data-testid="post-settings-publish"
          className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-[13px] font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500 disabled:opacity-50">
          {submitting
            ? <><Loader2 size={15} className="animate-spin" />{t('Publishing…', 'পাবলিশ হচ্ছে…')}</>
            : showSchedule && isScheduleValid()
              ? <><Calendar size={15} />{t('Schedule Post', 'পোস্ট শিডিউল করুন')}</>
              : <><Send size={15} />{t('Publish Post', 'পোস্ট পাবলিশ করুন')}</>}
        </button>
      </div>
    </div>
  );
};