/**
 * Owner editing surface for an existing WevSpace.
 *
 * A full-height right drawer on desktop and a near-full-screen sheet on mobile
 * (spec §7 — not a shrunken desktop dialog). It edits the same SpaceDraft shape
 * the creation wizard produces, so identity fields and SpaceCustomizeForm are
 * reused rather than re-implemented (spec §13), and the same SpaceLivePreview
 * renders the result through the real Space components (spec §8).
 *
 * Saving is two requests because the server models them separately: PATCH for
 * the Space row, PUT /links for the link list. Nothing is written to
 * localStorage — a reload re-reads the saved Space (spec §12).
 */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_DELETION_GRACE_DAYS,
  SPACE_LIMITS,
  SPACE_TYPES,
  applySpaceTypeDefaults,
  categoriesForType,
  isValidContactEmail,
  normalizeWebsiteUrl,
  spaceDashboardPath,
  spaceOwnerStatusNotice,
  type SpaceDraft,
  type SpacePublicPayload,
  type SpaceType,
} from '@wevsoft/shared/wevspace';
import {
  archiveSpace,
  cancelSpaceDeletion,
  publishSpace,
  requestSpaceDeletion,
  saveSpaceLinks,
  unpublishSpace,
  updateSpace,
} from '../../lib/wevspaceApi';
import { useStore } from '../../store';
import SpaceCustomizeForm from './SpaceCustomizeForm';
import SpaceHandleField from './SpaceHandleField';
import SpaceImagePicker from './SpaceImagePicker';
import SpaceLivePreview from './SpaceLivePreview';
import { draftToSpacePayload, draftToUpdatePayload, spacePayloadToDraft } from './draftPreview';

interface Props {
  space: SpacePublicPayload;
  /** Receives the saved Space so the page can refresh without a round-trip. */
  onSaved: (space: SpacePublicPayload) => void;
  onClose: () => void;
  /** Called after a delete, once the Space no longer exists. */
  onDeleted?: () => void;
}

type Section = 'identity' | 'customize' | 'preview';

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'identity', label: 'Identity' },
  { id: 'customize', label: 'Customize' },
  { id: 'preview', label: 'Preview' },
];

const inputClass =
  'w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-sm outline-none focus:border-primary transition-colors';

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

