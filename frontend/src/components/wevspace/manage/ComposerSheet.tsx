/**
 * The advanced Space post composer (MP2 §7).
 *
 * Spec requirements this file implements literally:
 *  - "Posting as: [Space Identity]" is always on screen, built by the shared
 *    actingAsLabel() helper so it reads identically to the Space switcher (§2);
 *  - "Before publishing show preview" — the preview reuses <SpaceIdentity>, the
 *    same header the public page renders, because MP1 forbids a preview that
 *    differs from the real Space;
 *  - validation runs through the shared validateComposerDraft(), the exact
 *    function the server calls, so the messages a user sees are the messages the
 *    API would return. Client-side it is convenience; the server is the gate.
 *
 * Media is uploaded through uploadSpaceImage(), which posts to the Space media
 * endpoint so every Media row keeps spaceId + uploaderUserId (MP1).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CreatePostUnsavedBar, { useBeforeUnloadGuard } from '../../create-post/CreatePostUnsavedBar';
import {
  CalendarClock,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import TargetingButton from '../../targeting/TargetingButton';
import { NO_TARGETING, targetingPayload, valueFromServer, type TargetingValue } from '../../../lib/postTargeting';
import {
  SPACE_COMPOSER_LIMITS,
  SPACE_CTA_TYPES,
  SPACE_POST_AUDIENCES,
  actingAsLabel,
  clampAudienceToVisibility,
  composerKindsFor,
  emptyComposerDraft,
  extractHashtags,
  spaceContentKindDef,
  validateComposerDraft,
  type SpaceComposerDraft,
  type SpaceContentKind,
  type SpacePostAudience,
} from '@wevsoft/shared/wevspace';
import { createSpacePost, updateSpacePost } from '../../../lib/wevspaceManageApi';
import { uploadSpaceImage } from '../../../lib/wevspaceApi';
import { spaceIcon } from '../spaceIcons';
import SpaceIdentity from '../SpaceIdentity';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Field,
  Sheet,
  TextArea,
  TextInput,
  ToggleRow,
  fromLocalInputValue,
  toLocalInputValue,
} from './manageUi';

interface ComposerSheetProps {
  onClose: () => void;
  /** Called after a successful save so the list can refresh. */
  onSaved: () => void;
  /** Present when editing an existing post rather than writing a new one. */
  post?: any | null;
  canPublish: boolean;
  canSchedule: boolean;
}

type Mode = 'edit' | 'preview';

/** Existing post row → composer draft, so Edit opens on the real values. */
function draftFromPost(post: any, spaceId: string): SpaceComposerDraft {
  const base = emptyComposerDraft(spaceId, (post?.type as SpaceContentKind) || 'TEXT');
  const media = Array.isArray(post?.media)
    ? post.media.map((entry: any) => ({ url: entry.url, type: entry.type || 'image', altText: entry.altText || undefined }))
    : [];
  const pollOptions = Array.isArray(post?.poll?.options)
    ? post.poll.options.map((option: any) => String(option?.text ?? option ?? ''))
    : base.pollOptions;
  return {
    ...base,
    kind: (post?.type as SpaceContentKind) || (media.length > 1 ? 'CAROUSEL' : media.length ? 'PHOTO' : 'TEXT'),
    text: post?.content || '',
    media,
    pollOptions: pollOptions.length >= 2 ? pollOptions : base.pollOptions,
    location: post?.location || null,
    audience: (post?.privacy as SpacePostAudience) || 'public',
    scheduledFor: post?.scheduledFor || null,
    publishAsDraft: post?.status === 'draft',
    pinned: post?.pinned === true,
    commentsDisabled: post?.commentsDisabled === true,
    hashtags: Array.isArray(post?.hashtags) ? post.hashtags.map((tag: any) => String(tag?.tag ?? tag)) : [],
  };
}

