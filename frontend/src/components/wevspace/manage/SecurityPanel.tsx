/**
 * Security & moderation — MP2 §21/§24 and MP3 §4/§8/§23/§24.
 *
 * Six things live here, each loading and failing on its own so one refused
 * permission or one slow query never blanks the screen:
 *
 *   1. what happens to a comment before anyone sees it   (the `moderation` blob)
 *   2. the Space's own filter words                      (WevSpaceKeyword rows)
 *   3. who is restricted, muted or banned                (WevSpaceAudienceFlag)
 *   4. the sensitive entries from the activity log
 *   5. which teammates hold the dangerous permissions    (read-only, Team edits)
 *   6. the signed-in person's devices and sign-ins
 *
 * Three decisions worth knowing about:
 *
 *  - Section 6 is *account* security, not Space security. A WevSpace has no
 *    sessions of its own — people sign in, Spaces do not — so it reads the
 *    platform's own /api/security endpoints, says plainly that it is the account,
 *    and only loads when asked (MP3 §28: nothing loads that was not needed).
 *  - Section 5 shows and never edits. Membership is TeamPanel's to change; two
 *    screens writing the same rows is exactly what MP3 §32 warns against.
 *  - Nothing here is decorative. Every switch, word and sanction on this screen is
 *    read by `screenSpaceComment` on the way in, so what it says is what happens.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Ban,
  BellOff,
  Check,
  Eye,
  History,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import {
  KEYWORD_FILTER_ACTIONS,
  MAX_SPACE_KEYWORDS,
  SPACE_AUDIENCE_SANCTIONS,
  SPACE_KEYWORD_MAX_LEN,
  SPACE_KEYWORD_PRESETS,
  SPACE_PERMISSION_LABELS,
  activeKeywordList,
  defaultModerationSettings,
  permissionsForRole,
} from '@wevsoft/shared/wevspace';
import type {
  KeywordFilterAction,
  SpaceKeywordPresetId,
  SpaceModerationSettings,
  SpacePermission,
  SpaceSanction,
} from '@wevsoft/shared/wevspace';
import {
  addKeywordFilter,
  clearAudienceFlag,
  fetchAudienceFlags,
  fetchKeywordFilters,
  fetchManageActivity,
  fetchSpaceSettings,
  fetchTeam,
  removeKeywordFilter,
  saveSpaceSettings,
  setAudienceFlag,
} from '../../../lib/wevspaceManageApi';
import {
  fetchDeviceSessions,
  fetchLoginHistory,
  revokeDeviceSession,
  type DeviceSessionRow,
  type LoginHistoryRow,
} from '../../../lib/accountSecurityApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonRow,
  Pill,
  SavedTick,
  Select,
  TextArea,
  TextInput,
  ToggleRow,
  confirmAction,
  dateTime,
  num,
  relativeTime,
  statusTone,
} from './manageUi';

/**
 * The activity actions this panel treats as security-relevant. Sent to the server
 * as one comma-separated filter so the count under the list describes the same
 * rows the list is showing.
 */
const SENSITIVE_ACTIONS = [
  'space.published',
  'space.unpublished',
  'space.archived',
  'space.handle_changed',
  'space.visibility_changed',
  'member.invited',
  'member.joined',
  'member.role_changed',
  'member.permissions_changed',
  'member.removed',
  'member.revoked',
  'member.left',
  'moderation.settings_changed',
  'audience.restricted',
  'audience.banned',
  'audience.muted',
  'audience.cleared',
  'follower.removed',
  'settings.updated',
  'features.updated',
  // Audience data leaving the Space is a security event, not an analytics one.
  'insights.exported',
  // Handing the Space to another account is the single most consequential thing
  // that can happen to it, so every step of the offer belongs on this list — an
  // offer that was made and withdrawn is exactly what an owner needs to see.
  'space.ownership_transfer_requested',
  'space.ownership_transfer_cancelled',
  'space.ownership_transfer_declined',
  'space.ownership_transfer_expired',
  'space.ownership_transferred',
  'space.deletion_requested',
  'space.deletion_cancelled',
] as const;

/**
 * Permissions worth reviewing on a security screen: each one either changes who
 * has access, moves money, takes the Space offline, or carries audience data out
 * of it. The rest of the 30 keys are ordinary day-to-day work.
 */
const SENSITIVE_PERMISSIONS: SpacePermission[] = [
  'settings.modify',
  'security.manage',
  'space.publish',
  'monetization.manage',
  'members.manage',
  'team.invite',
  'team.remove',
  'team.role',
  'analytics.export',
  'content.delete',
];

const SANCTION_ICONS: Record<SpaceSanction, React.ReactNode> = {
  RESTRICTED: <UserMinus size={15} />,
  BANNED: <Ban size={15} />,
  MUTED: <BellOff size={15} />,
};

