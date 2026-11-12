/**
 * Settings — MP2 §21 and MP3 §28/§35.
 *
 * This panel is deliberately narrow. Four other screens already own parts of the
 * settings blob, and duplicating a switch here would mean two controls writing
 * the same field with no way to tell which one won:
 *
 *   moderation   → Security panel        notifications → Notifications panel
 *   monetization → Monetization panel    look/tabs/CTA/hours → the edit drawer
 *
 * So what lives here is the `controls` section, who can see the Space, the
 * publishing lifecycle, and signposts to the real owner of everything else.
 *
 * Two rules the code follows throughout:
 *  - a switch flips optimistically, then takes the server's parsed copy as truth
 *    and rolls back if the write failed. The stored blob is normalised on save,
 *    so trusting the local value would let the UI drift from the database.
 *  - nothing is shown that the backend does not actually do. The delete copy says
 *    plainly that removal is immediate, because it is — there is no grace period
 *    or export yet, and pretending otherwise is worse than the missing feature.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Archive,
  Bell,
  Clock,
  Clock3,
  Coins,
  Compass,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  Lock,
  MessageSquare,
  Palette,
  Rocket,
  RotateCcw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  SPACE_DELETION_CONSEQUENCES,
  SPACE_DELETION_GRACE_DAYS,
  SPACE_DELETION_PRESERVED,
  SPACE_OWNERSHIP_TRANSFER_SENDER_EFFECTS,
  SPACE_OWNERSHIP_TRANSFER_STATUS_LABELS,
  SPACE_OWNERSHIP_TRANSFER_TTL_DAYS,
  SPACE_VISIBILITIES,
  SPACE_VISIBILITY_LABELS,
  defaultControlSettings,
  normalizeTimezone,
  ownershipTransferCountdown,
  spaceDashboardPath,
  spaceDeletionState,
  spacePublicPath,
  spaceStatusLabel,
} from '@wevsoft/shared/wevspace';
import type {
  SpaceControlSettings,
  SpaceDashboardSection,
  SpaceDeletionState,
  SpaceVisibility,
} from '@wevsoft/shared/wevspace';
import { fetchSpaceSettings, saveSpaceSettings } from '../../../lib/wevspaceManageApi';
import {
  archiveSpace,
  cancelSpaceDeletion,
  cancelSpaceTransfer,
  downloadSpaceExport,
  fetchSpaceTransfers,
  publishSpace,
  requestSpaceDeletion,
  requestSpaceTransfer,
  unpublishSpace,
  updateSpace,
} from '../../../lib/wevspaceApi';
import type { SpaceOwnershipTransfer } from '../../../lib/wevspaceApi';
import { ConfirmIdentitySheet, isConfirmCancelled, useIdentityConfirmation } from './ConfirmIdentitySheet';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  Field,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonRow,
  Pill,
  SavedTick,
  Sheet,
  StatTile,
  TextArea,
  TextInput,
  ToggleRow,
  dateTime,
  statusTone,
} from './manageUi';

/**
 * The `controls` switches, in the order they read most sensibly on screen.
 *
 * `allowMentions` is deliberately absent: nothing on Wevsoft can tag a Space in
 * someone else's post yet, so the switch would have nothing to switch off. The
 * stored field stays (harmless, and already defaulted) and the row appears the
 * day Space mentions ship.
 */
const INTERACTION_SWITCHES: Array<{
  id: keyof SpaceControlSettings;
  label: string;
  blurb: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'allowComments',
    label: 'Allow comments',
    blurb: 'Off closes comments on everything this Space posts. Comments already left stay stored but hidden from the form.',
    icon: <MessageSquare size={15} />,
  },
  {
    id: 'allowSharing',
    label: 'Allow sharing',
    blurb: 'Off removes the share and repost actions from this Space’s content.',
    icon: <Share2 size={15} />,
  },
  {
    id: 'allowMessageRequests',
    label: 'Accept message requests',
    blurb: 'Off means only people this Space has already replied to can start a conversation.',
    icon: <Inbox size={15} />,
  },
];

const VISIBILITY_ICONS: Record<SpaceVisibility, React.ReactNode> = {
  public: <Globe size={15} />,
  followers: <Users size={15} />,
  private: <Lock size={15} />,
};

const VISIBILITY_BLURBS: Record<SpaceVisibility, string> = {
  public: 'Anyone can open the Space, including people who are not signed in.',
  followers: 'Visitors see the header and can follow, but content is held back until they do.',
  private: 'Nobody outside the owner and the team can open it. Links stop working for everyone else.',
};

/**
 * The browser's own zone list when it has one. Older engines lack
 * `Intl.supportedValuesOf`, so the field falls back to free text validated by the
 * same `normalizeTimezone` the server uses — never an offset, which goes stale
 * twice a year.
 */
function timezoneOptions(): string[] {
  try {
    const supported = (Intl as any)?.supportedValuesOf;
    if (typeof supported !== 'function') return [];
    const zones = supported.call(Intl, 'timeZone');
    return Array.isArray(zones) ? (zones as string[]) : [];
  } catch {
    return [];
  }
}

