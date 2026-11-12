/**
 * Activity — MP2 §1 and MP3 §23: the Space's own audit trail.
 *
 * Two things shape this panel:
 *
 * 1. The log is append-only by construction — nothing in the codebase updates or
 *    deletes a WevSpaceActivity row — and the panel says so, because a history
 *    the owner could quietly edit would be worth nothing.
 * 2. Filtering happens on the server — the `action` parameter takes one action or
 *    a comma-separated set of them. Narrowing the list in the browser instead
 *    would leave the "N entries" count describing a different set of rows than
 *    the one on screen.
 *
 * Labels are derived from the action string rather than kept in a lookup table:
 * the action list grows most weeks, and a table would silently fall behind it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity as ActivityIcon,
  BadgeCheck,
  Ban,
  CalendarDays,
  Coins,
  FileText,
  Image as ImageIcon,
  Landmark,
  Link2,
  MessageSquare,
  Megaphone,
  Receipt,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Star,
  ToggleLeft,
  UserPlus,
  Users,
} from 'lucide-react';
import { SPACE_ACTIVITY_ACTIONS } from '@wevsoft/shared/wevspace';
import { fetchManageActivity } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  Field,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonAvatar,
  Pill,
  Select,
  dateOnly,
  dateTime,
  num,
  relativeTime,
} from './manageUi';

const PAGE = 30;

/** Prefix → the area of the dashboard it belongs to. Drives the icon and the
 *  optgroup heading; an unmapped prefix falls back to its own name. */
const AREA_LABELS: Record<string, string> = {
  space: 'The Space itself',
  member: 'Team',
  links: 'Links',
  offering: 'Products and services',
  media: 'Media',
  content: 'Content',
  comment: 'Comments',
  moderation: 'Moderation',
  audience: 'Audience',
  follower: 'Followers',
  thread: 'Messages',
  canned: 'Quick replies',
  event: 'Events',
  review: 'Reviews',
  settings: 'Settings',
  features: 'Features',
  campaign: 'Ads',
  monetization: 'Money setup',
  transaction: 'Ledger',
  payout: 'Payouts',
  insights: 'Insights',
  verification: 'Verification',
};

function areaOf(action: unknown): string {
  return String(action || '').split('.')[0] || 'space';
}

function areaLabel(area: string): string {
  return AREA_LABELS[area] || area.charAt(0).toUpperCase() + area.slice(1);
}

