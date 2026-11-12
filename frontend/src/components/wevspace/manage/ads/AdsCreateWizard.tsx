import React, { useEffect, useState } from 'react';
import {
  AD_CTAS,
  AD_FORMATS,
  AD_OBJECTIVES_FOR_UI,
  ADS_LIMITS,
  BILLING_MODELS,
  CAMPAIGN_LIMITS,
  defaultAdCreative,
  defaultTargeting,
  validateAdsCampaignDraft,
  type AdBillingModel,
  type AdCta,
  type AdDestinationType,
  type AdFormat,
  type CampaignDraft,
  type CampaignObjective,
  type CampaignTargeting,
} from '@wevsoft/shared/wevspace';
import toast from 'react-hot-toast';
import { uploadSpaceImage } from '../../../../lib/wevspaceApi';
import { createCampaign, transitionCampaign, updateCampaign } from '../../../../lib/wevspaceManageApi';
import { ActionButton, Field, Select, Sheet, TextArea, TextInput, ToggleRow } from '../manageUi';
import AdsLivePreview from './AdsLivePreview';
import AdsReviewStep from './AdsReviewStep';

const STEPS = ['objective', 'format', 'creative', 'audience', 'budget', 'review'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  objective: 'Goal',
  format: 'Format',
  creative: 'Creative',
  audience: 'Audience',
  budget: 'Budget',
  review: 'Review',
};

export interface WizardState {
  campaignId: string | null;
  name: string;
  objective: CampaignObjective;
  format: AdFormat;
  billingModel: AdBillingModel;
  bidAmount: number | null;
  dailyBudget: number;
  totalBudget: number;
  durationDays: number;
  startsAt: string;
  endsAt: string;
  currency: string;
  targeting: CampaignTargeting;
  primaryText: string;
  headline: string;
  description: string;
  cta: AdCta;
  destinationType: AdDestinationType;
  destinationUrl: string;
  mediaUrls: string[];
  variantBText: string;
  variantCText: string;
  /** Optional promoted object (e.g. boosting a post from Business Suite). Defaults to the Space. */
  targetKind?: string;
  targetId?: string | null;
}

function storageKey(spaceId: string) {
  return `wev_ads_draft:${spaceId}`;
}

function emptyState(): WizardState {
  const creative = defaultAdCreative();
  return {
    campaignId: null,
    name: '',
    objective: 'PROFILE_VISITS',
    format: 'SPACE_PROMOTE',
    billingModel: 'CPC',
    bidAmount: 1,
    dailyBudget: ADS_LIMITS.minDailyBudget,
    totalBudget: ADS_LIMITS.minTotalBudget,
    durationDays: 7,
    startsAt: '',
    endsAt: '',
    currency: 'BDT',
    targeting: defaultTargeting(),
    primaryText: creative.primaryText,
    headline: creative.headline,
    description: creative.description,
    cta: creative.cta,
    destinationType: creative.destinationType,
    destinationUrl: '',
    mediaUrls: [],
    variantBText: '',
    variantCText: '',
  };
}

