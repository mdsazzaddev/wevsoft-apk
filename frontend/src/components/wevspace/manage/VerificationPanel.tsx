/**
 * Verification — MP3 §7: applying for a badge, and living with the answer.
 *
 * Four things shape this panel:
 *
 * 1. The state on screen comes from the server's `state`, not from whether an
 *    application row exists. A Space verified directly by platform staff has no
 *    application on file, and it must read "Verified" rather than "Not applied".
 * 2. The form validates with `checkVerificationDraft` — the same function the
 *    route runs — so the submit button is never enabled for something the server
 *    will refuse. The server's error map still wins on submit; it is the authority.
 * 3. Nothing internal can leak here, because the owner endpoint never selects it:
 *    no reviewer identity, no triage score, no moderation notes. The one sentence
 *    a reviewer writes for the applicant is `decisionReason`, and it is shown
 *    verbatim.
 * 4. Identity details on a past application belong to whoever signed it. A
 *    teammate who did not gets `identityVisible: false` and is told the details
 *    are hidden, instead of being shown empty fields.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Link2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_VERIFICATION_TIERS,
  VERIFICATION_ENTITY_TYPES,
  VERIFICATION_LIMITS,
  checkVerificationDraft,
  emptyVerificationDraft,
  type SpaceVerificationTier,
  type VerificationDraft,
  type VerificationEntityType,
  type VerificationViewState,
} from '@wevsoft/shared/wevspace';
import {
  fetchVerification,
  submitVerification,
  withdrawVerification,
  type VerificationOverview,
  type VerificationRequestView,
} from '../../../lib/wevspaceManageApi';
import { uploadSpaceImage } from '../../../lib/wevspaceApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  Select,
  Sheet,
  TextArea,
  TextInput,
  confirmAction,
  dateOnly,
  dateTime,
  statusTone,
  usePanelData,
} from './manageUi';

/** Headline copy per state. Kept in one table so no two cards can disagree. */
const STATE_COPY: Record<VerificationViewState, { title: string; blurb: string }> = {
  NOT_APPLIED: {
    title: 'Not verified yet',
    blurb: 'A badge tells visitors this Space really is who it says it is. Apply when you can prove it.',
  },
  PENDING: {
    title: 'With the review team',
    blurb: 'Your application is in the queue. You will be notified here and in your notifications when it is decided.',
  },
  UNDER_REVIEW: {
    title: 'Being reviewed',
    blurb: 'Someone is reading your application now. Nothing more is needed from you.',
  },
  VERIFIED: { title: 'Verified', blurb: 'This Space carries the verified badge everywhere it appears on Wevsoft.' },
  OFFICIAL: {
    title: 'Official',
    blurb: 'This Space is marked as the one authoritative account for its organisation.',
  },
  REJECTED: {
    title: 'Not approved',
    blurb: 'The reviewer left a reason below. Fix what it points at, then apply again.',
  },
  REVOKED: {
    title: 'Badge removed',
    blurb: 'The badge this Space held was taken back. The reason is below.',
  },
  WITHDRAWN: {
    title: 'Application withdrawn',
    blurb: 'You pulled this application back. You can send a new one whenever you are ready.',
  },
};

/** Which states offer an Apply button at all — the server decides if it is allowed. */
const APPLIABLE: VerificationViewState[] = ['NOT_APPLIED', 'REJECTED', 'REVOKED', 'WITHDRAWN'];

function stateIcon(state: VerificationViewState, size = 20) {
  switch (state) {
    case 'VERIFIED':
    case 'OFFICIAL':
      return <BadgeCheck size={size} />;
    case 'PENDING':
    case 'UNDER_REVIEW':
      return <Clock size={size} />;
    case 'REJECTED':
    case 'REVOKED':
      return <XCircle size={size} />;
    default:
      return <ShieldCheck size={size} />;
  }
}