export default function SpaceEditDrawer({ space, onSaved, onClose, onDeleted }: Props) {
  const user = useStore((s) => s.user);
  const [draft, setDraft] = useState<SpaceDraft>(() => spacePayloadToDraft(space));
  const [section, setSection] = useState<Section>('identity');
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [handleState, setHandleState] = useState({
    checking: false,
    // The Space's current handle is valid by definition until it is edited.
    available: true,
    error: null as string | null,
  });

  // Esc closes, and the page behind must not scroll while the sheet is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const patch = (next: Partial<SpaceDraft>) => setDraft((current) => ({ ...current, ...next }));

  const owner = space.owner
    ? space.owner
    : user
      ? { id: user.id, name: user.name, username: user.username || null, avatar: user.avatar || null }
      : null;

  const previewSpace = useMemo(() => {
    const built = draftToSpacePayload(draft, owner);
    // Keep the real identity and counts so the preview is the actual Space, not
    // a zeroed-out draft of it.
    return {
      ...built,
      id: space.id,
      status: space.status,
      verificationStatus: space.verificationStatus,
      followersCount: space.followersCount,
      postsCount: space.postsCount,
      reelsCount: space.reelsCount,
      viewsCount: space.viewsCount,
      createdAt: space.createdAt,
      publishedAt: space.publishedAt,
    };
  }, [draft, owner, space]);

  const categories = categoriesForType(draft.spaceType);
  const nameValid = draft.name.trim().length >= SPACE_LIMITS.name.min;
  const emailValid = !draft.contactEmail.trim() || isValidContactEmail(draft.contactEmail);
  const websiteValid = !draft.website.trim() || !!normalizeWebsiteUrl(draft.website);
  const handleReady = handleState.available && !handleState.checking;
  const canSave = nameValid && emailValid && websiteValid && handleReady && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = draftToUpdatePayload(draft);
      const updated = await updateSpace(space.id, {
        ...payload,
        website: normalizeWebsiteUrl(draft.website) || '',
      });
      // Links live behind their own endpoint; blank rows are dropped rather than
      // rejected so an empty "Add link" row cannot block a save.
      await saveSpaceLinks(
        space.id,
        draft.links
          .filter((link) => !!link.url.trim())
          .map((link) => ({ platform: link.platform, url: link.url.trim(), label: link.label || null })),
      );
      toast.success('Changes saved');
      onSaved(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your changes');
      if (/username|handle/i.test(String(err?.message || ''))) setSection('identity');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (
    id: string,
    run: () => Promise<SpacePublicPayload>,
    message: string,
  ) => {
    setBusyAction(id);
    try {
      const updated = await run();
      toast.success(message);
      onSaved(updated);
    } catch (err: any) {
      toast.error(err?.message || 'That did not work');
    } finally {
      setBusyAction(null);
    }
  };

  /**
   * §6. Starts the grace period rather than deleting. The full flow — the
   * consequence list, the export, the type-the-handle confirmation — lives in
   * Settings → Delete this Space; this is the quick path, so it says what will
   * happen and where to go for the rest.
   */
  const destroy = async () => {
    if (
      !window.confirm(
        `Schedule “${space.name}” for deletion?\n\nIt is hidden from visitors straight away, and permanently deleted in ${SPACE_DELETION_GRACE_DAYS} days. You can cancel any time before then.\n\nTo download your data first, use Settings → Delete this Space.`,
      )
    ) {
      return;
    }
    setBusyAction('delete');
    try {
      const result = await requestSpaceDeletion(space.id);
      if (result.purged) {
        toast.success('WevSpace deleted — it was an empty draft, so there was nothing to hold.');
        onDeleted?.();
        return;
      }
      toast.success(`Scheduled for deletion. You have ${SPACE_DELETION_GRACE_DAYS} days to change your mind.`);
      onDeleted?.();
    } catch (err: any) {
      toast.error(err?.message || 'Could not start the deletion');
    } finally {
      setBusyAction(null);
    }
  };

  const pendingDeletion = space.status === 'PENDING_DELETION';
  const statusNotice = spaceOwnerStatusNotice(space);

  const undelete = async () => {
    setBusyAction('undelete');
    try {
      const updated = await cancelSpaceDeletion(space.id);
      toast.success('Deletion cancelled. Nothing was removed.');
      onSaved?.(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel the deletion');
    } finally {
      setBusyAction(null);
    }
  };

  const published = space.status === 'PUBLISHED';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Customize WevSpace">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />

      <div className="relative flex h-full w-full flex-col bg-background shadow-2xl sm:max-w-xl lg:max-w-3xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-black text-base truncate">Customize WevSpace</h2>
              <p className="text-xs text-muted-foreground truncate">@{space.handle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 inline-flex items-center gap-1 p-1 rounded-2xl bg-muted">
            {SECTIONS.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                    active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {section === 'identity' && (
            <div className="space-y-3.5">
              <section className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
                <h3 className="font-black text-sm">Images</h3>
                <SpaceImagePicker
                  value={draft.avatar}
                  onChange={(url) => patch({ avatar: url })}
                  shape="avatar"
                  spaceId={space.id}
                  label="Profile image"
                  hint="Square works best — at least 400×400."
                />
                <SpaceImagePicker
                  value={draft.cover}
                  onChange={(url) => patch({ cover: url })}
                  shape="cover"
                  spaceId={space.id}
                  label="Cover image"
                  hint="Wide image, around 1600×600."
                />
              </section>

              <section className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
                <h3 className="font-black text-sm">Identity</h3>

                <Field
                  id="edit-space-name"
                  label="Name"
                  hint={`${draft.name.length}/${SPACE_LIMITS.name.max}`}
                  error={draft.name.length > 0 && !nameValid ? `At least ${SPACE_LIMITS.name.min} characters.` : null}
                >
                  <input
                    id="edit-space-name"
                    value={draft.name}
                    maxLength={SPACE_LIMITS.name.max}
                    onChange={(e) => patch({ name: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <SpaceHandleField
                  value={draft.handle}
                  onChange={(handle) => patch({ handle })}
                  spaceId={space.id}
                  onStatusChange={setHandleState}
                />
                <p className="-mt-2 text-xs text-muted-foreground">
                  Changing this changes your public link. The old one keeps redirecting here.
                </p>

                <Field id="edit-space-type" label="Space type" hint="Re-seeds the suggested tabs and features.">
                  <select
                    id="edit-space-type"
                    value={draft.spaceType}
                    onChange={(e) =>
                      setDraft((current) => applySpaceTypeDefaults(current, e.target.value as SpaceType))
                    }
                    className={inputClass}
                  >
                    {SPACE_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="edit-space-category" label="Category" hint="Helps people find you in Explore.">
                  <input
                    id="edit-space-category"
                    list="edit-space-category-options"
                    value={draft.category}
                    maxLength={SPACE_LIMITS.category.max}
                    onChange={(e) => patch({ category: e.target.value })}
                    className={inputClass}
                  />
                  <datalist id="edit-space-category-options">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </Field>

                <Field id="edit-space-tagline" label="Tagline" hint={`${draft.tagline.length}/${SPACE_LIMITS.tagline.max}`}>
                  <input
                    id="edit-space-tagline"
                    value={draft.tagline}
                    maxLength={SPACE_LIMITS.tagline.max}
                    onChange={(e) => patch({ tagline: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field id="edit-space-bio" label="Short bio" hint={`${draft.bio.length}/${SPACE_LIMITS.bio.max}`}>
                  <textarea
                    id="edit-space-bio"
                    value={draft.bio}
                    rows={2}
                    maxLength={SPACE_LIMITS.bio.max}
                    onChange={(e) => patch({ bio: e.target.value })}
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                <Field
                  id="edit-space-description"
                  label="Description"
                  hint={`${draft.description.length}/${SPACE_LIMITS.description.max}`}
                >
                  <textarea
                    id="edit-space-description"
                    value={draft.description}
                    rows={4}
                    maxLength={SPACE_LIMITS.description.max}
                    onChange={(e) => patch({ description: e.target.value })}
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </section>

              <section className="bg-card border border-border rounded-3xl p-4 sm:p-5 space-y-4">
                <h3 className="font-black text-sm">Contact</h3>

                <Field
                  id="edit-space-website"
                  label="Website"
                  error={!websiteValid ? 'That address does not look valid.' : null}
                >
                  <input
                    id="edit-space-website"
                    value={draft.website}
                    maxLength={SPACE_LIMITS.website.max}
                    placeholder="https://"
                    onChange={(e) => patch({ website: e.target.value })}
                    className={inputClass}
                  />
                </Field>

                <Field
                  id="edit-space-email"
                  label="Contact email"
                  error={!emailValid ? 'That email does not look valid.' : null}
                >
                  <input
                    id="edit-space-email"
                    type="email"
                    value={draft.contactEmail}
                    maxLength={SPACE_LIMITS.contactEmail.max}
                    onChange={(e) => patch({ contactEmail: e.target.value })}
                    className={inputClass}
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draft.showEmail}
                      onChange={(e) => patch({ showEmail: e.target.checked })}
                      className="accent-primary"
                    />
                    Show this email publicly
                  </label>
                </Field>

                <Field id="edit-space-phone" label="Contact phone">
                  <input
                    id="edit-space-phone"
                    value={draft.contactPhone}
                    maxLength={SPACE_LIMITS.contactPhone.max}
                    onChange={(e) => patch({ contactPhone: e.target.value })}
                    className={inputClass}
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draft.showPhone}
                      onChange={(e) => patch({ showPhone: e.target.checked })}
                      className="accent-primary"
                    />
                    Show this phone number publicly
                  </label>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="edit-space-location" label="City / area">
                    <input
                      id="edit-space-location"
                      value={draft.location}
                      maxLength={SPACE_LIMITS.location.max}
                      onChange={(e) => patch({ location: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="edit-space-country" label="Country">
                    <input
                      id="edit-space-country"
                      value={draft.country}
                      maxLength={60}
                      onChange={(e) => patch({ country: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="edit-space-region" label="Region / state">
                    <input
                      id="edit-space-region"
                      value={draft.region}
                      maxLength={60}
                      onChange={(e) => patch({ region: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field id="edit-space-language" label="Main language">
                    <input
                      id="edit-space-language"
                      value={draft.language}
                      maxLength={12}
                      onChange={(e) => patch({ language: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </section>

              {/* Status & danger zone */}
              <section className="bg-card border border-border rounded-3xl p-4 sm:p-5">
                <h3 className="font-black text-sm">Space status</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {published
                    ? 'This WevSpace is live. Unpublishing hides it from everyone but you and your team.'
                    : statusNotice?.text}
                </p>

                {/* §6. While a deletion is scheduled the only action offered is the
                    way out of it: publish and archive are refused by the server, and
                    a second delete would be a no-op. */}
                {pendingDeletion ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyAction === 'undelete'}
                      onClick={() => void undelete()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {busyAction === 'undelete' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      Cancel deletion
                    </button>
                    <Link
                      to={`${spaceDashboardPath(space.handle, 'settings')}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink size={14} />
                      See the date and export
                    </Link>
                  </div>
                ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {published ? (
                    <button
                      type="button"
                      disabled={busyAction === 'unpublish'}
                      onClick={() => void runAction('unpublish', () => unpublishSpace(space.id), 'Moved back to draft')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                    >
                      {busyAction === 'unpublish' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <EyeOff size={14} />
                      )}
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyAction === 'publish'}
                      onClick={() => void runAction('publish', () => publishSpace(space.id), 'Your WevSpace is live')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {busyAction === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      Publish
                    </button>
                  )}

                  {space.status !== 'ARCHIVED' && (
                    <button
                      type="button"
                      disabled={busyAction === 'archive'}
                      onClick={() => void runAction('archive', () => archiveSpace(space.id), 'WevSpace archived')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                    >
                      {busyAction === 'archive' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Archive size={14} />
                      )}
                      Archive
                    </button>
                  )}

                  {space.viewer?.isOwner && (
                    <button
                      type="button"
                      disabled={busyAction === 'delete'}
                      onClick={() => void destroy()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-extrabold hover:bg-red-500/15 transition-colors disabled:opacity-60"
                    >
                      {busyAction === 'delete' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete
                    </button>
                  )}
                </div>
                )}
              </section>
            </div>
          )}

          {section === 'customize' && (
            <SpaceCustomizeForm draft={draft} onChange={patch} spaceId={space.id} showImages={false} />
          )}

          {section === 'preview' && <SpaceLivePreview space={previewSpace} />}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <a
              href={`/space/@${space.handle}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-card border border-border text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Globe size={14} /> Open public page
            </a>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {!canSave && !saving && (
            <p className="mt-2 text-xs text-muted-foreground">
              {!nameValid
                ? `Add a name (at least ${SPACE_LIMITS.name.min} characters).`
                : handleState.checking
                  ? 'Checking that username…'
                  : !handleState.available
                    ? handleState.error || 'Pick an available username.'
                    : !emailValid
                      ? 'That contact email looks invalid.'
                      : 'That website address looks invalid.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