function loadLocal(spaceId: string): { step: Step; state: WizardState } | null {
  try {
    const raw = localStorage.getItem(storageKey(spaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !parsed.state) return null;
    return { step: STEPS.includes(parsed.step) ? parsed.step : 'objective', state: { ...emptyState(), ...parsed.state } };
  } catch {
    return null;
  }
}

function saveLocal(spaceId: string, step: Step, state: WizardState) {
  try {
    localStorage.setItem(storageKey(spaceId), JSON.stringify({ v: 1, step, state }));
  } catch {
    /* quota / private mode */
  }
}

function clearLocal(spaceId: string) {
  try {
    localStorage.removeItem(storageKey(spaceId));
  } catch {
    /* ignore */
  }
}

function toDraft(state: WizardState): CampaignDraft {
  return {
    name: state.name.trim() || 'Untitled campaign',
    targetKind: (state.targetKind || 'SPACE') as CampaignDraft['targetKind'],
    targetId: state.targetId || null,
    objective: state.objective,
    dailyBudget: Number(state.dailyBudget) || 0,
    totalBudget: Number(state.totalBudget) || 0,
    durationDays: Number(state.durationDays) || 0,
    startsAt: state.startsAt || null,
    endsAt: state.endsAt || null,
    currency: state.currency,
    targeting: state.targeting,
    format: state.format,
    billingModel: state.billingModel,
    bidAmount: state.bidAmount,
  };
}

function creativeOf(state: WizardState) {
  return {
    primaryText: state.primaryText,
    headline: state.headline,
    description: state.description,
    cta: state.cta,
    destinationType: state.destinationType,
    destinationUrl: state.destinationUrl || null,
    destinationId: null,
    mediaUrls: state.mediaUrls,
    thumbnailUrl: state.mediaUrls[0] || null,
    altText: '',
  };
}

function applyObjectiveDefaults(objective: CampaignObjective, current: WizardState): WizardState {
  const next = { ...current, objective };
  if (objective === 'WEBSITE_VISITS' || objective === 'APP_INSTALLS') {
    next.format = 'EXTERNAL';
    next.destinationType = 'WEBSITE';
    next.cta = objective === 'APP_INSTALLS' ? 'DOWNLOAD' : 'LEARN_MORE';
  } else if (objective === 'VIDEO_VIEWS') {
    next.format = 'SPONSORED_REEL';
    next.cta = 'WATCH_MORE';
  } else if (objective === 'MESSAGES') {
    next.destinationType = 'MESSAGE';
    next.cta = 'MESSAGE';
  } else if (objective === 'PRODUCT_SALES') {
    next.cta = 'SHOP_NOW';
    next.destinationType = 'PRODUCT';
  } else if (objective === 'FOLLOWERS' || objective === 'PROFILE_VISITS') {
    next.format = 'SPACE_PROMOTE';
    next.destinationType = 'WESPACE';
    next.cta = 'FOLLOW';
  }
  return next;
}

export default function AdsCreateWizard({
  spaceId,
  accent,
  spaceName,
  spaceAvatar,
  canManage,
  onDone,
  seed,
  audienceSlot,
}: {
  spaceId: string;
  accent?: string;
  spaceName: string;
  spaceAvatar?: string | null;
  canManage: boolean;
  onDone: () => void;
  /** Pre-filled values (Boost post / form ad); skips straight to the creative step. */
  seed?: Partial<WizardState> | null;
  /** Extra UI at the top of the Audience step (Business Suite saved audiences). */
  audienceSlot?: (apply: (t: CampaignTargeting) => void) => React.ReactNode;
}) {
  const restored = loadLocal(spaceId);
  const [step, setStep] = useState<Step>(seed ? 'creative' : restored?.step || 'objective');
  const [state, setState] = useState<WizardState>(seed ? { ...emptyState(), ...seed } : restored?.state || emptyState());
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    saveLocal(spaceId, step, state);
  }, [spaceId, step, state]);

  const idx = STEPS.indexOf(step);
  const preview = (
    <AdsLivePreview
      model={{
        format: state.format,
        spaceName,
        spaceAvatar,
        primaryText: state.primaryText,
        headline: state.headline,
        cta: state.cta,
        mediaUrl: state.mediaUrls[0] || null,
        accent,
      }}
    />
  );

  function patch(over: Partial<WizardState>) {
    setState((current) => ({ ...current, ...over }));
  }

  async function persist(submit: boolean) {
    if (!canManage) return;
    const draft = toDraft(state);
    const creative = creativeOf(state);
    const readyCreative = !!(creative.primaryText || '').trim();
    if (submit) {
      const check = validateAdsCampaignDraft(draft, creative);
      if (check.ok === false) {
        toast.error(check.errors[0] || 'Fix the highlighted fields first');
        return;
      }
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = readyCreative ? { ...draft, creative } : { ...draft };
      const extras = [];
      if (state.variantBText.trim()) {
        extras.push({ ...creative, variantKey: 'B', primaryText: state.variantBText.trim() });
      }
      if (state.variantCText.trim()) {
        extras.push({ ...creative, variantKey: 'C', primaryText: state.variantCText.trim() });
      }
      if (extras.length) payload.creatives = extras;
      let campaignId = state.campaignId;
      if (campaignId) {
        await updateCampaign(campaignId, payload);
      } else {
        const created = await createCampaign(spaceId, payload);
        campaignId = created.id;
        patch({ campaignId, name: created.name || draft.name });
      }
      if (submit && campaignId) {
        await transitionCampaign(campaignId, 'PENDING_REVIEW');
        clearLocal(spaceId);
        toast.success('Sent for review — a Wevsoft reviewer decides whether it runs');
        onDone();
      } else {
        toast.success('Draft saved');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not save this campaign');
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSpaceImage(spaceId, file, { privacy: 'public' });
      patch({ mediaUrls: [url, ...state.mediaUrls.filter((item) => item !== url)].slice(0, 4) });
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const errors = step === 'review' ? validateAdsCampaignDraft(toDraft(state), creativeOf(state)).errors : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
      <div className="space-y-4">
        <ol className="flex flex-wrap gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
          {STEPS.map((item, i) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => setStep(item)}
                className={`px-2.5 py-1 rounded-2xl ${item === step ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                style={item === step ? { background: accent || 'var(--primary)' } : undefined}
              >
                {i + 1}. {STEP_LABELS[item]}
              </button>
            </li>
          ))}
        </ol>

        {step === 'objective' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AD_OBJECTIVES_FOR_UI.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setState((current) => applyObjectiveDefaults(item.id, current))}
                className={`text-left rounded-3xl border p-4 ${
                  state.objective === item.id ? 'border-transparent text-primary-foreground' : 'border-border bg-card'
                }`}
                style={state.objective === item.id ? { background: accent || 'var(--primary)' } : undefined}
              >
                <p className="text-sm font-extrabold">{item.label}</p>
                <p className={`mt-1 text-[11px] ${state.objective === item.id ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {item.blurb}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 'format' && (
          <div className="space-y-2">
            {AD_FORMATS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => patch({ format: item.id })}
                className={`w-full text-left rounded-3xl border p-4 ${
                  state.format === item.id ? 'border-transparent text-primary-foreground' : 'border-border bg-card'
                }`}
                style={state.format === item.id ? { background: accent || 'var(--primary)' } : undefined}
              >
                <p className="text-sm font-extrabold">{item.label}</p>
                <p className={`mt-1 text-[11px] ${state.format === item.id ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {item.blurb}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 'creative' && (
          <div className="space-y-3">
            <Field label="Campaign name">
              <TextInput
                value={state.name}
                maxLength={CAMPAIGN_LIMITS.name.max}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Spring launch"
              />
            </Field>
            <Field label="Primary text">
              <TextArea
                rows={4}
                maxLength={ADS_LIMITS.maxPrimaryText}
                value={state.primaryText}
                onChange={(e) => patch({ primaryText: e.target.value })}
                placeholder="What should people read first?"
              />
            </Field>
            <Field label="Headline">
              <TextInput
                value={state.headline}
                maxLength={ADS_LIMITS.maxHeadline}
                onChange={(e) => patch({ headline: e.target.value })}
              />
            </Field>
            <Field label="Call to action">
              <Select value={state.cta} onChange={(e) => patch({ cta: e.target.value as AdCta })}>
                {AD_CTAS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            {(state.format === 'EXTERNAL' || state.destinationType === 'WEBSITE' || state.destinationType === 'APP') && (
              <Field label="Destination URL">
                <TextInput
                  value={state.destinationUrl}
                  onChange={(e) => patch({ destinationUrl: e.target.value, destinationType: 'WEBSITE' })}
                  placeholder="https://"
                />
              </Field>
            )}
            <Field label="Media">
              <input
                type="file"
                accept="image/*,video/*"
                disabled={uploading}
                onChange={(e) => void onPickFile(e.target.files?.[0])}
              />
            </Field>
            <button type="button" className="lg:hidden text-xs font-extrabold" onClick={() => setPreviewOpen(true)}>
              Preview
            </button>
            <Field label="Creative B (optional A/B)">
              <TextArea
                rows={3}
                maxLength={ADS_LIMITS.maxPrimaryText}
                value={state.variantBText}
                onChange={(e) => patch({ variantBText: e.target.value })}
                placeholder="Alternate primary text — served at random until there is enough data"
              />
            </Field>
            <Field label="Creative C (optional)">
              <TextArea
                rows={3}
                maxLength={ADS_LIMITS.maxPrimaryText}
                value={state.variantCText}
                onChange={(e) => patch({ variantCText: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 'audience' && (
          <div className="space-y-3">
            {audienceSlot?.((t) => setState((s) => ({ ...s, targeting: { ...s.targeting, ...t } })))}
            <ToggleRow
              label="Custom audience"
              blurb="Narrow by age and gender. Leave off to let Wevsoft find people."
              checked={state.targeting.kind === 'CUSTOM'}
              accent={accent}
              onChange={(on) =>
                patch({
                  targeting: {
                    ...state.targeting,
                    kind: on ? 'CUSTOM' : 'BROAD',
                    ages: on ? ['18-24', '25-34'] : [],
                  },
                })
              }
            />
            <Field label="Gender">
              <Select
                value={state.targeting.gender}
                onChange={(e) => patch({ targeting: { ...state.targeting, gender: e.target.value as CampaignTargeting['gender'] } })}
              >
                <option value="ALL">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min age">
                <TextInput
                  type="number"
                  min={13}
                  max={65}
                  value={state.targeting.ageMin ?? 18}
                  onChange={(e) => patch({ targeting: { ...state.targeting, ageMin: Number(e.target.value) } })}
                />
              </Field>
              <Field label="Max age">
                <TextInput
                  type="number"
                  min={13}
                  max={65}
                  value={state.targeting.ageMax ?? 65}
                  onChange={(e) => patch({ targeting: { ...state.targeting, ageMax: Number(e.target.value) } })}
                />
              </Field>
            </div>
            <Field label="Country">
              <TextInput
                value={state.targeting.country || ''}
                onChange={(e) => patch({ targeting: { ...state.targeting, country: e.target.value || null } })}
                placeholder="Bangladesh"
              />
            </Field>
          </div>
        )}

        {step === 'budget' && (
          <div className="space-y-3">
            <Field label="Billing">
              <Select value={state.billingModel} onChange={(e) => patch({ billingModel: e.target.value as AdBillingModel })}>
                {BILLING_MODELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bid">
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={state.bidAmount ?? ''}
                onChange={(e) => patch({ bidAmount: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="Daily budget">
                <TextInput
                  type="number"
                  min={ADS_LIMITS.minDailyBudget}
                  value={state.dailyBudget}
                  onChange={(e) => patch({ dailyBudget: Number(e.target.value) })}
                />
              </Field>
              <Field label="Total budget">
                <TextInput
                  type="number"
                  min={ADS_LIMITS.minTotalBudget}
                  value={state.totalBudget}
                  onChange={(e) => patch({ totalBudget: Number(e.target.value) })}
                />
              </Field>
              <Field label="Days">
                <TextInput
                  type="number"
                  min={CAMPAIGN_LIMITS.minDurationDays}
                  max={CAMPAIGN_LIMITS.maxDurationDays}
                  value={state.durationDays}
                  onChange={(e) => patch({ durationDays: Number(e.target.value) })}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 'review' && (
          <AdsReviewStep
            model={{
              name: state.name,
              objective: state.objective,
              format: state.format,
              billingModel: state.billingModel,
              dailyBudget: state.dailyBudget,
              totalBudget: state.totalBudget,
              durationDays: state.durationDays,
              currency: state.currency,
              cta: state.cta,
              destinationUrl: state.destinationUrl,
              hasAbVariants: !!(state.variantBText.trim() || state.variantCText.trim()),
            }}
            accent={accent}
            busy={busy}
            canManage={canManage}
            errors={errors}
            onBack={() => setStep(STEPS[idx - 1])}
            onSaveDraft={() => void persist(false)}
            onSubmit={() => void persist(true)}
          />
        )}

        {step !== 'review' && (
          <div className="flex flex-wrap gap-2">
            {idx > 0 && <ActionButton onClick={() => setStep(STEPS[idx - 1])}>Back</ActionButton>}
            <ActionButton tone="accent" accent={accent} onClick={() => setStep(STEPS[idx + 1])}>
              Continue
            </ActionButton>
            {canManage && (
              <ActionButton onClick={() => void persist(false)} busy={busy}>
                Save draft
              </ActionButton>
            )}
          </div>
        )}
      </div>

      <div className="hidden lg:block sticky top-4 self-start">{preview}</div>

      {previewOpen && (
        <Sheet title="Preview" elevated onClose={() => setPreviewOpen(false)}>
          {preview}
        </Sheet>
      )}
    </div>
  );
}