/** `member.role_changed` → "Role changed". Grows with the action list for free. */
function actionLabel(action: unknown): string {
  const rest = String(action || '').split('.').slice(1).join(' ');
  const words = rest.replace(/_/g, ' ').trim();
  if (!words) return String(action || 'Action');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function areaIcon(area: string, size = 15) {
  switch (area) {
    case 'member':
      return <Users size={size} />;
    case 'follower':
      return <UserPlus size={size} />;
    case 'content':
      return <FileText size={size} />;
    case 'comment':
    case 'thread':
    case 'canned':
      return <MessageSquare size={size} />;
    case 'moderation':
      return <ShieldAlert size={size} />;
    case 'audience':
      return <Ban size={size} />;
    case 'event':
      return <CalendarDays size={size} />;
    case 'review':
      return <Star size={size} />;
    case 'offering':
      return <ShoppingBag size={size} />;
    case 'media':
      return <ImageIcon size={size} />;
    case 'links':
      return <Link2 size={size} />;
    case 'settings':
      return <Settings size={size} />;
    case 'features':
      return <ToggleLeft size={size} />;
    case 'campaign':
      return <Megaphone size={size} />;
    case 'monetization':
      return <Coins size={size} />;
    case 'transaction':
      return <Receipt size={size} />;
    case 'payout':
      return <Landmark size={size} />;
    case 'insights':
      return <ActivityIcon size={size} />;
    case 'verification':
      return <BadgeCheck size={size} />;
    default:
      return <Sparkles size={size} />;
  }
}

/** Actions grouped for the <optgroup> list, in the order the vocabulary declares
 *  them so related entries stay together. */
function actionGroups() {
  const groups: Array<{ area: string; label: string; actions: string[] }> = [];
  for (const action of SPACE_ACTIVITY_ACTIONS) {
    const area = areaOf(action);
    let group = groups.find((candidate) => candidate.area === area);
    if (!group) {
      group = { area, label: areaLabel(area), actions: [] };
      groups.push(group);
    }
    group.actions.push(action);
  }
  return groups;
}

export default function ActivityPanel() {
  const { spaceId, accent } = useManage();
  const [action, setAction] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  // eslint-disable-next-line react-hooks/use-memo -- computed dependency kept as-is (existing behavior)
  const groups = useMemo(actionGroups, []);

  /**
   * Offset paging rather than a growing `limit`: the server caps a page at 100,
   * so a limit that kept climbing would quietly stop returning new rows and the
   * list would look complete when it was not.
   */
  const load = useCallback(
    async (offset: number) => {
      const mine = ++generation.current;
      if (offset === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchManageActivity(spaceId, {
          limit: PAGE,
          offset,
          ...(action ? { action } : {}),
        });
        if (generation.current !== mine) return;
        setTotal(res.total);
        setRows((current) => (offset === 0 ? res.activity : [...current, ...res.activity]));
      } catch (err: any) {
        if (generation.current !== mine) return;
        setError(err?.message || 'Could not load the activity log');
        if (offset === 0) setRows([]);
      } finally {
        if (generation.current === mine) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [spaceId, action],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load(0);
  }, [load]);

  const days = useMemo(() => groupByDay(rows), [rows]);

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Activity"
        blurb="Every privileged action taken on this Space, newest first — who did it, when, and what changed."
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Show" hint="One kind of action at a time, filtered on the server so the count always matches.">
            <Select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">Everything</option>
              {groups.map((group) => (
                <optgroup key={group.area} label={group.label}>
                  {group.actions.map((value) => (
                    <option key={value} value={value}>
                      {actionLabel(value)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <p className="text-xs font-extrabold text-muted-foreground tabular-nums pb-2.5">
            {num(total)} {total === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </Card>

      {loading && rows.length === 0 && <PanelSkeleton rows={4} />}
      {error && rows.length === 0 && <PanelError message={error} onRetry={() => void load(0)} />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<ActivityIcon size={20} />}
          title={action ? 'Nothing of that kind yet' : 'Nothing recorded yet'}
          blurb={
            action
              ? 'Try a different action, or switch back to Everything.'
              : 'Actions land here as soon as you or a teammate change something.'
          }
          action={action ? <ActionButton onClick={() => setAction('')}>Show everything</ActionButton> : undefined}
        />
      )}

      {days.map((day) => (
        <Card key={day.key}>
          <CardTitle
            right={
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                {day.rows.length} {day.rows.length === 1 ? 'entry' : 'entries'}
              </span>
            }
          >
            {day.label}
          </CardTitle>
          <div className="divide-y divide-border">
            {day.rows.map((row) => (
              <ActivityRow key={row.id} row={row} accent={accent} />
            ))}
          </div>
        </Card>
      ))}

      {rows.length > 0 && (
        <div className="space-y-3">
          {error && <PanelError message={error} onRetry={() => void load(rows.length)} />}
          {rows.length < total && (
            <div className="flex justify-center">
              <ActionButton busy={loadingMore} onClick={() => void load(rows.length)}>
                Show older
              </ActionButton>
            </div>
          )}
          <p className="text-center text-[11px] text-muted-foreground">
            This log is append-only. Entries cannot be edited or deleted from here — not by a teammate, and not by the
            owner.
          </p>
        </div>
      )}
    </div>
  );
}

function groupByDay(rows: any[]): Array<{ key: string; label: string; rows: any[] }> {
  const days: Array<{ key: string; label: string; rows: any[] }> = [];
  for (const row of rows) {
    const key = dateOnly(row.createdAt);
    const last = days[days.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else days.push({ key, label: key, rows: [row] });
  }
  return days;
}

function ActivityRow({ row, accent }: { row: any; accent: string }) {
  const area = areaOf(row.action);
  const meta = row.meta && typeof row.meta === 'object' ? (row.meta as Record<string, unknown>) : null;
  const metaEntries = meta ? Object.entries(meta).filter(([, value]) => value !== null && value !== undefined) : [];

  return (
    <div className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
      <span
        className="mt-0.5 inline-grid place-items-center shrink-0 w-9 h-9 rounded-2xl bg-muted"
        style={{ color: accent }}
        aria-hidden="true"
      >
        {areaIcon(area)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">{row.summary || actionLabel(row.action)}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <Pill>{areaLabel(area)}</Pill>
              <Pill accent={accent}>{actionLabel(row.action)}</Pill>
            </span>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground" title={dateTime(row.createdAt)}>
            {relativeTime(row.createdAt)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {row.actor ? (
            <>
              <PersonAvatar person={row.actor} size={20} accent={accent} />
              <span className="text-[11px] font-semibold text-muted-foreground truncate">
                {row.actor.name || 'Someone'}
                {row.actor.username ? ` · @${row.actor.username}` : ''}
              </span>
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted-foreground">Automatic</span>
          )}
        </div>

        {metaEntries.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-[11px] font-extrabold text-muted-foreground hover:text-foreground">
              Details
            </summary>
            <dl className="mt-1.5 rounded-2xl bg-muted p-3 space-y-1">
              {metaEntries.map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-3 text-[11px]">
                  <dt className="font-extrabold text-muted-foreground shrink-0">{key}</dt>
                  <dd className="font-semibold text-right break-all">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
    </div>
  );
}
