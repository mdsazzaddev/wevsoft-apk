/**
 * Notifications (MP2 §21).
 *
 * Two halves, and the spec is explicit about both:
 *
 *  - The feed reuses Wevsoft's existing notification system rather than starting a
 *    parallel one. Space events are ordinary notification rows that carry a
 *    `spaceId`, so this screen is `GET /api/notifications?spaceId=<this Space>` —
 *    the same table the bell reads, filtered to one identity. "Mark all read" is
 *    scoped the same way, because clearing a Space's notices must never clear the
 *    owner's personal ones.
 *
 *  - The switches decide what the Space tells its *team* about, so they live in
 *    the Space settings blob (§25: database state, not hidden UI) and apply to
 *    everyone, not just the person looking. Each row says which permission a
 *    teammate needs before a notice of that kind can reach them at all — that is
 *    the server's rule (permissionForNotifyType), shown rather than restated.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapLegacyManageUrl } from '@wevsoft/shared/wevspace';
import { useNavigate } from 'react-router-dom';
import {
  AtSign,
  BadgeCheck,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Mail,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Star,
  Trash2,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SPACE_NOTIFY_TYPES, spaceNotifyDef, type SpaceNotifyType } from '@wevsoft/shared/wevspace';
import { authHeaders } from '../../../lib/wevspaceApi';
import { fetchSpaceSettings, saveSpaceSettings } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  SavedTick,
  SegmentedTabs,
  ToggleRow,
  dateTime,
  num,
  relativeTime,
  usePanelData,
} from './manageUi';

type FeedTab = 'all' | 'unread';

const FEED_TABS: ReadonlyArray<{ id: FeedTab; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'unread', label: 'Unread' },
];

/** One icon per shared notify type. Anything unknown falls back to the bell. */
const TYPE_ICONS: Partial<Record<SpaceNotifyType, typeof Bell>> = {
  space_follow: UserPlus,
  space_comment: MessageSquare,
  space_mention: AtSign,
  space_message: Mail,
  space_review: Star,
  space_event_rsvp: CalendarDays,
  space_team_invite: UserCog,
  space_team_joined: UserCheck,
  space_verification: BadgeCheck,
  space_promotion: Megaphone,
  space_milestone: TrendingUp,
  space_monetization: Wallet,
  space_moderation: ShieldAlert,
};

export default function NotificationsPanel() {
  const { spaceId, space, accent, can, meta } = useManage();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>('all');
  const [busy, setBusy] = useState(false);

  const feed = usePanelData(() => loadSpaceNotifications(spaceId, tab === 'unread'), [spaceId, tab]);
  const rows = feed.data?.rows || [];
  const unread = feed.data?.unread || 0;

  const markAll = async () => {
    setBusy(true);
    try {
      const updated = await markAllSpaceNotificationsRead(spaceId);
      toast.success(updated > 0 ? `${num(updated)} marked as read` : 'Nothing left to read');
      await feed.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not mark them as read');
    } finally {
      setBusy(false);
    }
  };

  const open = async (row: any) => {
    if (!row.read) {
      // Optimistic: the row is already open in front of the viewer, so waiting for
      // the request before it stops looking unread would be noise.
      await markNotificationRead(row.id).catch(() => null);
      void feed.reload();
    }
    if (row.link) navigate(mapLegacyManageUrl(row.link));
  };

  const remove = async (row: any) => {
    try {
      await deleteNotification(row.id);
      await feed.reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove that');
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Notifications"
        blurb={`Everything Wevsoft has told you about ${space?.name || 'this Space'} — kept separate from your personal notifications.`}
        actions={
          unread > 0 ? (
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={markAll}>
              <CheckCheck size={13} /> Mark all read
            </ActionButton>
          ) : undefined
        }
      />

      <SegmentedTabs
        options={FEED_TABS}
        value={tab}
        onChange={setTab}
        accent={accent}
        counts={{ unread }}
      />

      {feed.loading && !feed.data ? (
        <PanelSkeleton rows={3} />
      ) : feed.error ? (
        <PanelError message={feed.error} onRetry={feed.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Bell size={18} />}
          title={tab === 'unread' ? 'Nothing unread' : 'No notifications yet'}
          blurb={
            tab === 'unread'
              ? 'You are up to date on this Space.'
              : 'Follows, comments, messages and reviews for this Space will land here.'
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row: any) => (
            <NotificationRow
              key={row.id}
              row={row}
              accent={accent}
              onOpen={() => void open(row)}
              onRemove={() => void remove(row)}
            />
          ))}
        </div>
      )}

      <NotifyPrefs
        spaceId={spaceId}
        accent={accent}
        canModify={can('settings.modify')}
        permissionLabels={meta?.permissionLabels || {}}
      />
    </div>
  );
}

