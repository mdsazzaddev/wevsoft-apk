/**
 * The four-step WevSpace creation wizard: Type → Identity → Customize → Launch.
 *
 * Everything the user enters lives in one SpaceDraft that also feeds the live
 * preview, and the whole draft is POSTed once at the end. The type is a starting
 * point only — it seeds tabs/features/CTA and stays editable afterwards, which
 * is why step 3 can override every one of those choices (spec §3).
 */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PartyPopper,
  Pencil,
  QrCode,
  Rocket,
  Share2,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_LIMITS,
  applySpaceTypeDefaults,
  categoriesForType,
  emptySpaceDraft,
  isValidContactEmail,
  normalizeWebsiteUrl,
  spacePublicPath,
  spaceTypeDef,
  suggestSpaceHandle,
  SPACE_TYPES,
  type SpaceDraft,
  type SpacePublicPayload,
  type SpaceType,
} from '@wevsoft/shared/wevspace';
import { SpaceApiError, createSpace } from '../../lib/wevspaceApi';
import { useStore } from '../../store';
import { spaceIcon } from './spaceIcons';
import { draftToSpacePayload } from './draftPreview';
import { shareSpace } from './shareSpace';
import SpaceHandleField from './SpaceHandleField';
import SpaceImagePicker from './SpaceImagePicker';
import SpaceCustomizeForm from './SpaceCustomizeForm';
import SpaceLivePreview from './SpaceLivePreview';
import SpaceShareSheet from './SpaceShareSheet';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

const STEPS = [
  { id: 1, label: 'Type', labelBn: 'ধরন' },
  { id: 2, label: 'Identity', labelBn: 'পরিচয়' },
  { id: 3, label: 'Customize', labelBn: 'কাস্টমাইজ' },
  { id: 4, label: 'Launch', labelBn: 'চালু' },
] as const;

interface Props {
  /** Called after a successful create, before the success screen is shown. */
  onCreated?: (space: SpacePublicPayload) => void;
}