export default function ComposerSheet({ onClose, onSaved, post, canPublish, canSchedule }: ComposerSheetProps) {
  const { space, spaceId, accent, features } = useManage();
  const editing = !!post?.id;

  const [draft, setDraft] = useState<SpaceComposerDraft>(() =>
    editing ? draftFromPost(post, spaceId) : emptyComposerDraft(spaceId, 'TEXT'),
  );
  const [mode, setMode] = useState<Mode>('edit');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // FB-style audience targeting (restriction or feed preference), sent next to the draft.
  const [tg, setTg] = useState<TargetingValue>(() => (editing ? valueFromServer(post?.targeting, post?.feedTargeting) : NO_TARGETING));
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Posts never keep local drafts: leaving with unsaved changes asks Discard / Continue editing.
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const initialRef = useRef<string | null>(null);
  const snapshot = JSON.stringify({ draft, tg });
  if (initialRef.current === null) initialRef.current = snapshot;
  const isDirty = snapshot !== initialRef.current;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useBeforeUnloadGuard(isDirty && !finishedRef.current);

  const requestClose = () => {
    if (isDirty && !finishedRef.current) setConfirmLeave(true);
    else onClose();
  };

  const discardAndClose = () => {
    finishedRef.current = true;
    setConfirmLeave(false);
    onClose();
  };

  const kinds = useMemo(() => composerKindsFor({ features, spaceType: space?.spaceType }), [features, space?.spaceType]);
  const kindDef = spaceContentKindDef(draft.kind);

  const set = useCallback((patch: Partial<SpaceComposerDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  // Audience can never exceed the Space's own visibility (§6), so the select is
  // narrowed rather than showing options the server would clamp anyway.
  const audiences = useMemo(
    () => SPACE_POST_AUDIENCES.filter((option) => clampAudienceToVisibility(option.id, space?.visibility) === option.id),
    [space?.visibility],
  );

  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
  const validation = useMemo(() => validateComposerDraft(draft, Date.now()), [draft]);
  const hashtags = useMemo(
    () => (draft.hashtags.length ? draft.hashtags : extractHashtags(draft.text)),
    [draft.hashtags, draft.text],
  );

  const pickFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const room = SPACE_COMPOSER_LIMITS.mediaPerPost.max - draft.media.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${SPACE_COMPOSER_LIMITS.mediaPerPost.max} files.`);
      return;
    }
    setUploading(true);
    try {
      const chosen = Array.from(files).slice(0, room);
      const uploaded: SpaceComposerDraft['media'] = [];
      for (const file of chosen) {
        const url = await uploadSpaceImage(spaceId, file);
        uploaded.push({ url, type: file.type.startsWith('video') ? 'video' : 'image' });
      }
      if (!mountedRef.current) return; // sheet was closed (discarded) while uploading
      setDraft((current) => {
        const media = [...current.media, ...uploaded];
        // A single file is a photo, several are a carousel — inferring saves the
        // user a step they would otherwise have to guess at.
        const kind: SpaceContentKind =
          current.kind === 'TEXT' ? (media.length > 1 ? 'CAROUSEL' : 'PHOTO') : current.kind;
        return { ...current, media, kind };
      });
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async (intent: 'publish' | 'draft' | 'schedule') => {
    const payload: SpaceComposerDraft = {
      ...draft,
      hashtags,
      publishAsDraft: intent === 'draft',
      scheduledFor: intent === 'schedule' ? draft.scheduledFor : null,
    };
    const check = validateComposerDraft(payload, Date.now());
    if (!check.ok) {
      toast.error(check.errors[0]);
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateSpacePost(post.id, { ...payload, ...targetingPayload(tg) } as SpaceComposerDraft);
        toast.success('Post updated');
      } else {
        await createSpacePost(spaceId, (tg.t ? { ...payload, ...targetingPayload(tg) } : payload) as SpaceComposerDraft);
        toast.success(
          intent === 'draft' ? 'Saved as a draft' : intent === 'schedule' ? 'Scheduled' : 'Published to your Space',
        );
      }
      finishedRef.current = true;
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save this post');
    } finally {
      setBusy(false);
    }
  };

  const postingAs = actingAsLabel({ name: space?.name, verificationStatus: space?.verificationStatus });

  return (
    <Sheet
      wide
      title={editing ? 'Edit post' : 'Create a post'}
      onClose={requestClose}
      footer={
        <>
          <ActionButton onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
            {mode === 'edit' ? 'Preview' : 'Back to editing'}
          </ActionButton>
          {canSchedule && draft.scheduledFor && (
            <ActionButton busy={busy} onClick={() => submit('schedule')}>
              <CalendarClock size={14} /> Schedule
            </ActionButton>
          )}
          <ActionButton busy={busy} onClick={() => submit('draft')}>
            Save draft
          </ActionButton>
          {canPublish && !draft.scheduledFor && (
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => submit('publish')} full>
              <Send size={14} /> {editing ? 'Save' : 'Publish'}
            </ActionButton>
          )}
        </>
      }
    >
      {/* §7's mandatory identity line. Present in both modes, never collapsed. */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3"
        style={{ background: `${accent}14`, color: accent }}
      >
        <Sparkles size={14} />
        <span className="text-xs font-extrabold truncate">{postingAs}</span>
      </div>

      {mode === 'preview' ? (
        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            Exactly how visitors will see it
          </p>
          {/* The real header component, not a mock-up of one. */}
          <div className="rounded-3xl overflow-hidden border border-border">
            <SpaceIdentity space={space} activeTab="home" layout="auto" viewMode="public" interactive={false} />
          </div>
          <div className="bg-card border border-border rounded-3xl p-4">
            {draft.text && <p className="text-sm whitespace-pre-wrap break-words">{draft.text}</p>}
            {draft.media.length > 0 && (
              <div className={`mt-3 grid gap-2 ${draft.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {draft.media.map((item, index) => (
                  <img
                    key={`${item.url}-${index}`}
                    src={item.url}
                    alt={item.altText || ''}
                    className="w-full rounded-2xl object-cover max-h-72"
                  />
                ))}
              </div>
            )}
            {draft.kind === 'POLL' && (
              <div className="mt-3 space-y-2">
                {draft.pollOptions.filter(Boolean).map((option, index) => (
                  <div key={index} className="px-3 py-2.5 rounded-xl bg-muted text-sm font-bold">
                    {option}
                  </div>
                ))}
              </div>
            )}
            {draft.linkUrl && (
              <a
                href={draft.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block px-3 py-2.5 rounded-2xl bg-muted text-xs font-bold truncate"
              >
                {draft.linkUrl}
              </a>
            )}
            {hashtags.length > 0 && (
              <p className="mt-2 text-xs font-bold" style={{ color: accent }}>
                {hashtags.map((tag) => `#${tag}`).join(' ')}
              </p>
            )}
            {draft.location && <p className="mt-2 text-[11px] text-muted-foreground">📍 {draft.location}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Post kind */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            {kinds.map((entry) => {
              const Icon = spaceIcon(entry.icon);
              const active = entry.id === draft.kind;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => set({ kind: entry.id })}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition-colors ${
                    active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                  style={active ? { background: accent } : undefined}
                >
                  <Icon size={14} /> {entry.label}
                </button>
              );
            })}
          </div>

          <Field
            label={draft.kind === 'POLL' ? 'Poll question' : 'What do you want to say?'}
            count={`${draft.text.length}/${SPACE_COMPOSER_LIMITS.text.max}`}
          >
            <TextArea
              rows={5}
              value={draft.text}
              maxLength={SPACE_COMPOSER_LIMITS.text.max}
              placeholder={kindDef.label === 'Text' ? 'Share an update with your followers…' : `Describe this ${kindDef.label.toLowerCase()}…`}
              onChange={(event) => set({ text: event.target.value, hashtags: [] })}
            />
          </Field>

          {/* Media */}
          {draft.media.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {draft.media.map((item, index) => (
                <div key={`${item.url}-${index}`} className="relative rounded-2xl overflow-hidden bg-muted">
                  <img src={item.url} alt="" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    aria-label="Remove file"
                    onClick={() => set({ media: draft.media.filter((_, i) => i !== index) })}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-xl bg-black/60 text-white"
                  >
                    <X size={12} />
                  </button>
                  <input
                    value={item.altText || ''}
                    maxLength={SPACE_COMPOSER_LIMITS.altText.max}
                    placeholder="Alt text"
                    onChange={(event) =>
                      set({
                        media: draft.media.map((entry, i) =>
                          i === index ? { ...entry, altText: event.target.value } : entry,
                        ),
                      })
                    }
                    className="w-full px-2 py-1.5 bg-card text-[11px] font-semibold outline-none border-t border-border"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(event) => void pickFiles(event.target.files)}
            />
            <ActionButton size="sm" busy={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={13} /> Add photo or video
            </ActionButton>
            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="text-[11px] font-extrabold text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? 'Hide options' : 'More options'}
            </button>
          </div>

          {draft.kind === 'POLL' && (
            <div className="space-y-2">
              {draft.pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <TextInput
                    value={option}
                    maxLength={SPACE_COMPOSER_LIMITS.pollOption.max}
                    placeholder={`Option ${index + 1}`}
                    onChange={(event) =>
                      set({ pollOptions: draft.pollOptions.map((entry, i) => (i === index ? event.target.value : entry)) })
                    }
                  />
                  {draft.pollOptions.length > SPACE_COMPOSER_LIMITS.pollOptions.min && (
                    <button
                      type="button"
                      aria-label="Remove option"
                      onClick={() => set({ pollOptions: draft.pollOptions.filter((_, i) => i !== index) })}
                      className="p-2 rounded-xl bg-muted text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {draft.pollOptions.length < SPACE_COMPOSER_LIMITS.pollOptions.max && (
                <ActionButton size="sm" onClick={() => set({ pollOptions: [...draft.pollOptions, ''] })}>
                  <Plus size={13} /> Add option
                </ActionButton>
              )}
              <Field label="Poll runs for">
                <select
                  value={String(draft.pollDurationHours ?? 24)}
                  onChange={(event) => set({ pollDurationHours: Number(event.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                >
                  <option value="6">6 hours</option>
                  <option value="24">1 day</option>
                  <option value="72">3 days</option>
                  <option value="168">1 week</option>
                </select>
              </Field>
            </div>
          )}

          {draft.kind === 'LINK' && (
            <Field label="Link" hint="We show a preview card to visitors.">
              <TextInput
                value={draft.linkUrl || ''}
                placeholder="https://"
                onChange={(event) => set({ linkUrl: event.target.value })}
              />
            </Field>
          )}

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Who can see it">
                  <select
                    value={draft.audience}
                    onChange={(event) => set({ audience: event.target.value as SpacePostAudience })}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                  >
                    {audiences.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Audience targeting" hint="Optional. Restrict by age, location, gender or language, or set a feed preference.">
                  <TargetingButton size="md" value={tg} onChange={setTg} align="left" />
                </Field>
                {canSchedule && (
                  <Field
                    label="Schedule for later"
                    hint={`At least ${SPACE_COMPOSER_LIMITS.scheduleMinLeadMinutes} minutes ahead.`}
                  >
                    <TextInput
                      type="datetime-local"
                      value={toLocalInputValue(draft.scheduledFor)}
                      onChange={(event) => set({ scheduledFor: fromLocalInputValue(event.target.value) })}
                    />
                  </Field>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Location">
                  <TextInput
                    value={draft.location || ''}
                    maxLength={200}
                    placeholder="Dhaka, Bangladesh"
                    onChange={(event) => set({ location: event.target.value })}
                  />
                </Field>
                <Field label="Call to action">
                  <select
                    value={draft.ctaType || 'NONE'}
                    onChange={(event) => set({ ctaType: event.target.value === 'NONE' ? null : (event.target.value as any) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm font-semibold outline-none"
                  >
                    {SPACE_CTA_TYPES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {SPACE_CTA_TYPES.find((option) => option.id === draft.ctaType)?.needsUrl && (
                <Field label="Button link">
                  <TextInput
                    value={draft.ctaUrl || ''}
                    placeholder="https://"
                    onChange={(event) => set({ ctaUrl: event.target.value })}
                  />
                </Field>
              )}

              <div className="divide-y divide-border">
                <ToggleRow
                  label="Pin to the top of the Space"
                  checked={draft.pinned}
                  onChange={(next) => set({ pinned: next })}
                  accent={accent}
                />
                <ToggleRow
                  label="Turn off comments"
                  blurb="Nobody can comment on this post."
                  checked={draft.commentsDisabled}
                  onChange={(next) => set({ commentsDisabled: next })}
                  accent={accent}
                />
                <ToggleRow
                  label="Turn off sharing"
                  checked={draft.sharingDisabled}
                  onChange={(next) => set({ sharingDisabled: next })}
                  accent={accent}
                />
                <ToggleRow
                  label="Mark as sensitive"
                  blurb="Media is blurred until a visitor chooses to see it."
                  checked={draft.isSensitive}
                  onChange={(next) => set({ isSensitive: next })}
                  accent={accent}
                />
              </div>
            </div>
          )}

          {!validation.ok && (
            <ul className="rounded-2xl bg-amber-500/10 px-3 py-2.5 space-y-1">
              {validation.errors.map((error) => (
                <li key={error} className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  {error}
                </li>
              ))}
            </ul>
          )}

          {uploading && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </p>
          )}
        </div>
      )}
      <CreatePostUnsavedBar open={confirmLeave} editing={editing} onContinue={() => setConfirmLeave(false)} onDiscard={discardAndClose} />
    </Sheet>
  );
}