function NotificationRow({
  row,
  accent,
  onOpen,
  onRemove,
}: {
  row: any;
  accent: string;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const def = spaceNotifyDef(row.type);
  const Icon = TYPE_ICONS[row.type as SpaceNotifyType] || Bell;
  const unread = row.read !== true;

  return (
    <Card className={`p-3 ${unread ? '' : 'opacity-75'}`}>
      <div className="flex items-start gap-3">
        <span
          className="grid place-items-center w-9 h-9 rounded-2xl shrink-0"
          style={{ background: `${accent}14`, color: accent }}
        >
          <Icon size={16} />
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground truncate">
              {def?.label || String(row.type || '').replace(/_/g, ' ')}
            </span>
            {unread && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />}
          </span>
          <span className="mt-0.5 block text-sm font-semibold break-words">{row.message || row.text}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground" title={dateTime(row.createdAt)}>
            {relativeTime(row.createdAt)}
            {row.link && (
              <>
                · Open <ChevronRight size={11} />
              </>
            )}
          </span>
        </button>
        <div className="shrink-0 flex items-center gap-1">
          {unread && (
            <IconButton label="Mark as read" onClick={onOpen}>
              <Check size={13} />
            </IconButton>
          )}
          <IconButton label="Remove" tone="danger" onClick={onRemove}>
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}

/**
 * The Space-wide switches. Saved one section at a time (`{ notifications }`), so a
 * change here cannot clobber the moderation or monetization sections of the same
 * blob.
 */
function NotifyPrefs({
  spaceId,
  accent,
  canModify,
  permissionLabels,
}: {
  spaceId: string;
  accent: string;
  canModify: boolean;
  permissionLabels: Record<string, string>;
}) {
  const settings = usePanelData(() => fetchSpaceSettings(spaceId), [spaceId]);
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    const stored = settings.data?.settings?.notifications;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (stored) setPrefs({ ...stored });
  }, [settings.data]);

  useEffect(() => {
    if (!savedAt) return;
    const timer = window.setTimeout(() => setSavedAt(0), 2000);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  const offCount = useMemo(
    () => (prefs ? SPACE_NOTIFY_TYPES.filter((def) => prefs[def.id] === false).length : 0),
    [prefs],
  );

  const toggle = useCallback(
    async (type: SpaceNotifyType, next: boolean) => {
      if (!prefs) return;
      const previous = prefs;
      const updated = { ...prefs, [type]: next };
      setPrefs(updated);
      setSaving(true);
      try {
        const result = await saveSpaceSettings(spaceId, { notifications: updated as any });
        // Trust the server's parsed copy over the optimistic one (§25).
        if (result?.settings?.notifications) setPrefs({ ...result.settings.notifications });
        setSavedAt(Date.now());
      } catch (error: any) {
        setPrefs(previous);
        toast.error(error?.message || 'Could not save that switch');
      } finally {
        setSaving(false);
      }
    },
    [prefs, spaceId],
  );

  return (
    <Card>
      <CardTitle right={<SavedTick show={savedAt > 0} />}>What this Space notifies the team about</CardTitle>

      {settings.loading && !settings.data ? (
        <PanelSkeleton rows={2} />
      ) : settings.error ? (
        <PanelError message={settings.error} onRetry={settings.reload} />
      ) : !prefs ? null : (
        <>
          <p className="mb-1 text-[11px] text-muted-foreground">
            {canModify
              ? 'These apply to everyone who helps run this Space, not only to you. A teammate is only told about the kinds their permissions cover.'
              : 'Only someone with permission to change settings can edit these. They apply to the whole team.'}
          </p>

          <div className="divide-y divide-border">
            {SPACE_NOTIFY_TYPES.map((def) => {
              const permission = def.permission;
              const label = permission ? permissionLabels[permission] || permission : null;
              return (
                <ToggleRow
                  key={def.id}
                  label={def.label}
                  blurb={label ? `Reaches the owner and teammates who can ${label.toLowerCase()}.` : 'Reaches the person invited.'}
                  checked={prefs[def.id] !== false}
                  onChange={(next) => void toggle(def.id, next)}
                  disabled={!canModify || saving}
                  accent={accent}
                />
              );
            })}
          </div>

          {offCount > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <BellOff size={12} />
              {offCount} {offCount === 1 ? 'kind is' : 'kinds are'} switched off. The events still happen and stay in the
              activity log — nobody is told about them.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// The platform notification API, scoped to one Space (§21).
// Deliberately not in wevspaceManageApi.ts: that client maps 1:1 to
// /api/spaces/manage routes, and these are the pre-existing
// /api/notifications ones this section reuses.
// ──────────────────────────────────────────────────────────────

const FEED_LIMIT = 30;

async function readJson(res: Response, fallback: string): Promise<any> {
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!res.ok) throw new Error(body?.error || fallback);
  return body;
}

async function loadSpaceNotifications(
  spaceId: string,
  unreadOnly: boolean,
): Promise<{ rows: any[]; unread: number }> {
  const params = new URLSearchParams({ spaceId, limit: String(FEED_LIMIT) });
  if (unreadOnly) params.set('unread', 'true');
  const res = await fetch(`/api/notifications?${params.toString()}`, { headers: authHeaders() });
  const body = await readJson(res, 'Could not load notifications');
  return {
    rows: Array.isArray(body?.notifications) ? body.notifications : [],
    // Scoped count, so the tab badge counts this Space and not the whole account.
    unread: Number(body?.scopedUnread) || 0,
  };
}

async function markAllSpaceNotificationsRead(spaceId: string): Promise<number> {
  const res = await fetch('/api/notifications/read-all', {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify({ spaceId }),
  });
  const body = await readJson(res, 'Could not mark them as read');
  return Number(body?.updated) || 0;
}

async function markNotificationRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers: authHeaders() });
  await readJson(res, 'Could not mark that as read');
}

async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers: authHeaders() });
  await readJson(res, 'Could not remove that');
}