function clockIn(timezone: string, at: number): string | null {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(at));
  } catch {
    return null;
  }
}

export default function SettingsPanel() {
  const { space, spaceId, handle, accent, isOwner, features, can, refresh } = useManage();
  const navigate = useNavigate();

  const [controls, setControls] = useState<SpaceControlSettings>(defaultControlSettings);
  const [canModify, setCanModify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSpaceSettings(spaceId);
      setControls({ ...defaultControlSettings(), ...(res.settings?.controls || {}) });
      setCanModify(Boolean(res.canModify));
    } catch (err: any) {
      setError(err?.message || 'Could not load these settings');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  /** Writes one section of the blob; sibling sections are left untouched. */
  const saveControls = useCallback(
    async (patch: Partial<SpaceControlSettings>, key: string) => {
      const previous = controls;
      const next = { ...controls, ...patch };
      setControls(next);
      setBusy(key);
      try {
        const res = await saveSpaceSettings(spaceId, { controls: next });
        if (res?.settings?.controls) setControls({ ...res.settings.controls });
        setSavedAt(Date.now());
        return true;
      } catch (err: any) {
        // Put the switch back where it was — leaving it flipped would claim a
        // change the database never took.
        setControls(previous);
        toast.error(err?.message || 'Could not save that');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [controls, spaceId],
  );

  if (loading) return <PanelSkeleton rows={5} tall />;
  if (error) return <PanelError message={error} onRetry={() => void load()} />;

  const readOnly = !canModify;

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Settings"
        blurb="How this Space behaves, who can see it, and whether it is published."
        actions={
          <a
            href={spacePublicPath(handle)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={14} /> Open public Space
          </a>
        }
      />

      {readOnly && (
        <div className="flex items-start gap-2.5 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Eye size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
            You can read these settings but not change them. Changing settings needs the “Change settings” permission —
            ask the owner or an admin of this Space.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Status"
          value={spaceStatusLabel(space?.status || 'DRAFT')}
          hint={space?.status === 'PUBLISHED' ? 'Visible to visitors' : 'Not visible to visitors'}
          icon={space?.status === 'PUBLISHED' ? <Rocket size={16} /> : <EyeOff size={16} />}
          accent={accent}
        />
        <StatTile
          label="Who can see it"
          value={visibilityShort(space?.visibility)}
          hint={VISIBILITY_BLURBS[normalizeVisibility(space?.visibility)]}
          icon={VISIBILITY_ICONS[normalizeVisibility(space?.visibility)]}
          accent={accent}
        />
        <StatTile
          label="In Discover"
          value={space?.discoverable === false ? 'Hidden' : 'Listed'}
          hint={
            space?.discoverable === false
              ? 'Left out of Explore and recommendations'
              : 'Can appear in Explore and search'
          }
          icon={<Compass size={16} />}
          accent={accent}
        />
      </div>

      <VisibilityCard
        space={space}
        spaceId={spaceId}
        accent={accent}
        canEdit={can('space.edit')}
        controls={controls}
        busy={busy}
        readOnly={readOnly}
        onSaveControls={saveControls}
        onChanged={refresh}
      />

      <Card>
        <CardTitle right={<SavedTick show={savedAt > 0 && !busy} />}>What visitors can do</CardTitle>
        <div className="divide-y divide-border">
          {INTERACTION_SWITCHES.map((switchDef) => (
            <div key={switchDef.id} className="py-1 first:pt-0 last:pb-0">
              <ToggleRow
                label={switchDef.label}
                blurb={switchDef.blurb}
                checked={Boolean(controls[switchDef.id])}
                disabled={readOnly || busy === switchDef.id}
                accent={accent}
                onChange={(next) => void saveControls({ [switchDef.id]: next } as Partial<SpaceControlSettings>, switchDef.id)}
              />
            </div>
          ))}
        </div>
        {!features?.messaging && (
          <p className="mt-3 rounded-2xl bg-muted p-3 text-[11px] font-semibold text-muted-foreground">
            Messaging is switched off for this Space entirely, so the inbox is closed no matter what “Accept message
            requests” says. Turn messaging back on from{' '}
            <a href={`${spacePublicPath(handle)}?edit=1`} className="font-extrabold underline">
              Edit Space → Customize
            </a>
            .
          </p>
        )}
      </Card>

      <ClockCard
        controls={controls}
        accent={accent}
        readOnly={readOnly}
        busy={busy}
        onSaveControls={saveControls}
      />

      <ElsewhereCard handle={handle} accent={accent} />

      <LifecycleCard space={space} spaceId={spaceId} accent={accent} canPublish={can('space.publish')} isOwner={isOwner} onChanged={refresh} />

      {isOwner && (
        <TransferOwnershipCard
          space={space}
          spaceId={spaceId}
          handle={handle}
          name={space?.name || 'this Space'}
          accent={accent}
          onChanged={refresh}
        />
      )}

      {isOwner && (
        <DangerCard
          space={space}
          spaceId={spaceId}
          handle={handle}
          name={space?.name || 'this Space'}
          accent={accent}
          onChanged={refresh}
          onDeleted={() => navigate('/spaces')}
        />
      )}
    </div>
  );
}

function normalizeVisibility(value: unknown): SpaceVisibility {
  return (SPACE_VISIBILITIES as readonly string[]).includes(String(value))
    ? (String(value) as SpaceVisibility)
    : 'public';
}

function visibilityShort(value: unknown): string {
  const key = normalizeVisibility(value);
  if (key === 'public') return 'Everyone';
  if (key === 'followers') return 'Followers';
  return 'Team only';
}

// ──────────────────────────────────────────────────────────────
// Visibility
// ──────────────────────────────────────────────────────────────

function VisibilityCard({
  space,
  spaceId,
  accent,
  canEdit,
  controls,
  busy,
  readOnly,
  onSaveControls,
  onChanged,
}: {
  space: any;
  spaceId: string;
  accent: string;
  canEdit: boolean;
  controls: SpaceControlSettings;
  busy: string | null;
  readOnly: boolean;
  onSaveControls: (patch: Partial<SpaceControlSettings>, key: string) => Promise<boolean>;
  onChanged: () => Promise<void>;
}) {
  // Visibility lives on the Space row, not in the settings blob, so it is saved
  // through updateSpace and re-read from the shell rather than kept here.
  const stored = normalizeVisibility(space?.visibility);
  const [visibility, setVisibility] = useState<SpaceVisibility>(stored);
  const [discoverable, setDiscoverable] = useState<boolean>(space?.discoverable !== false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setVisibility(normalizeVisibility(space?.visibility));
    setDiscoverable(space?.discoverable !== false);
  }, [space?.visibility, space?.discoverable]);

  const save = async (patch: Record<string, unknown>, key: string) => {
    setSaving(key);
    try {
      await updateSpace(spaceId, patch);
      await onChanged();
    } catch (err: any) {
      // Roll the local copy back to what the shell still believes.
      setVisibility(normalizeVisibility(space?.visibility));
      setDiscoverable(space?.discoverable !== false);
      toast.error(err?.message || 'Could not save that');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardTitle right={canEdit ? undefined : <Pill>Read only</Pill>}>Who can see this Space</CardTitle>

      <div className="space-y-2">
        {SPACE_VISIBILITIES.map((option) => {
          const active = visibility === option;
          return (
            <button
              key={option}
              type="button"
              disabled={!canEdit || saving === 'visibility'}
              onClick={() => {
                if (active) return;
                setVisibility(option);
                void save({ visibility: option }, 'visibility');
              }}
              aria-pressed={active}
              className="w-full flex items-start gap-3 text-left p-3 rounded-2xl border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={active ? { borderColor: accent, background: `${accent}12` } : { borderColor: 'var(--border)' }}
            >
              <span
                className="mt-0.5 inline-grid place-items-center shrink-0 w-8 h-8 rounded-xl bg-muted"
                style={{ color: active ? accent : undefined }}
                aria-hidden="true"
              >
                {VISIBILITY_ICONS[option]}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{SPACE_VISIBILITY_LABELS[option]}</span>
                <span className="block mt-0.5 text-xs text-muted-foreground">{VISIBILITY_BLURBS[option]}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 divide-y divide-border">
        <div className="py-1 first:pt-0">
          <ToggleRow
            label="List this Space in Discover and search"
            blurb={
              visibility === 'public'
                ? 'Off keeps the Space reachable by its link but leaves it out of Explore, recommendations and search results.'
                : 'Only affects a public Space — while visibility is restricted it is already left out of Discover.'
            }
            checked={discoverable}
            disabled={!canEdit || saving === 'discoverable' || visibility !== 'public'}
            accent={accent}
            onChange={(next) => {
              setDiscoverable(next);
              void save({ discoverable: next }, 'discoverable');
            }}
          />
        </div>
        <div className="py-1">
          <ToggleRow
            label="Show the follower count"
            blurb="Hides the number everywhere visitors meet this Space — the header, result cards and Discover rows. The team still sees it in this dashboard."
            checked={controls.showFollowerCount}
            disabled={readOnly || busy === 'showFollowerCount'}
            accent={accent}
            onChange={(next) => void onSaveControls({ showFollowerCount: next }, 'showFollowerCount')}
          />
        </div>
        <div className="py-1 last:pb-0">
          <ToggleRow
            label="Show who follows this Space"
            blurb="Off hides the follower list from visitors. Followers themselves are never notified either way."
            checked={controls.showFollowerList}
            disabled={readOnly || busy === 'showFollowerList'}
            accent={accent}
            onChange={(next) => void onSaveControls({ showFollowerList: next }, 'showFollowerList')}
          />
        </div>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Clock and inbox housekeeping
// ──────────────────────────────────────────────────────────────

function ClockCard({
  controls,
  accent,
  readOnly,
  busy,
  onSaveControls,
}: {
  controls: SpaceControlSettings;
  accent: string;
  readOnly: boolean;
  busy: string | null;
  onSaveControls: (patch: Partial<SpaceControlSettings>, key: string) => Promise<boolean>;
}) {
  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  const zones = useMemo(timezoneOptions, []);
  const detected = useMemo(() => {
    try {
      return new Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  }, []);

  const [timezone, setTimezone] = useState(controls.timezone);
  const [days, setDays] = useState(String(controls.autoArchiveResolvedDays || 0));
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setTimezone(controls.timezone);
    setDays(String(controls.autoArchiveResolvedDays || 0));
  }, [controls.timezone, controls.autoArchiveResolvedDays]);

  // Keeps the sample clock honest without a per-second re-render.
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const cleanZone = normalizeTimezone(timezone);
  const zoneRejected = timezone.trim().length > 0 && !cleanZone;
  const preview = clockIn(cleanZone, tick);
  const zoneUnknown = Boolean(cleanZone) && !preview;

  const daysNumber = Number(days);
  const daysInvalid = !Number.isInteger(daysNumber) || daysNumber < 0 || daysNumber > 365;

  const zoneDirty = cleanZone !== controls.timezone;
  const daysDirty = !daysInvalid && daysNumber !== controls.autoArchiveResolvedDays;

  return (
    <Card>
      <CardTitle>This Space’s clock</CardTitle>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Time zone"
          error={zoneRejected ? 'Use a zone name such as Asia/Dhaka — not an offset like +06:00.' : undefined}
          hint={
            zoneRejected
              ? undefined
              : 'Opening hours and the away message are read in this zone. Empty means the server’s clock.'
          }
        >
          {zones.length > 0 ? (
            <>
              <TextInput
                list="wevspace-timezones"
                value={timezone}
                placeholder={detected || 'Region/City'}
                onChange={(event) => setTimezone(event.target.value)}
                disabled={readOnly}
              />
              <datalist id="wevspace-timezones">
                {zones.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </>
          ) : (
            <TextInput
              value={timezone}
              placeholder={detected || 'Region/City'}
              onChange={(event) => setTimezone(event.target.value)}
              disabled={readOnly}
            />
          )}
        </Field>

        <Field
          label="Archive resolved conversations after"
          error={daysInvalid ? 'A whole number of days from 0 to 365.' : undefined}
          hint={
            daysInvalid
              ? undefined
              : daysNumber === 0
                ? 'Zero keeps resolved conversations in the Resolved folder indefinitely.'
                : `A conversation marked resolved moves to Archived ${daysNumber} ${daysNumber === 1 ? 'day' : 'days'} later. Nothing is deleted.`
          }
        >
          <TextInput
            type="number"
            min={0}
            max={365}
            value={days}
            onChange={(event) => setDays(event.target.value)}
            disabled={readOnly}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-muted p-3">
        <Clock size={15} className="shrink-0 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground">
          {zoneUnknown ? (
            <>
              This browser does not recognise <span className="font-extrabold">{cleanZone}</span>. It will still be
              saved, and the server decides whether it is a real zone.
            </>
          ) : (
            <>
              It is <span className="font-extrabold text-foreground">{preview}</span>{' '}
              {cleanZone ? `in ${cleanZone}` : 'where you are — this Space has no zone of its own yet'}.
            </>
          )}
        </p>
      </div>

      {(zoneDirty || daysDirty) && !readOnly && (
        <div className="mt-3 flex items-center gap-2">
          <ActionButton
            accent={accent}
            busy={busy === 'clock'}
            disabled={zoneRejected || daysInvalid}
            onClick={() =>
              void onSaveControls(
                {
                  ...(zoneDirty ? { timezone: cleanZone } : {}),
                  ...(daysDirty ? { autoArchiveResolvedDays: daysNumber } : {}),
                },
                'clock',
              )
            }
          >
            Save clock settings
          </ActionButton>
          <ActionButton
            tone="ghost"
            onClick={() => {
              setTimezone(controls.timezone);
              setDays(String(controls.autoArchiveResolvedDays || 0));
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Undo2 size={14} /> Undo
            </span>
          </ActionButton>
        </div>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// Signposts
// ──────────────────────────────────────────────────────────────

function ElsewhereCard({ handle, accent }: { handle: string; accent: string }) {
  const rows: Array<{
    icon: React.ReactNode;
    label: string;
    blurb: string;
    to: string;
  }> = [
    {
      icon: <Palette size={15} />,
      label: 'Name, look, tabs, buttons and opening hours',
      blurb: 'Identity, accent colour, which tabs visitors see, the call-to-action button and business hours.',
      to: `${spacePublicPath(handle)}?edit=1`,
    },
    {
      icon: <ShieldAlert size={15} />,
      label: 'Moderation and security',
      blurb: 'Comment approval, blocked words, restricted people and the Space’s security events.',
      to: dashPath(handle, 'security'),
    },
    {
      icon: <Bell size={15} />,
      label: 'Notifications',
      blurb: 'What this Space alerts the team about, and where those alerts go.',
      to: dashPath(handle, 'notifications'),
    },
    {
      icon: <Coins size={15} />,
      label: 'Money',
      blurb: 'Currency, what this Space charges for, the ledger and payouts.',
      to: dashPath(handle, 'monetization'),
    },
    {
      icon: <Users size={15} />,
      label: 'Team and permissions',
      blurb: 'Who helps run the Space and exactly what each person is allowed to do.',
      to: dashPath(handle, 'team'),
    },
  ];

  return (
    <Card>
      <CardTitle>Settings that live elsewhere</CardTitle>
      <p className="-mt-1 mb-3 text-xs text-muted-foreground">
        Each of these is edited in one place only, so two screens can never disagree about what is switched on.
      </p>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <Link
            key={row.label}
            to={row.to}
            // Other dashboard sections are tab switches (replace); the public
            // Space editor is a real page change (push).
            replace={row.to.includes('/manage')}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 group"
          >
            <span
              className="mt-0.5 inline-grid place-items-center shrink-0 w-9 h-9 rounded-2xl bg-muted"
              style={{ color: accent }}
              aria-hidden="true"
            >
              {row.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold group-hover:underline">{row.label}</span>
              <span className="block mt-0.5 text-xs text-muted-foreground">{row.blurb}</span>
            </span>
            <ExternalLink size={14} className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

function dashPath(handle: string, section: SpaceDashboardSection): string {
  return spaceDashboardPath(handle, section);
}

// ──────────────────────────────────────────────────────────────
// Publishing
// ──────────────────────────────────────────────────────────────

function LifecycleCard({
  space,
  spaceId,
  accent,
  canPublish,
  isOwner,
  onChanged,
}: {
  space: any;
  spaceId: string;
  accent: string;
  canPublish: boolean;
  isOwner: boolean;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const status = String(space?.status || 'DRAFT');
  const allowed = isOwner || canPublish;
  // Archive is the one action on this card the server challenges (MP4 §10): it takes
  // the whole Space dark at once. Publish and unpublish are a switch you can flip
  // straight back, so they are deliberately not gated — a password prompt on routine
  // work teaches people to type it without looking.
  const confirmation = useIdentityConfirmation();

  const run = async (kind: 'publish' | 'unpublish' | 'archive') => {
    setBusy(kind);
    try {
      if (kind === 'publish') await publishSpace(spaceId);
      else if (kind === 'unpublish') await unpublishSpace(spaceId);
      else await confirmation.run((confirm) => archiveSpace(spaceId, confirm));
      await onChanged();
      toast.success(
        kind === 'publish'
          ? 'Published — visitors can open this Space now'
          : kind === 'unpublish'
            ? 'Back to draft — only you and your team can see it'
            : 'Archived. Nothing was deleted, and you can bring it back at any time.',
      );
    } catch (err: any) {
      // Backing out of the confirmation is a decision, not a failure.
      if (!isConfirmCancelled(err)) toast.error(err?.message || 'Could not change the publishing state');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} accent={accent} />
    <Card>
      <CardTitle right={<Pill tone={statusTone(status)}>{spaceStatusLabel(status)}</Pill>}>Publishing</CardTitle>

      {status === 'SUSPENDED' ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
            <p>A Wevsoft reviewer suspended this Space.</p>
            <p className="mt-1 font-semibold">
              Publishing is locked until the suspension is lifted — the owner cannot lift it, and nothing here can
              either. Your content and settings are untouched in the meantime.
            </p>
          </div>
        </div>
      ) : status === 'PENDING_DELETION' ? (
        // §6. No publish button here, because the server refuses it: an owner who
        // wants this Space back has one thing to do, and it is in the card below.
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="text-xs font-bold text-red-600 dark:text-red-400">
            <p>This Space is scheduled for deletion, so publishing is switched off.</p>
            <p className="mt-1 font-semibold">
              Cancel the deletion under “Deletion scheduled” below and publishing works again straight away.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="-mt-1 text-xs text-muted-foreground">
            {status === 'PUBLISHED'
              ? 'This Space is live. Unpublishing hides it from visitors immediately and keeps everything you have made.'
              : status === 'ARCHIVED'
                ? 'This Space is archived: hidden from everyone, with all of its content still stored. Publishing brings it straight back.'
                : 'This Space is a draft. Only you and your team can open it until you publish.'}
          </p>

          {!allowed ? (
            <p className="mt-3 rounded-2xl bg-muted p-3 text-[11px] font-semibold text-muted-foreground">
              You do not have permission to publish or unpublish this Space.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {status !== 'PUBLISHED' && (
                <ActionButton accent={accent} busy={busy === 'publish'} onClick={() => void run('publish')}>
                  <span className="inline-flex items-center gap-1.5">
                    <Rocket size={14} /> {status === 'ARCHIVED' ? 'Bring back and publish' : 'Publish'}
                  </span>
                </ActionButton>
              )}
              {status === 'PUBLISHED' && (
                <ActionButton busy={busy === 'unpublish'} onClick={() => void run('unpublish')}>
                  <span className="inline-flex items-center gap-1.5">
                    <EyeOff size={14} /> Unpublish
                  </span>
                </ActionButton>
              )}
              {status !== 'ARCHIVED' && isOwner && (
                <ActionButton busy={busy === 'archive'} onClick={() => void run('archive')}>
                  <span className="inline-flex items-center gap-1.5">
                    <Archive size={14} /> Archive
                  </span>
                </ActionButton>
              )}
            </div>
          )}

          {status !== 'ARCHIVED' && isOwner && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Archiving is the reversible option: it hides the Space from everyone and keeps every post, follower and
              message. Only the owner can archive, and only the owner can bring it back.
            </p>
          )}
        </>
      )}
    </Card>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Deletion (§6)
// ──────────────────────────────────────────────────────────────

/** "in 12 days" / "in 6 hours" / "today" — the owner reads a distance, not a diff. */
function deletionCountdown(state: SpaceDeletionState): string {
  if (state.overdue) return 'any moment now';
  if (state.daysLeft >= 1) return `in ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`;
  if (state.hoursLeft >= 1) return `in ${state.hoursLeft} ${state.hoursLeft === 1 ? 'hour' : 'hours'}`;
  return 'in under an hour';
}

function deletionDateLabel(iso: string | null): string {
  if (!iso) return 'a date we could not read';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return 'a date we could not read';
  return at.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * §6's owner surface: deactivate is one card up (Archive), this one is the request,
 * the countdown and the way back out.
 *
 * Two states, never both: a Space already scheduled shows the countdown and a
 * cancel button and no way to re-request; anything else shows the consequences and
 * the confirmation. The consequence text comes from `SPACE_DELETION_CONSEQUENCES`
 * rather than being written here, so the sheet and any future surface cannot
 * describe different outcomes for the same action.
 */
function DangerCard({
  space,
  spaceId,
  handle,
  name,
  accent,
  onChanged,
  onDeleted,
}: {
  space: any;
  spaceId: string;
  handle: string;
  name: string;
  accent: string;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'request' | 'cancel' | 'export' | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  // Typing the handle proves you meant this Space; the server's challenge proves you
  // are the account holder. Neither replaces the other, so both run (MP4 §10).
  const confirmation = useIdentityConfirmation();

  // Derived from the row the server sent, not from local state: after a cancel the
  // refreshed payload is what decides which half of this card renders.
  //
  // `space.deletion` is the computed field on the serialized payload; the raw
  // `deletion*` columns it was computed from are not on the wire. Calling
  // `spaceDeletionState` on a payload therefore reported "pending" with no dates,
  // which rendered as "on a date we could not read — in under an hour". The
  // fallback stays for a caller holding a raw row.
  const state = space?.deletion || spaceDeletionState(space);
  const matches = typed.trim().replace(/^@/, '').toLowerCase() === String(handle || '').toLowerCase();

  const closeSheet = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setReason('');
  };

  const runExport = async () => {
    setBusy('export');
    try {
      const { filename } = await downloadSpaceExport(spaceId, handle);
      setExported(filename);
      toast.success(`Saved ${filename}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not build the export');
    } finally {
      setBusy(null);
    }
  };

  const request = async () => {
    if (!matches) return;
    setBusy('request');
    try {
      const result = await confirmation.run((confirm) =>
        requestSpaceDeletion(spaceId, reason.trim() || undefined, confirm),
      );
      // An empty never-published draft goes immediately — there is no Space left to
      // return to, so navigate away instead of refreshing into a 404.
      if (result.purged) {
        toast.success(`${name} was deleted. It was an empty draft, so there was nothing to hold for 30 days.`);
        onDeleted();
        return;
      }
      setOpen(false);
      setTyped('');
      setReason('');
      await onChanged();
      toast.success(
        `${name} is scheduled for deletion on ${deletionDateLabel(result.deletion?.scheduledAt || null)}. You can cancel any time before then.`,
      );
    } catch (err: any) {
      if (!isConfirmCancelled(err)) toast.error(err?.message || 'Could not start the deletion');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy('cancel');
    try {
      await cancelSpaceDeletion(spaceId);
      await onChanged();
      toast.success(`${name} is staying. Nothing was removed.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not cancel the deletion');
    } finally {
      setBusy(null);
    }
  };

  if (state.pending) {
    return (
      <Card>
        <CardTitle right={<Pill tone={statusTone('PENDING_DELETION')}>Scheduled</Pill>}>Deletion scheduled</CardTitle>
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5">
          <Clock3 size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="min-w-0 text-xs text-red-600 dark:text-red-400">
            <p className="font-extrabold">
              {name} will be permanently deleted on {deletionDateLabel(state.scheduledAt)} — {deletionCountdown(state)}.
            </p>
            <p className="mt-1 font-semibold">
              Until then it is hidden from visitors but nothing has been removed. Cancel below and everything comes
              straight back, exactly as it was.
            </p>
            {state.reason && <p className="mt-1 font-semibold italic">Your reason: “{state.reason}”</p>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton accent={accent} busy={busy === 'cancel'} onClick={() => void cancel()}>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw size={14} /> Cancel deletion
            </span>
          </ActionButton>
          <ActionButton busy={busy === 'export'} onClick={() => void runExport()}>
            <span className="inline-flex items-center gap-1.5">
              <Download size={14} /> Download your data
            </span>
          </ActionButton>
        </div>
        {exported && <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Saved {exported}.</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Download it before the date above — the export needs the Space to still exist.
        </p>
      </Card>
    );
  }

  return (
    <>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} accent={accent} />
      <Card>
        <CardTitle>Delete this Space</CardTitle>
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="min-w-0 text-xs text-red-600 dark:text-red-400">
            <p className="font-extrabold">
              Deletion is permanent, but not immediate: you get {SPACE_DELETION_GRACE_DAYS} days to change your mind.
            </p>
            <p className="mt-1 font-semibold">
              The Space is hidden from visitors as soon as you confirm, and nothing is actually removed until the grace
              period ends. If you only want it out of sight, archive it instead — that keeps everything with no
              countdown.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-dashed border-border p-3.5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Take your data first</p>
          <p className="mt-1 text-xs text-muted-foreground">
            One file with your posts, media list, products, events, team, settings and insight summaries. Followers and
            inbox conversations are left out — those belong to the people on the other side.
          </p>
          <div className="mt-2.5">
            <ActionButton busy={busy === 'export'} onClick={() => void runExport()}>
              <span className="inline-flex items-center gap-1.5">
                <Download size={14} /> Download your data
              </span>
            </ActionButton>
          </div>
          {exported && <p className="mt-2 text-[11px] font-semibold text-muted-foreground">Saved {exported}.</p>}
        </div>

        <div className="mt-3">
          <ActionButton tone="danger" onClick={() => setOpen(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Trash2 size={14} /> Delete {name}
            </span>
          </ActionButton>
        </div>
      </Card>

      {open && (
        <Sheet
          title={`Delete ${name}?`}
          onClose={closeSheet}
          footer={
            <>
              <ActionButton tone="danger" busy={busy === 'request'} disabled={!matches} onClick={() => void request()}>
                Schedule deletion
              </ActionButton>
              <ActionButton tone="ghost" disabled={!!busy} onClick={closeSheet}>
                Keep it
              </ActionButton>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              {name} disappears from Wevsoft today. In {SPACE_DELETION_GRACE_DAYS} days it is deleted for good, and
              these go with it:
            </p>
            <ul className="space-y-1.5">
              {SPACE_DELETION_CONSEQUENCES.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Trash2 size={13} className="mt-0.5 shrink-0 text-red-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-muted p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                What is not touched
              </p>
              <ul className="mt-1.5 space-y-1">
                {SPACE_DELETION_PRESERVED.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Field label="Why are you deleting it?" hint="Optional, and only ever read by Wevsoft staff.">
              <TextInput
                value={reason}
                placeholder="Not needed any more"
                autoComplete="off"
                onChange={(event) => setReason(event.target.value)}
                disabled={!!busy}
              />
            </Field>

            <Field
              label="Type the Space username to confirm"
              hint={`Type ${handle} exactly.`}
              error={typed.trim() && !matches ? 'That is not this Space’s username.' : undefined}
            >
              <TextInput
                value={typed}
                placeholder={handle}
                autoComplete="off"
                onChange={(event) => setTyped(event.target.value)}
                disabled={!!busy}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Ownership transfer (MP4 §10)
// ──────────────────────────────────────────────────────────────

/** "in 9 days" / "in 4 hours" — the same distance-not-diff wording as deletion. */
/**
 * Hands the Space to another account.
 *
 * Modelled as an offer, not a swap, because ownership cannot be pushed: whoever
 * receives it inherits responsibility for everything this Space has published and
 * spends one of their own Space slots. So this card only ever shows one of two
 * states — an offer waiting for a reply, or the form to make one — and the
 * receiver answers from their own Spaces page.
 *
 * The effects list comes from `SPACE_OWNERSHIP_TRANSFER_SENDER_EFFECTS` rather than
 * being written here, so this card and the receiver's card cannot end up describing
 * different outcomes for the same action.
 */
function TransferOwnershipCard({
  space,
  spaceId,
  handle,
  name,
  accent,
  onChanged,
}: {
  space: any;
  spaceId: string;
  handle: string;
  name: string;
  accent: string;
  onChanged: () => Promise<void>;
}) {
  const [pending, setPending] = useState<SpaceOwnershipTransfer | null>(null);
  const [history, setHistory] = useState<SpaceOwnershipTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<'send' | 'cancel' | null>(null);
  const confirmation = useIdentityConfirmation();

  const status = String(space?.status || 'DRAFT');
  const blocked = status === 'PENDING_DELETION';
  const matches = typed.trim().replace(/^@/, '').toLowerCase() === String(handle || '').toLowerCase();
  const target = username.trim().replace(/^@/, '');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchSpaceTransfers(spaceId);
      setPending(data.pending || null);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not load transfer history');
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const closeSheet = () => {
    if (busy) return;
    setOpen(false);
    setUsername('');
    setMessage('');
    setTyped('');
  };

  const send = async () => {
    if (!matches || !target) return;
    setBusy('send');
    try {
      await confirmation.run((confirm) =>
        requestSpaceTransfer(spaceId, { username: target, message: message.trim() || undefined }, confirm),
      );
      setOpen(false);
      setUsername('');
      setMessage('');
      setTyped('');
      await load();
      toast.success(
        `Offer sent to @${target}. Nothing changes until they accept, and it lapses after ${SPACE_OWNERSHIP_TRANSFER_TTL_DAYS} days.`,
      );
    } catch (err: any) {
      if (!isConfirmCancelled(err)) toast.error(err?.message || 'Could not send the offer');
    } finally {
      setBusy(null);
    }
  };

  // Withdrawing is the safe direction, so it is not challenged — the same reasoning
  // that leaves "cancel deletion" ungated.
  const withdraw = async () => {
    setBusy('cancel');
    try {
      await cancelSpaceTransfer(spaceId);
      await load();
      await onChanged();
      toast.success(`Offer withdrawn. ${name} is still yours.`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not withdraw the offer');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} accent={accent} />

      <Card>
        <CardTitle right={pending?.state.actionable ? <Pill tone={statusTone('PENDING')}>Waiting for reply</Pill> : undefined}>
          Transfer ownership
        </CardTitle>

        {loading ? (
          <div className="h-20 rounded-2xl bg-muted animate-pulse" />
        ) : loadError ? (
          <PanelError message={loadError} onRetry={() => void load()} />
        ) : pending?.state.actionable ? (
          <>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5">
              <PersonRow
                person={pending.to}
                accent={accent}
                meta={`Offered ${dateTime(pending.createdAt)} · lapses ${ownershipTransferCountdown(pending.state)}`}
              />
              <p className="mt-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Nothing has changed yet. {pending.to?.name || 'They'} become the owner only when they accept, and you
                stay in control until then.
              </p>
              {pending.message && (
                <p className="mt-1.5 text-[11px] italic text-muted-foreground">Your note: “{pending.message}”</p>
              )}
            </div>
            <div className="mt-3">
              <ActionButton tone="danger" busy={busy === 'cancel'} onClick={() => void withdraw()}>
                <span className="inline-flex items-center gap-1.5">
                  <XCircle size={14} /> Withdraw offer
                </span>
              </ActionButton>
            </div>
          </>
        ) : (
          <>
            <p className="-mt-1 text-xs text-muted-foreground">
              Ownership moves to another Wevsoft account only if they accept. Send the offer and they answer from their
              own Spaces page; it lapses on its own after {SPACE_OWNERSHIP_TRANSFER_TTL_DAYS} days.
            </p>

            <ul className="mt-3 space-y-1.5">
              {SPACE_OWNERSHIP_TRANSFER_SENDER_EFFECTS.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <UserCheck size={13} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {blocked ? (
              <p className="mt-3 rounded-2xl bg-muted p-3 text-[11px] font-semibold text-muted-foreground">
                This Space is scheduled for deletion, so it cannot be handed over. Cancel the deletion first and the
                offer works again.
              </p>
            ) : (
              <div className="mt-3">
                <ActionButton onClick={() => setOpen(true)}>
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck size={14} /> Hand over {name}
                  </span>
                </ActionButton>
              </div>
            )}
          </>
        )}

        {history.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Earlier offers</p>
            <ul className="mt-2 space-y-2">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-semibold">
                    {row.to?.username ? `@${row.to.username}` : row.to?.name || 'Someone'}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {dateTime(row.respondedAt || row.createdAt)}
                    </span>
                  </span>
                  <Pill tone={statusTone(row.status)}>
                    {SPACE_OWNERSHIP_TRANSFER_STATUS_LABELS[row.status] || row.status}
                  </Pill>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {open && (
        <Sheet
          title={`Hand over ${name}?`}
          onClose={closeSheet}
          footer={
            <>
              <ActionButton
                accent={accent}
                tone="accent"
                busy={busy === 'send'}
                disabled={!matches || !target}
                onClick={() => void send()}
              >
                Send offer
              </ActionButton>
              <ActionButton tone="ghost" disabled={!!busy} onClick={closeSheet}>
                Keep it
              </ActionButton>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm font-semibold">
              They get {SPACE_OWNERSHIP_TRANSFER_TTL_DAYS} days to answer. If they accept:
            </p>
            <ul className="space-y-1.5">
              {SPACE_OWNERSHIP_TRANSFER_SENDER_EFFECTS.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <UserCheck size={13} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <Field
              label="Their Wevsoft username"
              hint="A username, not an email address — so this box can never be used to check whether an address has an account."
            >
              <TextInput
                value={username}
                placeholder="username"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!!busy}
              />
            </Field>

            <Field label="Add a note" hint="Optional. They see this with the offer.">
              <TextArea
                rows={2}
                value={message}
                placeholder="Handing this over now that you are running it."
                onChange={(event) => setMessage(event.target.value)}
                disabled={!!busy}
              />
            </Field>

            <Field
              label="Type the Space username to confirm"
              hint={`Type ${handle} exactly.`}
              error={typed.trim() && !matches ? 'That is not this Space’s username.' : undefined}
            >
              <TextInput
                value={typed}
                placeholder={handle}
                autoComplete="off"
                onChange={(event) => setTyped(event.target.value)}
                disabled={!!busy}
              />
            </Field>
          </div>
        </Sheet>
      )}
    </>
  );
}