function stateSkin(state: VerificationViewState): string {
  switch (state) {
    case 'VERIFIED':
    case 'OFFICIAL':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'PENDING':
    case 'UNDER_REVIEW':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'REJECTED':
    case 'REVOKED':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function entityLabel(id: unknown): string {
  return VERIFICATION_ENTITY_TYPES.find((entity) => entity.id === id)?.label || String(id || '—');
}

function tierLabel(id: unknown): string {
  return SPACE_VERIFICATION_TIERS.find((tier) => tier.id === id)?.label || String(id || '—');
}

export default function VerificationPanel() {
  const { spaceId, accent, isOwner } = useManage();
  const { data, loading, error, reload } = usePanelData<VerificationOverview>(
    () => fetchVerification(spaceId),
    [spaceId],
  );
  const [formOpen, setFormOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const withdraw = useCallback(async () => {
    if (!confirmAction('Withdraw this application? You can send a new one straight away.')) return;
    setWithdrawing(true);
    try {
      await withdrawVerification(spaceId);
      toast.success('Application withdrawn');
      await reload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not withdraw the application');
    } finally {
      setWithdrawing(false);
    }
  }, [reload, spaceId]);

  if (loading && !data) return <PanelSkeleton rows={3} tall />;
  if (error && !data) return <PanelError message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const copy = STATE_COPY[data.state] || STATE_COPY.NOT_APPLIED;
  const canApply = APPLIABLE.includes(data.state) && data.apply.allowed && data.canManage;
  const isOpen = data.state === 'PENDING' || data.state === 'UNDER_REVIEW';

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Verification"
        blurb="Ask the platform to confirm this Space is genuine. One application at a time, decided by a person."
        actions={
          canApply ? (
            <ActionButton tone="accent" accent={accent} onClick={() => setFormOpen(true)}>
              {data.state === 'NOT_APPLIED' ? 'Apply for verification' : 'Apply again'}
            </ActionButton>
          ) : undefined
        }
      />

      {/* ── Where this Space stands ─────────────────────────── */}
      <Card>
        <div className="flex items-start gap-3">
          <span className={`inline-grid place-items-center shrink-0 w-11 h-11 rounded-2xl ${stateSkin(data.state)}`}>
            {stateIcon(data.state)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black">{copy.title}</h3>
              {data.tier && <Pill tone={statusTone(data.tier)}>{tierLabel(data.tier)}</Pill>}
              {isOpen && data.latest && <Pill tone={statusTone(data.latest.status)}>{data.latest.statusLabel}</Pill>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{copy.blurb}</p>

            {data.tier && data.verifiedAt && (
              <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                Verified since {dateOnly(data.verifiedAt)}
              </p>
            )}
            {isOpen && data.latest && (
              <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                Sent {dateTime(data.latest.requestedAt)} · applied for {tierLabel(data.latest.tier)}
              </p>
            )}

            {/* The reviewer's sentence to the applicant, shown as written. */}
            {data.latest?.decisionReason && (data.state === 'REJECTED' || data.state === 'REVOKED') && (
              <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  What the reviewer said
                </p>
                <p className="mt-1 text-sm font-semibold whitespace-pre-wrap">{data.latest.decisionReason}</p>
              </div>
            )}

            {/* Why the Apply button is absent, when it is. */}
            {APPLIABLE.includes(data.state) && !data.apply.allowed && data.apply.reason && (
              <p className="mt-3 text-xs font-bold text-muted-foreground">{data.apply.reason}</p>
            )}
            {APPLIABLE.includes(data.state) && data.apply.allowed && !data.canManage && (
              <p className="mt-3 text-xs font-bold text-muted-foreground">
                Only someone who can change this Space's settings can apply.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canApply && (
                <ActionButton tone="accent" accent={accent} size="sm" onClick={() => setFormOpen(true)}>
                  {data.state === 'NOT_APPLIED' ? 'Apply for verification' : 'Apply again'}
                </ActionButton>
              )}
              {isOpen && data.canManage && (
                <ActionButton tone="danger" size="sm" busy={withdrawing} onClick={() => void withdraw()}>
                  Withdraw application
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── The application currently on file ───────────────── */}
      {data.latest && <ApplicationCard request={data.latest} accent={accent} title="This application" />}

      {/* ── What a reviewer is looking at ──────────────────── */}
      {!data.tier && <ExpectationsCard />}

      {/* ── Earlier applications ───────────────────────────── */}
      {data.history.length > 0 && (
        <Card>
          <CardTitle
            right={
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                {data.history.length} earlier
              </span>
            }
          >
            Earlier applications
          </CardTitle>
          <div className="divide-y divide-border">
            {data.history.map((request) => (
              <HistoryRow key={request.id} request={request} />
            ))}
          </div>
        </Card>
      )}

      {formOpen && (
        <ApplicationForm
          spaceId={spaceId}
          accent={accent}
          overview={data}
          isOwner={isOwner}
          onClose={() => setFormOpen(false)}
          onSent={async () => {
            setFormOpen(false);
            await reload();
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Reading an application back
// ──────────────────────────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-xs">
      <dt className="font-extrabold text-muted-foreground shrink-0">{label}</dt>
      <dd className="font-semibold text-right break-words min-w-0">{children}</dd>
    </div>
  );
}

function ApplicationCard({
  request,
  accent,
  title,
}: {
  request: VerificationRequestView;
  accent: string;
  title: string;
}) {
  return (
    <Card>
      <CardTitle right={<Pill tone={statusTone(request.status)}>{request.statusLabel}</Pill>}>{title}</CardTitle>

      <dl className="divide-y divide-border">
        <DetailRow label="Badge asked for">{tierLabel(request.tier)}</DetailRow>
        <DetailRow label="Applying as">{entityLabel(request.entityType)}</DetailRow>
        {request.identityVisible && (
          <>
            <DetailRow label="Legal name">{request.legalName || '—'}</DetailRow>
            {request.registrationId && <DetailRow label="Registration number">{request.registrationId}</DetailRow>}
            {request.contactEmail && <DetailRow label="Contact email">{request.contactEmail}</DetailRow>}
          </>
        )}
        {request.country && <DetailRow label="Country">{request.country}</DetailRow>}
        {request.officialWebsite && (
          <DetailRow label="Official website">
            <a
              href={request.officialWebsite}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: accent }}
            >
              {request.officialWebsite}
              <ExternalLink size={11} />
            </a>
          </DetailRow>
        )}
        <DetailRow label="Space at the time">
          {request.spaceNameAtRequest} · @{request.handleAtRequest}
        </DetailRow>
        <DetailRow label="Sent">{dateTime(request.requestedAt)}</DetailRow>
        {request.reviewedAt && <DetailRow label="Decided">{dateTime(request.reviewedAt)}</DetailRow>}
      </dl>

      <div className="mt-3 rounded-2xl bg-muted p-3">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Reason given</p>
        <p className="mt-1 text-sm font-semibold whitespace-pre-wrap">{request.reason}</p>
      </div>

      {request.links.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Supporting links</p>
          <ul className="mt-1.5 space-y-1">
            {request.links.map((link, index) => (
              <li key={`${link.url}-${index}`} className="flex items-center gap-2 text-xs">
                <Link2 size={12} className="shrink-0 text-muted-foreground" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold hover:underline truncate"
                  style={{ color: accent }}
                >
                  {link.label || link.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {request.documentCount > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <FileText size={12} />
          {request.documentCount} {request.documentCount === 1 ? 'document' : 'documents'} attached
        </p>
      )}

      {!request.identityVisible && (
        <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Lock size={12} className="mt-0.5 shrink-0" />
          The legal name, registration number and documents on this application are hidden. Only the Space owner and the
          person who sent it can read them.
        </p>
      )}
    </Card>
  );
}

function HistoryRow({ request }: { request: VerificationRequestView }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            {tierLabel(request.tier)} · {entityLabel(request.entityType)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
            Sent {dateOnly(request.requestedAt)}
            {request.reviewedAt ? ` · decided ${dateOnly(request.reviewedAt)}` : ''}
          </p>
        </div>
        <Pill tone={statusTone(request.status)}>{request.statusLabel}</Pill>
      </div>
      {request.decisionReason && (
        <p className="mt-2 rounded-2xl bg-muted p-3 text-xs font-semibold whitespace-pre-wrap">
          {request.decisionReason}
        </p>
      )}
    </div>
  );
}

/** Honest expectations, so fewer applications are sent that cannot succeed. */
function ExpectationsCard() {
  return (
    <Card>
      <CardTitle>What a reviewer looks at</CardTitle>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {[
          'The Space is published, has posted something, and looks like the thing it claims to be.',
          'The name and handle are not built to be mistaken for somebody else.',
          'The legal name or trading name matches the documents you attach.',
          'An official website or directory entry that independently points back here.',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
            <span className="font-semibold">{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <Info size={12} className="mt-0.5 shrink-0" />
        Decisions are made by a person. If an application is refused you are told why, and you can apply again after{' '}
        {VERIFICATION_LIMITS.reapplyDays} days.
      </p>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// The application form
// ──────────────────────────────────────────────────────────────

function ApplicationForm({
  spaceId,
  accent,
  overview,
  isOwner,
  onClose,
  onSent,
}: {
  spaceId: string;
  accent: string;
  overview: VerificationOverview;
  isOwner: boolean;
  onClose: () => void;
  onSent: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<VerificationDraft>(() => ({
    ...emptyVerificationDraft(),
    officialWebsite: overview.prefill.officialWebsite,
    contactEmail: overview.prefill.contactEmail,
    country: overview.prefill.country,
  }));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Same validator as the route, so the button state and the server's answer
  // cannot disagree about what a valid application is.
  const check = useMemo(() => checkVerificationDraft(draft), [draft]);
  const entity = VERIFICATION_ENTITY_TYPES.find((option) => option.id === draft.entityType) || VERIFICATION_ENTITY_TYPES[0];

  const errorFor = (field: string): string | null => {
    if (serverErrors[field]) return serverErrors[field];
    if (!attempted && !touched[field]) return null;
    return check.errors[field] || null;
  };

  const set = <K extends keyof VerificationDraft>(key: K, value: VerificationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setServerErrors((current) => (current[key as string] ? { ...current, [key as string]: '' } : current));
  };

  const pickEntity = (next: VerificationEntityType) => {
    setDraft((current) => ({
      ...current,
      entityType: next,
      // A person cannot be their own imposter, so Official is not on offer for
      // one. Switching the tier back here beats letting the form hold a
      // combination the server refuses.
      tier: next === 'INDIVIDUAL' && current.tier === 'OFFICIAL' ? 'VERIFIED' : current.tier,
    }));
  };

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const room = VERIFICATION_LIMITS.documents.max - draft.documents.length;
      if (room <= 0) {
        toast.error(`You can attach ${VERIFICATION_LIMITS.documents.max} documents at most`);
        return;
      }
      setUploading(true);
      try {
        const chosen = Array.from(files).slice(0, room);
        const urls: string[] = [];
        for (const file of chosen) {
          // Uploaded unlisted: a photo of a registration certificate must never
          // turn up in the Space's media grid.
          urls.push(await uploadSpaceImage(spaceId, file, { privacy: 'private' }));
        }
        setDraft((current) => ({ ...current, documents: [...current.documents, ...urls] }));
      } catch (err: any) {
        toast.error(err?.message || 'Could not upload that file');
      } finally {
        setUploading(false);
        if (fileInput.current) fileInput.current.value = '';
      }
    },
    [draft.documents.length, spaceId],
  );

  const submit = async () => {
    setAttempted(true);
    if (!check.ok) {
      toast.error(Object.values(check.errors)[0] || 'Check the application');
      return;
    }
    if (!declared) {
      toast.error('Confirm the declaration before sending');
      return;
    }
    setBusy(true);
    setServerErrors({});
    try {
      await submitVerification(spaceId, check.value);
      toast.success('Application sent for review');
      await onSent();
    } catch (err: any) {
      const map = err?.data?.errors;
      if (map && typeof map === 'object') setServerErrors(map as Record<string, string>);
      toast.error(err?.message || 'Could not send the application');
    } finally {
      setBusy(false);
    }
  };

  const tierOptions = SPACE_VERIFICATION_TIERS.filter(
    (tier) => !(tier.id === 'OFFICIAL' && draft.entityType === 'INDIVIDUAL'),
  );
  const selectedTier = SPACE_VERIFICATION_TIERS.find((tier) => tier.id === draft.tier);

  return (
    <Sheet
      title="Apply for verification"
      onClose={onClose}
      wide
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">One application at a time.</p>
          <div className="flex items-center gap-2">
            <ActionButton tone="ghost" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void submit()}>
              Send for review
            </ActionButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* What is being verified — read-only, straight off the Space. */}
        <div className="rounded-2xl bg-muted p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            The Space being verified
          </p>
          <p className="mt-1 text-sm font-bold">
            {overview.prefill.spaceName} · @{overview.prefill.handle}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            The name and handle are recorded as they are now. Renaming the Space later does not carry the decision over.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Applying as" error={errorFor('entityType')}>
            <Select
              value={draft.entityType}
              onChange={(event) => pickEntity(event.target.value as VerificationEntityType)}
            >
              {VERIFICATION_ENTITY_TYPES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Badge" hint={selectedTier?.blurb} error={errorFor('tier')}>
            <Select
              value={draft.tier}
              onChange={(event) => set('tier', event.target.value as SpaceVerificationTier)}
            >
              {tierOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={entity.id === 'INDIVIDUAL' ? 'Full legal name' : 'Registered legal name'}
          hint="Exactly as it appears on the documents you attach."
          error={errorFor('legalName')}
        >
          <TextInput
            value={draft.legalName}
            maxLength={VERIFICATION_LIMITS.legalName.max}
            onChange={(event) => set('legalName', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, legalName: true }))}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Registration number${entity.requiresRegistration ? '' : ' (optional)'}`}
            hint="Company, charity or tax number."
            error={errorFor('registrationId')}
          >
            <TextInput
              value={draft.registrationId}
              maxLength={VERIFICATION_LIMITS.registrationId.max}
              onChange={(event) => set('registrationId', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, registrationId: true }))}
            />
          </Field>

          <Field label="Country (optional)" error={errorFor('country')}>
            <TextInput
              value={draft.country}
              maxLength={VERIFICATION_LIMITS.country.max}
              onChange={(event) => set('country', event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Official website${entity.requiresWebsite ? '' : ' (optional)'}`}
            hint="A site you control that points back to this Space."
            error={errorFor('officialWebsite')}
          >
            <TextInput
              value={draft.officialWebsite}
              inputMode="url"
              placeholder="example.com"
              onChange={(event) => set('officialWebsite', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, officialWebsite: true }))}
            />
          </Field>

          <Field
            label="Contact email (optional)"
            hint="Used only if a reviewer needs to reach you. Not published."
            error={errorFor('contactEmail')}
          >
            <TextInput
              value={draft.contactEmail}
              inputMode="email"
              onChange={(event) => set('contactEmail', event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, contactEmail: true }))}
            />
          </Field>
        </div>

        <Field
          label="Why should this Space be verified?"
          hint={`At least ${VERIFICATION_LIMITS.reason.min} characters — this is what the reviewer reads first.`}
          error={errorFor('reason')}
          count={`${draft.reason.length}/${VERIFICATION_LIMITS.reason.max}`}
        >
          <TextArea
            rows={5}
            value={draft.reason}
            maxLength={VERIFICATION_LIMITS.reason.max}
            onChange={(event) => set('reason', event.target.value)}
            onBlur={() => setTouched((current) => ({ ...current, reason: true }))}
          />
        </Field>

        {/* ── Evidence ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold">Documents (optional)</span>
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
              {draft.documents.length}/{VERIFICATION_LIMITS.documents.max}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A photo or scan of registration papers, a press page, or an ID for a personal badge. Uploaded unlisted — they
            never appear in your Space's media or on your public page.
          </p>

          {draft.documents.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {draft.documents.map((url, index) => (
                <li key={`${url}-${index}`} className="flex items-center gap-2 rounded-2xl bg-muted p-2">
                  <FileText size={14} className="shrink-0 text-muted-foreground" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 min-w-0 truncate text-[11px] font-semibold hover:underline"
                    style={{ color: accent }}
                  >
                    {url.split('/').pop() || url}
                  </a>
                  <IconButton
                    label="Remove this document"
                    tone="danger"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        documents: current.documents.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void addFiles(event.target.files)}
          />
          <ActionButton
            size="sm"
            busy={uploading}
            disabled={draft.documents.length >= VERIFICATION_LIMITS.documents.max}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={13} />
            Attach a document
          </ActionButton>
        </div>

        {/* ── Supporting links ─────────────────────────────── */}
        <LinkEditor
          links={draft.links}
          accent={accent}
          error={errorFor('links')}
          onChange={(next) => set('links', next)}
        />

        {/* ── Declaration ──────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setDeclared((current) => !current)}
          aria-pressed={declared}
          className="w-full flex items-start gap-3 text-left rounded-2xl bg-muted p-3"
        >
          <span
            className={`mt-0.5 inline-grid place-items-center shrink-0 w-5 h-5 rounded-md border-2 ${
              declared ? 'border-transparent text-white' : 'border-border'
            }`}
            style={declared ? { background: accent } : undefined}
          >
            {declared && <BadgeCheck size={12} />}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold">
              Everything here is accurate and I am authorised to represent it.
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {isOwner
                ? 'Your name and the time you sent this are written to the activity log.'
                : 'You are applying on the owner’s behalf. Your name and the time are written to the activity log.'}
            </span>
          </span>
        </button>

        {attempted && !check.ok && (
          <p className="inline-flex items-start gap-1.5 text-[11px] font-bold text-red-500">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {Object.values(check.errors)[0]}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** Up to five label + URL rows. The label defaults to the hostname server-side. */
function LinkEditor({
  links,
  accent,
  error,
  onChange,
}: {
  links: Array<{ label: string; url: string }>;
  accent: string;
  error?: string | null;
  onChange: (next: Array<{ label: string; url: string }>) => void;
}) {
  const full = links.length >= VERIFICATION_LIMITS.links.max;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold">Supporting links (optional)</span>
        <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
          {links.length}/{VERIFICATION_LIMITS.links.max}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Press coverage, an official directory entry, or another account that already links here.
      </p>

      {links.length > 0 && (
        <ul className="mt-2 space-y-2">
          {links.map((link, index) => (
            <li key={index} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
              <TextInput
                value={link.label}
                placeholder="What it is"
                maxLength={VERIFICATION_LIMITS.links.labelMax}
                aria-label={`Label for link ${index + 1}`}
                onChange={(event) =>
                  onChange(links.map((row, i) => (i === index ? { ...row, label: event.target.value } : row)))
                }
              />
              <TextInput
                value={link.url}
                placeholder="example.com/article"
                inputMode="url"
                aria-label={`Address for link ${index + 1}`}
                onChange={(event) =>
                  onChange(links.map((row, i) => (i === index ? { ...row, url: event.target.value } : row)))
                }
              />
              <div className="flex justify-end">
                <IconButton
                  label={`Remove link ${index + 1}`}
                  tone="danger"
                  onClick={() => onChange(links.filter((_, i) => i !== index))}
                >
                  <X size={13} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1.5 text-[11px] font-bold text-red-500">{error}</p>}

      <div className="mt-2">
        <ActionButton size="sm" disabled={full} onClick={() => onChange([...links, { label: '', url: '' }])}>
          <Plus size={13} />
          Add a link
        </ActionButton>
      </div>
    </div>
  );
}