/** `presets` minus the link entry — link holding is one switch below, not two. */
const WORD_PRESETS = SPACE_KEYWORD_PRESETS.filter((preset) => preset.id !== 'links');

function sanctionLabel(sanction: unknown): string {
  return SPACE_AUDIENCE_SANCTIONS.find((entry) => entry.id === sanction)?.label || String(sanction || 'Sanction');
}

function filterActionLabel(action: unknown): string {
  return KEYWORD_FILTER_ACTIONS.find((entry) => entry.id === action)?.label || 'Hold for review';
}

function deviceIcon(device: unknown) {
  const value = String(device || '').toLowerCase();
  if (/iphone|android|mobile|phone/.test(value)) return <Smartphone size={15} />;
  return <Monitor size={15} />;
}

export default function SecurityPanel() {
  const { spaceId, accent, can, goto } = useManage();

  const canReadSettings = can('settings.view');
  const canWriteSettings = can('settings.modify');
  const canModerate = can('comments.moderate');
  const canSanction = can('security.manage');
  const canReadTeam = can('settings.view') || can('team.invite');

  // ── moderation blob ──
  const [moderation, setModeration] = useState<SpaceModerationSettings>(defaultModerationSettings);
  const [moderationLoading, setModerationLoading] = useState(canReadSettings);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  const loadModeration = useCallback(async () => {
    if (!canReadSettings) return;
    setModerationLoading(true);
    setModerationError(null);
    try {
      const res = await fetchSpaceSettings(spaceId);
      setModeration({ ...defaultModerationSettings(), ...(res.settings?.moderation || {}) });
    } catch (err: any) {
      setModerationError(err?.message || 'Could not load the moderation rules');
    } finally {
      setModerationLoading(false);
    }
  }, [canReadSettings, spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void loadModeration();
  }, [loadModeration]);

  /**
   * Flips optimistically, then takes the server's parsed copy as truth. The blob
   * is normalised on save, so keeping the local guess would let this screen drift
   * from what is actually being enforced.
   */
  const saveModeration = useCallback(
    async (patch: Partial<SpaceModerationSettings>, key: string) => {
      const previous = moderation;
      const next = { ...moderation, ...patch };
      setModeration(next);
      setSavingKey(key);
      try {
        const res = await saveSpaceSettings(spaceId, { moderation: next });
        if (res?.settings?.moderation) setModeration({ ...res.settings.moderation });
        setSavedAt(Date.now());
        return true;
      } catch (err: any) {
        setModeration(previous);
        toast.error(err?.message || 'Could not save that');
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [moderation, spaceId],
  );

  // ── keyword rules ──
  const [keywords, setKeywords] = useState<any[]>([]);
  const [keywordLimit, setKeywordLimit] = useState(MAX_SPACE_KEYWORDS);
  const [keywordsLoading, setKeywordsLoading] = useState(canModerate);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  const loadKeywords = useCallback(async () => {
    if (!canModerate) return;
    setKeywordsLoading(true);
    setKeywordsError(null);
    try {
      const res = await fetchKeywordFilters(spaceId);
      setKeywords(Array.isArray(res.keywords) ? res.keywords : []);
      setKeywordLimit(Number(res.limit) || MAX_SPACE_KEYWORDS);
    } catch (err: any) {
      setKeywordsError(err?.message || 'Could not load your filter words');
    } finally {
      setKeywordsLoading(false);
    }
  }, [canModerate, spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void loadKeywords();
  }, [loadKeywords]);

  // ── sanctions ──
  const [flags, setFlags] = useState<any[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [flagsError, setFlagsError] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const res = await fetchAudienceFlags(spaceId);
      setFlags(Array.isArray(res.flags) ? res.flags : []);
    } catch (err: any) {
      setFlagsError(err?.message || 'Could not load the sanction list');
    } finally {
      setFlagsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void loadFlags();
  }, [loadFlags]);

  const activeFlags = useMemo(() => flags.filter((flag) => flag.active), [flags]);

  const wordsWatched = useMemo(() => {
    const all = new Set<string>(activeKeywordList(moderation));
    for (const row of keywords) if (row?.word) all.add(String(row.word));
    return all.size;
  }, [moderation, keywords]);

  const linksHeld = moderation.blockLinks || moderation.presets.includes('links');

  if (moderationLoading && keywordsLoading && flagsLoading) return <PanelSkeleton rows={5} tall />;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Security & moderation"
        blurb="What gets checked before a comment appears, who is blocked from this Space, and every sensitive change made to it."
      />

      {canReadSettings && !canWriteSettings && (
        <div className="flex items-start gap-2.5 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Eye size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
            You can read the moderation rules but not change them. That needs the “Change settings” permission — ask the
            owner or an admin of this Space.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatOrDash
          label="Comment approval"
          value={canReadSettings ? (moderation.requireApproval ? 'Every one' : 'Automatic') : null}
          hint={
            moderation.requireApproval
              ? 'Nothing appears until you approve it'
              : 'Only comments that trip a rule are held'
          }
          icon={<MessageSquare size={16} />}
          accent={accent}
        />
        <StatOrDash
          label="Words watched"
          value={canReadSettings || canModerate ? num(wordsWatched) : null}
          hint="Built-in lists plus your own words and phrases"
          icon={<ShieldCheck size={16} />}
          accent={accent}
        />
        <StatOrDash
          label="People sanctioned"
          value={flagsError ? null : num(activeFlags.length)}
          hint={
            activeFlags.length
              ? `${num(activeFlags.filter((f) => f.sanction === 'BANNED').length)} banned outright`
              : 'Nobody is restricted, muted or banned'
          }
          icon={<Ban size={16} />}
          accent={accent}
        />
      </div>

      {/* 1 — the moderation blob */}
      {!canReadSettings ? (
        <Card>
          <CardTitle>Before a comment appears</CardTitle>
          <PermissionNote need="View settings" what="the Space’s moderation rules" />
        </Card>
      ) : moderationError ? (
        <PanelError message={moderationError} onRetry={() => void loadModeration()} />
      ) : (
        <>
          <Card>
            <CardTitle right={<SavedTick show={savedAt > 0 && !savingKey} />}>Before a comment appears</CardTitle>
            <p className="-mt-1 mb-1 text-xs text-muted-foreground">
              Checked in this order: a sanction on the author, then clearly offensive language, then your own words, then
              links, then whether they follow the Space. The first rule that matches decides.
            </p>
            <div className="divide-y divide-border">
              <ToggleRow
                label="Approve every comment first"
                blurb="Nothing appears on this Space until someone on the team approves it. Slow, but nothing slips through."
                checked={moderation.requireApproval}
                disabled={!canWriteSettings || savingKey === 'requireApproval'}
                accent={accent}
                onChange={(next) => void saveModeration({ requireApproval: next }, 'requireApproval')}
              />
              <ToggleRow
                label="Hide clearly offensive comments"
                blurb="Slurs, direct insults and threats are hidden on arrival and land in your moderation queue. The author keeps their own copy."
                checked={moderation.hideOffensive}
                disabled={!canWriteSettings || savingKey === 'hideOffensive'}
                accent={accent}
                onChange={(next) => void saveModeration({ hideOffensive: next }, 'hideOffensive')}
              />
              <ToggleRow
                label="Hold anything containing a link"
                blurb="Every comment with a web address waits for review. The commonest way spam arrives."
                checked={linksHeld}
                disabled={!canWriteSettings || savingKey === 'blockLinks'}
                accent={accent}
                onChange={(next) =>
                  void saveModeration(
                    {
                      blockLinks: next,
                      // The old "Links" preset did the same job. Clearing it here
                      // keeps one switch in charge, so turning this off cannot
                      // leave link holding quietly running underneath.
                      presets: moderation.presets.filter((preset) => preset !== 'links'),
                    },
                    'blockLinks',
                  )
                }
              />
              <ToggleRow
                label="Hold comments from people who don’t follow"
                blurb="Followers post normally; everyone else waits for review."
                checked={moderation.holdFromNonFollowers}
                disabled={!canWriteSettings || savingKey === 'holdFromNonFollowers'}
                accent={accent}
                onChange={(next) => void saveModeration({ holdFromNonFollowers: next }, 'holdFromNonFollowers')}
              />
            </div>

            <div className="mt-3">
              <Field
                label="When one of your words matches"
                hint={KEYWORD_FILTER_ACTIONS.find((entry) => entry.id === moderation.filterAction)?.blurb}
              >
                <Select
                  value={moderation.filterAction}
                  disabled={!canWriteSettings || savingKey === 'filterAction'}
                  onChange={(event) =>
                    void saveModeration({ filterAction: event.target.value as KeywordFilterAction }, 'filterAction')
                  }
                >
                  {KEYWORD_FILTER_ACTIONS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Words you add below can each override this with their own action.
              </p>
            </div>
          </Card>

          <Card>
            <CardTitle>Built-in lists</CardTitle>
            <p className="-mt-1 mb-1 text-xs text-muted-foreground">
              Ready-made word lists, so the common cases need no typing. They use the action chosen above.
            </p>
            <div className="divide-y divide-border">
              {WORD_PRESETS.map((preset) => (
                <ToggleRow
                  key={preset.id}
                  label={preset.label}
                  blurb={`${preset.blurb} ${preset.words.length} words.`}
                  checked={moderation.presets.includes(preset.id)}
                  disabled={!canWriteSettings || savingKey === `preset:${preset.id}`}
                  accent={accent}
                  onChange={(next) =>
                    void saveModeration(
                      {
                        presets: next
                          ? Array.from(new Set([...moderation.presets, preset.id as SpaceKeywordPresetId]))
                          : moderation.presets.filter((entry) => entry !== preset.id),
                      },
                      `preset:${preset.id}`,
                    )
                  }
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {/* 2 — the Space's own words */}
      <KeywordCard
        spaceId={spaceId}
        accent={accent}
        canModerate={canModerate}
        canWriteSettings={canWriteSettings}
        rows={keywords}
        limit={keywordLimit}
        loading={keywordsLoading}
        error={keywordsError}
        settingsWords={canReadSettings ? moderation.customWords : []}
        settingsAction={moderation.filterAction}
        onReload={loadKeywords}
        onRemoveSettingsWord={(word) =>
          saveModeration(
            { customWords: moderation.customWords.filter((entry) => entry !== word) },
            `customWord:${word}`,
          )
        }
      />

      {/* 3 — restricted, muted, banned */}
      <SanctionsCard
        spaceId={spaceId}
        accent={accent}
        canSanction={canSanction}
        flags={flags}
        loading={flagsLoading}
        error={flagsError}
        onReload={loadFlags}
      />

      {/* 4 — the sensitive slice of the audit trail */}
      <SensitiveActivityCard spaceId={spaceId} accent={accent} onSeeAll={() => goto('activity')} />

      {/* 5 — who holds the dangerous permissions */}
      {canReadTeam ? (
        <TeamAccessCard spaceId={spaceId} accent={accent} onOpenTeam={() => goto('team')} />
      ) : (
        <Card>
          <CardTitle>Who can change things here</CardTitle>
          <PermissionNote need="View settings" what="the team and its permissions" />
        </Card>
      )}

      {/* 6 — the person, not the Space */}
      <AccountSecurityCard accent={accent} />
    </div>
  );
}

/** A tile that shows a dash instead of a number it is not allowed to know. */
function StatOrDash({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string | null;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span style={accent ? { color: accent } : undefined}>{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums">{value ?? '—'}</p>
      {value !== null && hint && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{hint}</p>}
      {value === null && <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">Not available to you</p>}
    </div>
  );
}

function PermissionNote({ need, what }: { need: string; what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-muted p-3">
      <Lock size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
      <p className="text-xs font-semibold text-muted-foreground">
        Seeing {what} needs the “{need}” permission on this Space. Ask the owner if you need it.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2 — filter words
// ──────────────────────────────────────────────────────────────

/**
 * Two sources of words end up in one list, because both are enforced and hiding
 * either one would mean rules running that nobody on this screen can see:
 *  - rows in WevSpaceKeyword, each with its own action (what "add" writes)
 *  - `customWords` on the settings blob, which share the blanket action above
 */
function KeywordCard({
  spaceId,
  accent,
  canModerate,
  canWriteSettings,
  rows,
  limit,
  loading,
  error,
  settingsWords,
  settingsAction,
  onReload,
  onRemoveSettingsWord,
}: {
  spaceId: string;
  accent: string;
  canModerate: boolean;
  canWriteSettings: boolean;
  rows: any[];
  limit: number;
  loading: boolean;
  error: string | null;
  settingsWords: string[];
  settingsAction: KeywordFilterAction;
  onReload: () => Promise<void> | void;
  onRemoveSettingsWord: (word: string) => Promise<boolean>;
}) {
  const [word, setWord] = useState('');
  const [action, setAction] = useState<KeywordFilterAction>('HOLD');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const full = rows.length >= limit;

  const add = async () => {
    const value = word.trim().toLowerCase();
    if (value.length < 2) {
      toast.error('A filter word needs at least two characters.');
      return;
    }
    setAdding(true);
    try {
      await addKeywordFilter(spaceId, { word: value, action });
      setWord('');
      await onReload();
      toast.success(`“${value}” is now ${filterActionLabel(action).toLowerCase()}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not add that word');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (row: any) => {
    setRemoving(row.id);
    try {
      await removeKeywordFilter(row.id);
      await onReload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not remove that word');
    } finally {
      setRemoving(null);
    }
  };

  const removeSettingsWord = async (value: string) => {
    setRemoving(`settings:${value}`);
    try {
      await onRemoveSettingsWord(value);
    } finally {
      setRemoving(null);
    }
  };

  if (!canModerate && settingsWords.length === 0) {
    return (
      <Card>
        <CardTitle>Your own filter words</CardTitle>
        <PermissionNote need="Manage comments" what="this Space’s filter words" />
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle
        right={
          canModerate ? (
            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
              {num(rows.length)} / {num(limit)}
            </span>
          ) : undefined
        }
      >
        Your own filter words
      </CardTitle>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Matched anywhere in a comment, ignoring capitals. Each word can hold, hide or simply flag on its own.
      </p>

      {canModerate && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Word or phrase" count={`${word.trim().length}/${SPACE_KEYWORD_MAX_LEN}`}>
            <TextInput
              value={word}
              maxLength={SPACE_KEYWORD_MAX_LEN}
              placeholder="e.g. free followers"
              disabled={full}
              onChange={(event) => setWord(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void add();
                }
              }}
            />
          </Field>
          <Field label="Then">
            <Select value={action} disabled={full} onChange={(event) => setAction(event.target.value as KeywordFilterAction)}>
              {KEYWORD_FILTER_ACTIONS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="pb-0.5">
            <ActionButton tone="accent" accent={accent} busy={adding} disabled={full} onClick={() => void add()} full>
              <Plus size={15} /> Add
            </ActionButton>
          </div>
        </div>
      )}

      {full && (
        <p className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          This Space is at the {num(limit)}-word limit. Remove one before adding another.
        </p>
      )}

      {loading && rows.length === 0 && <div className="mt-3"><PanelSkeleton rows={2} /></div>}
      {error && <div className="mt-3"><PanelError message={error} onRetry={() => void onReload()} /></div>}

      {!loading && !error && rows.length === 0 && settingsWords.length === 0 && (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-border p-4 text-center">
          <p className="text-xs font-semibold text-muted-foreground">
            No words of your own yet. The built-in lists above are already working.
          </p>
        </div>
      )}

      {(rows.length > 0 || settingsWords.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <li key={row.id} className="inline-flex items-center gap-1.5 rounded-2xl bg-muted pl-3 pr-1 py-1">
              <span className="text-sm font-bold break-all">{row.word}</span>
              <Pill tone={row.action === 'HIDE' ? statusTone('HIDDEN') : undefined} accent={accent}>
                {filterActionLabel(row.action)}
              </Pill>
              {canModerate && (
                <IconButton
                  label={`Remove the filter word ${row.word}`}
                  tone="danger"
                  busy={removing === row.id}
                  onClick={() => void remove(row)}
                >
                  <X size={13} />
                </IconButton>
              )}
            </li>
          ))}
          {settingsWords.map((value) => (
            <li key={`settings:${value}`} className="inline-flex items-center gap-1.5 rounded-2xl bg-muted pl-3 pr-1 py-1">
              <span className="text-sm font-bold break-all">{value}</span>
              <Pill>{filterActionLabel(settingsAction)}</Pill>
              {canWriteSettings && (
                <IconButton
                  label={`Remove the filter word ${value}`}
                  tone="danger"
                  busy={removing === `settings:${value}`}
                  onClick={() => void removeSettingsWord(value)}
                >
                  <X size={13} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 3 — sanctions
// ──────────────────────────────────────────────────────────────

function SanctionsCard({
  spaceId,
  accent,
  canSanction,
  flags,
  loading,
  error,
  onReload,
}: {
  spaceId: string;
  accent: string;
  canSanction: boolean;
  flags: any[];
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [sanction, setSanction] = useState<SpaceSanction>('RESTRICTED');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('0');
  const [busy, setBusy] = useState(false);
  const [lifting, setLifting] = useState<string | null>(null);

  const apply = async () => {
    const handle = username.trim().replace(/^@/, '');
    if (!handle) {
      toast.error('Whose account is this about?');
      return;
    }
    if (reason.trim().length < 4) {
      toast.error('Write a short reason first — it goes in the activity log.');
      return;
    }
    setBusy(true);
    try {
      const duration = Number(days);
      await setAudienceFlag(spaceId, {
        username: handle,
        sanction,
        reason: reason.trim(),
        durationDays: duration > 0 ? duration : undefined,
      });
      toast.success(`${sanctionLabel(sanction)} applied to @${handle}`);
      setUsername('');
      setReason('');
      setDays('0');
      setOpen(false);
      await onReload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not apply that');
    } finally {
      setBusy(false);
    }
  };

  const lift = async (flag: any) => {
    const name = flag.user?.name || `@${flag.user?.username || 'this person'}`;
    if (!confirmAction(`Lift the ${sanctionLabel(flag.sanction).toLowerCase()} on ${name}?`)) return;
    setLifting(flag.id);
    try {
      await clearAudienceFlag(flag.id);
      await onReload();
      toast.success(`Lifted for ${name}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not lift that');
    } finally {
      setLifting(null);
    }
  };

  return (
    <Card>
      <CardTitle
        right={
          canSanction ? (
            <ActionButton size="sm" onClick={() => setOpen((current) => !current)}>
              {open ? 'Close' : 'Add someone'}
            </ActionButton>
          ) : undefined
        }
      >
        Restricted, muted and banned
      </CardTitle>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Applies to this Space only. Nobody is told they have been sanctioned, and none of it touches the person’s
        Wevsoft account.
      </p>

      {open && canSanction && (
        <div className="mb-3 rounded-2xl bg-muted p-3 space-y-3">
          <Field label="Username" hint="The @name on their Wevsoft account.">
            <TextInput
              value={username}
              placeholder="@username"
              autoComplete="off"
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>

          <fieldset>
            <legend className="text-xs font-extrabold mb-1.5">What should happen</legend>
            <div className="space-y-1.5">
              {SPACE_AUDIENCE_SANCTIONS.map((entry) => (
                <label
                  key={entry.id}
                  className={`flex items-start gap-2.5 rounded-2xl border p-2.5 cursor-pointer transition-colors ${
                    sanction === entry.id ? 'border-border bg-card' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="sanction"
                    className="mt-1"
                    checked={sanction === entry.id}
                    onChange={() => setSanction(entry.id)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      <span style={{ color: accent }} aria-hidden="true">
                        {SANCTION_ICONS[entry.id]}
                      </span>
                      {entry.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{entry.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Reason" hint="Stored with the sanction and written to the activity log." count={`${reason.trim().length}/500`}>
            <TextArea
              value={reason}
              rows={2}
              maxLength={500}
              placeholder="Why this is happening"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>

          <Field label="For how long" hint="Leave at 0 to keep it until you lift it yourself.">
            <TextInput
              type="number"
              min={0}
              max={3650}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
          </Field>

          <div className="flex gap-2">
            <ActionButton onClick={() => setOpen(false)}>Cancel</ActionButton>
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void apply()} full>
              Apply
            </ActionButton>
          </div>
        </div>
      )}

      {loading && flags.length === 0 && <PanelSkeleton rows={2} />}
      {error && <PanelError message={error} onRetry={() => void onReload()} />}

      {!loading && !error && flags.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={20} />}
          title="Nobody is sanctioned"
          blurb={
            canSanction
              ? 'You can also restrict, mute or ban someone straight from one of their comments.'
              : 'Restricting people needs the “Manage security” permission.'
          }
        />
      )}

      {flags.length > 0 && (
        <ul className="divide-y divide-border">
          {flags.map((flag) => (
            <li key={flag.id} className={`py-3 first:pt-0 last:pb-0 ${flag.active ? '' : 'opacity-60'}`}>
              <PersonRow
                person={flag.user}
                accent={accent}
                meta={
                  <>
                    @{flag.user?.username || 'unknown'}
                    {flag.reason ? ` · ${flag.reason}` : flag.autoReason ? ` · ${flag.autoReason}` : ''}
                  </>
                }
                right={
                  <>
                    <Pill tone={flag.active ? statusTone(flag.sanction) : statusTone('EXPIRED')}>
                      {flag.active ? sanctionLabel(flag.sanction) : 'Expired'}
                    </Pill>
                    {canSanction && (
                      <IconButton
                        label={`${flag.active ? 'Lift' : 'Clear'} the ${sanctionLabel(flag.sanction).toLowerCase()} on ${
                          flag.user?.name || 'this person'
                        }`}
                        busy={lifting === flag.id}
                        onClick={() => void lift(flag)}
                      >
                        {flag.active ? <Check size={14} /> : <Trash2 size={14} />}
                      </IconButton>
                    )}
                  </>
                }
              />
              <p className="mt-1.5 pl-[52px] text-[11px] text-muted-foreground">
                {sanctionLabel(flag.sanction)} by {flag.createdBy?.name || 'a teammate'} · {relativeTime(flag.createdAt)}
                {flag.expiresAt ? ` · ${flag.active ? 'ends' : 'ended'} ${dateTime(flag.expiresAt)}` : ' · no end date'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 4 — sensitive activity
// ──────────────────────────────────────────────────────────────

/** `member.role_changed` → "Role changed", the same derivation ActivityPanel uses. */
function actionLabel(action: unknown): string {
  const rest = String(action || '').split('.').slice(1).join(' ');
  const words = rest.replace(/_/g, ' ').trim();
  if (!words) return String(action || 'Action');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function SensitiveActivityCard({
  spaceId,
  accent,
  onSeeAll,
}: {
  spaceId: string;
  accent: string;
  onSeeAll: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // One query for the whole set, so the total below counts the same rows the
      // filter selected instead of describing a wider log.
      const res = await fetchManageActivity(spaceId, { limit: 8, action: SENSITIVE_ACTIONS.join(',') });
      setRows(Array.isArray(res.activity) ? res.activity : []);
      setTotal(Number(res.total) || 0);
    } catch (err: any) {
      setError(err?.message || 'Could not load recent security events');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  return (
    <Card>
      <CardTitle
        right={
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {num(total)} {total === 1 ? 'event' : 'events'}
          </span>
        }
      >
        Recent security events
      </CardTitle>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Access, permissions, moderation rules, visibility and data exports. Newest first, and append-only — nothing here
        can be edited or deleted.
      </p>

      {loading && rows.length === 0 && <PanelSkeleton rows={3} />}
      {error && <PanelError message={error} onRetry={() => void load()} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<History size={20} />}
          title="Nothing sensitive has happened"
          blurb="Permission changes, sanctions and rule changes will show up here as soon as they do."
        />
      )}

      {rows.length > 0 && (
        <>
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
                <span
                  className="mt-0.5 inline-grid place-items-center shrink-0 w-8 h-8 rounded-xl bg-muted"
                  style={{ color: accent }}
                  aria-hidden="true"
                >
                  <ShieldAlert size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{row.summary || actionLabel(row.action)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {row.actor?.name || 'Automatic'} · {actionLabel(row.action)}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-muted-foreground" title={dateTime(row.createdAt)}>
                  {relativeTime(row.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          {total > rows.length && (
            <div className="mt-3">
              <ActionButton onClick={onSeeAll} full>
                Open the full activity log
              </ActionButton>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 5 — who holds the dangerous permissions
// ──────────────────────────────────────────────────────────────

/**
 * Read-only on purpose. Roles and per-member overrides are changed on the Team
 * screen; a second editor for the same rows is how two screens end up disagreeing
 * about who is allowed to do what.
 */
function TeamAccessCard({
  spaceId,
  accent,
  onOpenTeam,
}: {
  spaceId: string;
  accent: string;
  onOpenTeam: () => void;
}) {
  const [team, setTeam] = useState<{ owner: any; members: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTeam(spaceId);
      setTeam({ owner: res.owner, members: Array.isArray(res.members) ? res.members : [] });
    } catch (err: any) {
      setError(err?.message || 'Could not load the team');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const holders = useMemo(() => {
    if (!team) return [];
    const out: Array<{ id: string; person: any; role: string; held: SpacePermission[] }> = [];
    for (const member of team.members) {
      if (member.status !== 'ACTIVE') continue;
      const effective = permissionsForRole(member.role, member.permissions);
      const held = SENSITIVE_PERMISSIONS.filter((permission) => effective.includes(permission));
      if (held.length) out.push({ id: member.id, person: member.user, role: member.role, held });
    }
    // Most access first — the row worth reading is the one with the widest reach.
    return out.sort((a, b) => b.held.length - a.held.length);
  }, [team]);

  return (
    <Card>
      <CardTitle right={<ActionButton size="sm" onClick={onOpenTeam}>Open Team</ActionButton>}>
        Who can change things here
      </CardTitle>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Teammates who can change access, take the Space offline, move money or export audience data. Roles are changed
        on the Team screen.
      </p>

      {loading && <PanelSkeleton rows={2} />}
      {error && <PanelError message={error} onRetry={() => void load()} />}

      {!loading && !error && team && (
        <ul className="divide-y divide-border">
          <li className="py-3 first:pt-0">
            <PersonRow
              person={team.owner}
              accent={accent}
              meta={<>@{team.owner?.username || 'owner'} · can do everything, including deleting the Space</>}
              right={<Pill tone={statusTone('ACTIVE')}>Owner</Pill>}
            />
          </li>
          {holders.map((holder) => (
            <li key={holder.id} className="py-3 last:pb-0">
              <PersonRow
                person={holder.person}
                accent={accent}
                meta={<>@{holder.person?.username || 'unknown'}</>}
                right={<Pill accent={accent}>{holder.role.charAt(0) + holder.role.slice(1).toLowerCase()}</Pill>}
              />
              <div className="mt-1.5 pl-[52px] flex flex-wrap gap-1">
                {holder.held.map((permission) => (
                  <Pill key={permission}>{SPACE_PERMISSION_LABELS[permission]}</Pill>
                ))}
              </div>
            </li>
          ))}
          {holders.length === 0 && (
            <li className="py-3 last:pb-0">
              <p className="text-xs font-semibold text-muted-foreground">
                No teammate holds any of these. Only you can change access, publishing, money or exports.
              </p>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// 6 — the account behind the Space
// ──────────────────────────────────────────────────────────────

/**
 * A refused confirmation is not a refused sign-in. Reading `reauth_failed` as
 * "Failed" would send somebody hunting for a break-in that never happened, so the
 * two get different words (MP4 §10).
 */
function historyLabel(status: unknown): string {
  const value = String(status || '');
  if (value === 'success') return 'Signed in';
  if (value === 'reauth_failed') return 'Confirmation failed';
  return 'Failed';
}

/**
 * Deliberately about the *person*, not the Space, and labelled as such: MP2 §9's
 * rule that the two identities never blur applies to security too. It loads only
 * when asked, because a Space dashboard should not be fetching account history
 * nobody opened (MP3 §28).
 */
function AccountSecurityCard({ accent }: { accent: string }) {
  const [shown, setShown] = useState(false);
  const [sessions, setSessions] = useState<DeviceSessionRow[]>([]);
  const [history, setHistory] = useState<LoginHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSessions, nextHistory] = await Promise.all([fetchDeviceSessions(), fetchLoginHistory()]);
      setSessions(Array.isArray(nextSessions) ? nextSessions : []);
      setHistory(Array.isArray(nextHistory) ? nextHistory : []);
    } catch (err: any) {
      setError(err?.message || 'Could not load your account security');
    } finally {
      setLoading(false);
    }
  }, []);

  const reveal = () => {
    setShown(true);
    void load();
  };

  const revoke = async (session: DeviceSessionRow) => {
    if (session.isCurrent) {
      toast.error('That is the device you are using. Sign out instead.');
      return;
    }
    if (!confirmAction(`Sign out ${session.device || 'that device'}? It will need your password again.`)) return;
    setRevoking(session.id);
    try {
      await revokeDeviceSession(session.id);
      setSessions((current) => current.filter((row) => row.id !== session.id));
      toast.success('That device has been signed out');
    } catch (err: any) {
      toast.error(err?.message || 'Could not sign that device out');
    } finally {
      setRevoking(null);
    }
  };

  const failed = history.filter((row) => row.status !== 'success').length;

  return (
    <Card>
      <CardTitle
        right={
          shown ? (
            <ActionButton size="sm" onClick={() => void load()} busy={loading}>
              Refresh
            </ActionButton>
          ) : undefined
        }
      >
        Your account security
      </CardTitle>
      <div className="flex items-start gap-2.5 rounded-2xl bg-muted p-3">
        <KeyRound size={15} className="mt-0.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
        <p className="text-xs font-semibold text-muted-foreground">
          This part is about <b className="font-extrabold text-foreground">your Wevsoft account</b>, not this Space.
          Signing a device out here signs it out of everything you use Wevsoft for. Your teammates each have their own.
        </p>
      </div>

      {!shown ? (
        <div className="mt-3">
          <ActionButton onClick={reveal} full>
            <Lock size={15} /> Show my devices and sign-ins
          </ActionButton>
        </div>
      ) : (
        <>
          {loading && sessions.length === 0 && history.length === 0 && (
            <div className="mt-3">
              <PanelSkeleton rows={3} />
            </div>
          )}
          {error && (
            <div className="mt-3">
              <PanelError message={error} onRetry={() => void load()} />
            </div>
          )}

          {!error && (
            <>
              <p className="mt-4 mb-2 text-xs font-extrabold">Signed in right now</p>
              {sessions.length === 0 && !loading ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">
                    No other device sessions are on record for your account.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sessions.map((session) => (
                    <li key={session.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center gap-3">
                      <span
                        className="inline-grid place-items-center shrink-0 w-9 h-9 rounded-2xl bg-muted"
                        style={{ color: accent }}
                        aria-hidden="true"
                      >
                        {deviceIcon(session.device)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">
                          {session.device || 'Unknown device'}
                          {session.isCurrent && (
                            <span className="ml-1.5 align-middle">
                              <Pill tone={statusTone('ACTIVE')}>This device</Pill>
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                          {session.ipAddress || 'no address recorded'} · active {relativeTime(session.lastActive)}
                        </p>
                      </div>
                      {!session.isCurrent && (
                        <IconButton
                          label={`Sign out ${session.device || 'this device'}`}
                          tone="danger"
                          busy={revoking === session.id}
                          onClick={() => void revoke(session)}
                        >
                          <LogOut size={14} />
                        </IconButton>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 mb-2 text-xs font-extrabold">Recent sign-in attempts</p>
              {failed > 0 && (
                <div className="mb-2 flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {failed === 1 ? 'One attempt' : `${num(failed)} attempts`} in this list did not go through. If none
                    of them were you, change your password. A “confirmation failed” line means someone with your
                    session open could not prove they were you before doing something irreversible.
                  </p>
                </div>
              )}
              {history.length === 0 && !loading ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground">No sign-in history recorded yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {history.map((row) => (
                    <li key={row.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-3">
                      <Pill tone={row.status === 'success' ? statusTone('ACTIVE') : statusTone('FAILED')}>
                        {historyLabel(row.status)}
                      </Pill>
                      <span className="min-w-0 flex-1 text-[11px] font-semibold text-muted-foreground truncate">
                        {row.device || 'Unknown device'} · {row.ipAddress || 'no address recorded'}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-muted-foreground" title={dateTime(row.createdAt)}>
                        {relativeTime(row.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                The newest {num(history.length)} attempts. Passwords and two-factor sign-in are changed in your account
                settings.
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}
