/**
 * Overview — the dashboard's landing section (MP2 §1).
 *
 * Two jobs: say how the Space is doing, and put whatever is waiting for a human
 * one tap away. Every "needs attention" row is gated on the permission that owns
 * the destination section, because a SUPPORT member should not be told about
 * held transactions they cannot open.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  FileText,
  Inbox,
  Megaphone,
  MessageSquare,
  QrCode,
  Share2,
  SquarePen,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import {
  spaceCompletion,
  spacePublicPath,
  type SpaceDashboardSection,
  type SpacePermission,
} from '@wevsoft/shared/wevspace';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  CardTitle,
  EmptyState,
  PersonRow,
  StatTile,
  num,
  relativeTime,
} from './manageUi';
import { shareSpace } from '../shareSpace';
import SpaceShareSheet from '../SpaceShareSheet';

interface AttentionRow {
  id: string;
  count: number;
  label: string;
  section: SpaceDashboardSection;
  permission: SpacePermission;
  icon: any;
}

export default function OverviewPanel() {
  const { space, counts, recentActivity, accent, can, goto, isOwner, role } = useManage();
  const [sharingCard, setSharingCard] = useState(false);

  const completion = useMemo(() => spaceCompletion(space || {}), [space]);

  // Annotated before the filter, not after: with the annotation on the filtered
  // result the literals widen to `string` and `can(row.permission)` loses its type.
  const attentionRows: AttentionRow[] = [
    {
      id: 'comments',
      count: counts.pendingComments || 0,
      label: 'comments waiting for review',
      section: 'content',
      permission: 'comments.moderate',
      icon: MessageSquare,
    },
    {
      id: 'threads',
      count: counts.unreadThreads || 0,
      label: 'unread conversations',
      section: 'wevchat',
      permission: 'messages.read',
      icon: Inbox,
    },
    {
      id: 'invites',
      count: counts.pendingInvites || 0,
      label: 'invitations still pending',
      section: 'team',
      permission: 'team.invite',
      icon: Users,
    },
    {
      id: 'reviews',
      count: counts.unansweredReviews || 0,
      label: 'reviews without a reply',
      section: 'reviews',
      permission: 'reviews.moderate',
      icon: Star,
    },
    {
      id: 'money',
      count: counts.heldTransactions || 0,
      label: 'transactions held for review',
      section: 'monetization',
      permission: 'monetization.view',
      icon: Wallet,
    },
  ];

  const attention = attentionRows.filter((row) => row.count > 0 && can(row.permission));

  return (
    <div className="space-y-4">
      {/* Quick actions read as a toolbar on desktop and stack on a phone. */}
      <div className="flex flex-wrap items-center gap-2">
        {can('content.create') && (
          <ActionButton tone="accent" accent={accent} onClick={() => goto('content')}>
            <SquarePen size={14} /> Create a post
          </ActionButton>
        )}
        <ActionButton onClick={() => void shareSpace(space)}>
          <Share2 size={14} /> Share
        </ActionButton>
        <ActionButton onClick={() => setSharingCard(true)} title="QR code and share card">
          <QrCode size={14} /> QR &amp; card
        </ActionButton>
        <Link
          to={spacePublicPath(space.handle)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Eye size={14} /> View as visitor
        </Link>
        <span className="ml-auto text-[11px] font-extrabold text-muted-foreground">
          You are {isOwner ? 'the owner' : `a ${String(role || 'team member').toLowerCase()}`}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Followers"
          value={num(counts.followers)}
          icon={<Users size={15} />}
          accent={accent}
          onClick={can('settings.view') ? () => goto('followers') : undefined}
        />
        <StatTile label="Profile views" value={num(counts.views)} icon={<Eye size={15} />} accent={accent} />
        <StatTile
          label="Published"
          value={num(counts.published)}
          hint={`${num(counts.drafts)} drafts · ${num(counts.scheduled)} scheduled`}
          icon={<FileText size={15} />}
          accent={accent}
          onClick={can('content.create') ? () => goto('content') : undefined}
        />
        <StatTile
          label="Open conversations"
          value={num(counts.openThreads)}
          hint={`${num(counts.unreadThreads)} unread`}
          icon={<MessageSquare size={15} />}
          accent={accent}
          onClick={can('messages.read') ? () => goto('wevchat') : undefined}
        />
      </div>

      {attention.length > 0 && (
        <Card>
          <CardTitle>Needs your attention</CardTitle>
          <div className="divide-y divide-border">
            {attention.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => goto(row.section)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:opacity-80 transition-opacity"
                >
                  <span
                    className="grid place-items-center w-9 h-9 rounded-2xl"
                    style={{ background: `${accent}1a`, color: accent }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-sm font-bold">
                    {num(row.count)} {row.label}
                  </span>
                  <span className="text-[11px] font-extrabold text-muted-foreground">Open</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* `grid-cols-1` is spelled out rather than left implicit: an implicit track sizes
          to its widest item's min-content, and the activity rows below carry names and
          summaries long enough to push that past a 360px screen — which put both cards
          over the right edge. An explicit track is `minmax(0, 1fr)`, so it takes the
          width it is given and the rows truncate as they were built to. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Completion is a checklist, not a score to game: it names what is
            missing and links to the screen that fixes it. */}
        {can('space.edit') && completion.percent < 100 && (
          <Card>
            <CardTitle right={<span className="text-xs font-black tabular-nums">{completion.percent}%</span>}>
              Finish your Space
            </CardTitle>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <span
                className="block h-full rounded-full transition-all"
                style={{ width: `${completion.percent}%`, background: accent }}
              />
            </div>
            <ul className="mt-3 space-y-1.5">
              {completion.missing.slice(0, 4).map((item) => (
                <li key={item} className="text-xs font-semibold text-muted-foreground">
                  · {item}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <ActionButton size="sm" onClick={() => goto('settings')}>
                Complete it
              </ActionButton>
            </div>
          </Card>
        )}

        <Card>
          <CardTitle
            right={
              <div className="flex items-center gap-1.5">
                {can('events.manage') && (counts.upcomingEvents || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => goto('events')}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-muted-foreground hover:text-foreground"
                  >
                    <CalendarDays size={12} /> {num(counts.upcomingEvents)}
                  </button>
                )}
                {can('promotion.view') && (counts.activeCampaigns || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => goto('promotion')}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-muted-foreground hover:text-foreground"
                  >
                    <Megaphone size={12} /> {num(counts.activeCampaigns)}
                  </button>
                )}
              </div>
            }
          >
            Recent activity
          </CardTitle>
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck size={18} />}
              title="Nothing logged yet"
              blurb="Every team action, publish and moderation decision is recorded here."
            />
          ) : (
            <div className="space-y-3">
              {recentActivity.slice(0, 6).map((row: any) => (
                <PersonRow
                  key={row.id}
                  person={row.actor}
                  accent={accent}
                  meta={`${row.summary || row.action} · ${relativeTime(row.createdAt)}`}
                />
              ))}
              <button
                type="button"
                onClick={() => goto('activity')}
                className="text-[11px] font-extrabold text-muted-foreground hover:text-foreground"
              >
                See the full activity log →
              </button>
            </div>
          )}
        </Card>
      </div>

      {sharingCard && (
        <SpaceShareSheet space={space} initialTab="card" onClose={() => setSharingCard(false)} />
      )}
    </div>
  );
}