export default function CreateSpaceWizard({ onCreated }: Props) {
  const navigate = useNavigate();
  const { t } = useMarketplaceLang();
  const user = useStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<SpaceDraft>(() => {
    const base = emptySpaceDraft();
    // ?type= accepts a SpaceType id (any case) or the Create menu's
    // visibility presets: public / private (business maps to BUSINESS).
    const raw = (searchParams.get('type') || '').trim();
    const typeParam = raw.toUpperCase() as SpaceType;
    if (typeParam && SPACE_TYPES.some(t => t.id === typeParam)) {
      return applySpaceTypeDefaults(base, typeParam);
    }
    const preset = raw.toLowerCase();
    if (preset === 'public') return { ...base, visibility: 'public', discoverable: true };
    if (preset === 'private') return { ...base, visibility: 'private', discoverable: false };
    return base;
  });
  const [handleState, setHandleState] = useState({ checking: false, available: false, error: null as string | null });
  const [handleTouched, setHandleTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<SpacePublicPayload | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);

  const patch = useCallback((next: Partial<SpaceDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  const owner = user
    ? { id: user.id, name: user.name, username: user.username || null, avatar: user.avatar || null }
    : null;

  const previewSpace = useMemo(() => draftToSpacePayload(draft, owner), [draft, owner?.id, owner?.avatar]);
  const categories = categoriesForType(draft.spaceType);

  const chooseType = (type: SpaceType) => {
    setDraft((current) => applySpaceTypeDefaults(current, type));
  };

  const nameValid = draft.name.trim().length >= SPACE_LIMITS.name.min;
  const emailValid = !draft.contactEmail.trim() || isValidContactEmail(draft.contactEmail);
  const websiteValid = !draft.website.trim() || !!normalizeWebsiteUrl(draft.website);
  const identityReady = nameValid && handleState.available && emailValid && websiteValid;

  // Typing a name before touching the handle field pre-fills a suggestion; once
  // the user edits the handle themselves we never overwrite it again.
  const setName = (name: string) => {
    setDraft((current) => ({
      ...current,
      name,
      handle: handleTouched ? current.handle : suggestSpaceHandle(name),
    }));
  };

  const submit = async () => {
    if (!identityReady || submitting) return;
    setSubmitting(true);
    try {
      const space = await createSpace({
        ...draft,
        website: normalizeWebsiteUrl(draft.website) || '',
        links: draft.links.filter((link) => !!link.url.trim()),
      });
      setCreated(space);
      onCreated?.(space);
      toast.success(t('Your WevSpace is ready', 'আপনার WevSpace তৈরি'));
    } catch (err: any) {
      const message =
        err instanceof SpaceApiError ? err.message : err?.message || t('Could not create your WevSpace', 'WevSpace তৈরি করা যায়নি');
      toast.error(message);
      // A rejected handle is the only failure the user can fix in place, so send
      // them back to the field rather than leaving them stuck on the last step.
      if (/username|handle/i.test(message)) setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return <SuccessScreen space={created} onNavigate={navigate} />;
  }

  const canAdvance = step === 1 ? true : step === 2 ? identityReady : true;

  return (
    <div className="w-full">
      {/* Stepper */}
      <ol className="flex items-center gap-1 sm:gap-2 mb-5">
        {STEPS.map((s, index) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => s.id < step && setStep(s.id)}
                disabled={s.id > step}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'bg-muted text-muted-foreground cursor-default'
                }`}
              >
                <span className="grid place-items-center w-4 h-4 rounded-full bg-black/10 dark:bg-white/15 text-[10px]">
                  {done ? <Check size={10} /> : s.id}
                </span>
                <span className="hidden sm:inline">{t(s.label, s.labelBn)}</span>
              </button>
              {index < STEPS.length - 1 && <span className="w-3 sm:w-6 h-px bg-border shrink-0" />}
            </li>
          );
        })}
      </ol>

      <div className={step >= 3 ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}>
        <div className="min-w-0">
          {step === 1 && <StepType selected={draft.spaceType} onSelect={chooseType} />}

          {step === 2 && (
            <StepIdentity
              draft={draft}
              patch={patch}
              setName={setName}
              categories={categories}
              onHandleChange={(handle) => {
                setHandleTouched(true);
                patch({ handle });
              }}
              onHandleStatus={setHandleState}
              emailValid={emailValid}
              websiteValid={websiteValid}
            />
          )}

          {step === 3 && <SpaceCustomizeForm draft={draft} onChange={patch} showImages={false} />}

          {step === 4 && <StepLaunch draft={draft} />}
        </div>

        {step >= 3 && (
          <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <SpaceLivePreview space={previewSpace} />
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="sticky bottom-0 mt-5 -mx-4 px-4 py-3 bg-background/90 backdrop-blur border-t border-border sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ArrowLeft size={15} /> {t('Back', 'পেছনে')}
            </button>
          )}

          {/* Mobile preview escape hatch — the side-by-side preview only fits on
              large screens, so smaller screens get it on demand instead. */}
          {step >= 2 && (
            <button
              type="button"
              onClick={() => setMobilePreview(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {t('Preview', 'প্রিভিউ')}
            </button>
          )}

          <div className="flex-1" />

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {t('Continue', 'এগিয়ে যান')} <ArrowRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !identityReady}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {submitting ? t('Creating…', 'তৈরি হচ্ছে…') : t('Create WevSpace', 'WevSpace তৈরি করুন')}
            </button>
          )}
        </div>

        {step === 2 && !identityReady && (
          <p className="mt-2 text-xs text-muted-foreground">
            {!nameValid
              ? t(`Add a name (at least ${SPACE_LIMITS.name.min} characters).`, `একটি নাম দিন (কমপক্ষে ${SPACE_LIMITS.name.min} অক্ষর)।`)
              : handleState.checking
                ? t('Checking that username…', 'ইউজারনেম যাচাই হচ্ছে…')
                : !handleState.available
                  ? t('Pick an available username to continue.', 'এগোতে একটি খালি ইউজারনেম বেছে নিন।')
                  : !emailValid
                    ? t('That contact email looks invalid.', 'ইমেইলটি সঠিক মনে হচ্ছে না।')
                    : t('That website address looks invalid.', 'ওয়েবসাইট ঠিকানাটি সঠিক মনে হচ্ছে না।')}
          </p>
        )}
      </div>

      {/* Mobile preview sheet */}
      {mobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close preview"
            onClick={() => setMobilePreview(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-h-[88vh] overflow-y-auto rounded-t-3xl bg-background p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black">{t('Preview', 'প্রিভিউ')}</h2>
              <button
                type="button"
                onClick={() => setMobilePreview(false)}
                className="px-3 py-1.5 rounded-xl bg-muted text-xs font-extrabold"
              >
                Done
              </button>
            </div>
            <SpaceLivePreview space={previewSpace} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────

function StepType({ selected, onSelect }: { selected: SpaceType; onSelect: (type: SpaceType) => void }) {
  const { t } = useMarketplaceLang();
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-black">{t('What is this WevSpace for?', 'এই WevSpace কিসের জন্য?')}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        This sets up sensible tabs and features to start with. You can change any of it later — you are not
        locked in.
      </p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {SPACE_TYPES.map((type) => {
          const Icon = spaceIcon(type.icon);
          const active = selected === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type.id as SpaceType)}
              aria-pressed={active}
              className={`text-left p-4 rounded-3xl border-2 transition-all ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <span
                className={`grid place-items-center w-10 h-10 rounded-2xl ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="block mt-2.5 font-black text-sm">{type.label}</span>
              <span className="block mt-1 text-xs text-muted-foreground leading-relaxed">{type.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-extrabold mb-1.5">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-bold text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-sm outline-none focus:border-primary transition-colors';

function StepIdentity({
  draft,
  patch,
  setName,
  categories,
  onHandleChange,
  onHandleStatus,
  emailValid,
  websiteValid,
}: {
  draft: SpaceDraft;
  patch: (next: Partial<SpaceDraft>) => void;
  setName: (name: string) => void;
  categories: readonly string[];
  onHandleChange: (handle: string) => void;
  onHandleStatus: (state: { checking: boolean; available: boolean; error: string | null }) => void;
  emailValid: boolean;
  websiteValid: boolean;
}) {
  const typeDef = spaceTypeDef(draft.spaceType);
  const { t } = useMarketplaceLang();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">{t(`Name your ${typeDef.label} Space`, `আপনার ${typeDef.label} স্পেসের নাম দিন`)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('This is how people will find and recognise you across Wevsoft.', 'এভাবেই মানুষ Wevsoft-এ আপনাকে খুঁজে পাবে ও চিনবে।')}
        </p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
        <Field id="space-name" label={t('Name', 'নাম')} hint={`${draft.name.length}/${SPACE_LIMITS.name.max}`}>
          <input
            id="space-name"
            value={draft.name}
            maxLength={SPACE_LIMITS.name.max}
            autoFocus
            placeholder={typeDef.label === 'Business' ? 'e.g. Northside Coffee' : 'e.g. Amina Creates'}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <SpaceHandleField value={draft.handle} onChange={onHandleChange} onStatusChange={onHandleStatus} />

        <Field id="space-category" label={t('Category', 'ক্যাটাগরি')} hint={t('Helps people discover you in Explore.', 'Explore-এ মানুষকে আপনাকে খুঁজে পেতে সাহায্য করে।')}>
          <input
            id="space-category"
            list="space-category-options"
            value={draft.category}
            maxLength={SPACE_LIMITS.category.max}
            placeholder="Choose or type your own"
            onChange={(e) => patch({ category: e.target.value })}
            className={inputClass}
          />
          <datalist id="space-category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <Field id="space-tagline" label={t('Tagline', 'ট্যাগলাইন')} hint={`${t('Optional one-liner.', 'ঐচ্ছিক এক লাইন।')} ${draft.tagline.length}/${SPACE_LIMITS.tagline.max}`}>
          <input
            id="space-tagline"
            value={draft.tagline}
            maxLength={SPACE_LIMITS.tagline.max}
            placeholder="Short and memorable"
            onChange={(e) => patch({ tagline: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field id="space-bio" label={t('Short bio', 'সংক্ষিপ্ত পরিচিতি')} hint={`${draft.bio.length}/${SPACE_LIMITS.bio.max}`}>
          <textarea
            id="space-bio"
            value={draft.bio}
            maxLength={SPACE_LIMITS.bio.max}
            rows={2}
            placeholder="What is this Space about?"
            onChange={(e) => patch({ bio: e.target.value })}
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field id="space-description" label={t('Description', 'বিবরণ')} hint={`${t('Optional, longer.', 'ঐচ্ছিক, বিস্তারিত।')} ${draft.description.length}/${SPACE_LIMITS.description.max}`}>
          <textarea
            id="space-description"
            value={draft.description}
            maxLength={SPACE_LIMITS.description.max}
            rows={4}
            placeholder="Tell people the full story."
            onChange={(e) => patch({ description: e.target.value })}
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>

      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
        <h2 className="font-black text-sm">{t('Images', 'ছবি')}</h2>
        <SpaceImagePicker
          value={draft.avatar}
          onChange={(url) => patch({ avatar: url })}
          shape="avatar"
          label={t('Profile image', 'প্রোফাইল ছবি')}
          hint="Square works best — at least 400×400."
        />
        <SpaceImagePicker
          value={draft.cover}
          onChange={(url) => patch({ cover: url })}
          shape="cover"
          label={t('Cover image', 'কভার ছবি')}
          hint="Wide image, around 1600×600."
        />
      </div>

      <div className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
        <h2 className="font-black text-sm">{t('Contact & location', 'যোগাযোগ ও লোকেশন')}</h2>
        <p className="text-xs text-muted-foreground -mt-3">
          Email and phone stay hidden unless you switch them on below.
        </p>

        <Field
          id="space-website"
          label={t('Website', 'ওয়েবসাইট')}
          error={websiteValid ? null : 'Enter a valid address, like example.com'}
        >
          <input
            id="space-website"
            value={draft.website}
            maxLength={SPACE_LIMITS.website.max}
            placeholder="example.com"
            onChange={(e) => patch({ website: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field
          id="space-email"
          label={t('Contact email', 'যোগাযোগের ইমেইল')}
          error={emailValid ? null : 'That email address looks invalid'}
        >
          <input
            id="space-email"
            type="email"
            value={draft.contactEmail}
            maxLength={SPACE_LIMITS.contactEmail.max}
            placeholder="hello@example.com"
            onChange={(e) => patch({ contactEmail: e.target.value })}
            className={inputClass}
          />
          <label className="mt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={draft.showEmail}
              onChange={(e) => patch({ showEmail: e.target.checked })}
              className="accent-primary"
            />
            {t('Show this email publicly', 'ইমেইলটি সবার জন্য দেখান')}
          </label>
        </Field>

        <Field id="space-phone" label={t('Contact phone', 'যোগাযোগের ফোন')}>
          <input
            id="space-phone"
            value={draft.contactPhone}
            maxLength={SPACE_LIMITS.contactPhone.max}
            placeholder="+1 555 0100"
            onChange={(e) => patch({ contactPhone: e.target.value })}
            className={inputClass}
          />
          <label className="mt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={draft.showPhone}
              onChange={(e) => patch({ showPhone: e.target.checked })}
              className="accent-primary"
            />
            {t('Show this phone number publicly', 'ফোন নম্বরটি সবার জন্য দেখান')}
          </label>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="space-location" label={t('City / area', 'শহর / এলাকা')}>
            <input
              id="space-location"
              value={draft.location}
              maxLength={SPACE_LIMITS.location.max}
              placeholder="Nairobi"
              onChange={(e) => patch({ location: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field id="space-country" label={t('Country', 'দেশ')}>
            <input
              id="space-country"
              value={draft.country}
              maxLength={80}
              placeholder="Kenya"
              onChange={(e) => patch({ country: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field id="space-region" label={t('Region / state', 'অঞ্চল / বিভাগ')}>
            <input
              id="space-region"
              value={draft.region}
              maxLength={80}
              placeholder="Nairobi County"
              onChange={(e) => patch({ region: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field id="space-language" label={t('Main language', 'প্রধান ভাষা')}>
            <input
              id="space-language"
              value={draft.language}
              maxLength={12}
              placeholder="en"
              onChange={(e) => patch({ language: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────

function StepLaunch({ draft }: { draft: SpaceDraft }) {
  const typeDef = spaceTypeDef(draft.spaceType);
  const { t } = useMarketplaceLang();
  const rows: Array<[string, string]> = [
    ['Type', typeDef.label],
    ['Name', draft.name || '—'],
    ['Username', `@${draft.handle || '—'}`],
    ['Category', draft.category || 'Not set'],
    ['Tabs', String(draft.tabs.length)],
    ['Visibility', draft.visibility === 'public' ? 'Everyone' : draft.visibility === 'followers' ? 'Followers' : 'Only me'],
    ['In Explore', draft.visibility === 'public' && draft.discoverable ? 'Yes' : 'No'],
  ];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-black">{t('Ready to launch', 'চালুর জন্য প্রস্তুত')}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {t('Check the preview, then create your Space. Everything here stays editable afterwards.', 'প্রিভিউ দেখে স্পেস তৈরি করুন। পরে সবকিছু এডিট করা যাবে।')}
      </p>

      <dl className="mt-4 bg-card border border-border rounded-3xl divide-y divide-border overflow-hidden">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
            <dd className="text-sm font-extrabold truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Success ───────────────────────────────────────────────

function SuccessScreen({
  space,
  onNavigate,
}: {
  space: SpacePublicPayload;
  onNavigate: (path: string) => void;
}) {
  const path = spacePublicPath(space.handle);
  const [sharingCard, setSharingCard] = useState(false);
  const { t } = useMarketplaceLang();

  const actions = [
    { label: t('View Space', 'স্পেস দেখুন'), icon: ArrowRight, primary: true, run: () => onNavigate(path) },
    { label: t('Customize Space', 'স্পেস কাস্টমাইজ করুন'), icon: Pencil, run: () => onNavigate(`${path}?edit=1`) },
    { label: t('Create first post', 'প্রথম পোস্ট করুন'), icon: Rocket, run: () => onNavigate(`${path}?compose=1`) },
    { label: t('Invite followers', 'ফলোয়ার আমন্ত্রণ করুন'), icon: UserPlus, run: () => onNavigate(`${path}?invite=1`) },
    { label: t('Share Space', 'স্পেস শেয়ার করুন'), icon: Share2, run: () => shareSpace(space) },
    // A brand-new Space has nothing to show yet, so its card and QR are the most
    // useful thing to hand out on day one (§13).
    { label: t('QR code & share card', 'QR কোড ও শেয়ার কার্ড'), icon: QrCode, run: () => setSharingCard(true) },
  ];

  return (
    <div className="max-w-lg mx-auto text-center py-10">
      <span className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-primary/10 text-primary">
        <PartyPopper size={28} />
      </span>
      <h1 className="mt-4 text-2xl font-black">{t('Your WevSpace is ready.', 'আপনার WevSpace প্রস্তুত।')}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        <b className="text-foreground">{space.name}</b> {t('is live at', 'এখন লাইভ')}{' '}
        <span className="font-bold text-foreground">@{space.handle}</span>.
      </p>

      <div className="mt-6 grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.run}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-extrabold transition-colors ${
                action.primary
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-card border border-border hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={16} /> {action.label}
            </button>
          );
        })}
      </div>

      {sharingCard && <SpaceShareSheet space={space} onClose={() => setSharingCard(false)} />}
    </div>
  );
}
