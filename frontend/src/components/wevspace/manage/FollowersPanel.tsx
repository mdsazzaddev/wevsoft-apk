/**
 * Followers (MP2 §12).
 *
 * "Do not expose private analytics to normal users" — this whole screen sits
 * behind followers.manage / settings.view, and the per-person detail (where they
 * followed from, when, whether they get notifications) never appears on the
 * public page.
 *
 * Removing a follower offers the ban as an explicit second choice, because a
 * plain removal is reversible in one tap by the person themselves — pretending
 * otherwise would be dishonest about what the button does.
 */

import { useCallback, useState } from 'react';
import { Search, UserMinus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  FOLLOWER_LIST_FILTERS,
  formatFollowerCount,
  type FollowerListFilter,
} from '@wevsoft/shared/wevspace';
import { fetchManagedFollowers, removeSpaceFollower } from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  EmptyState,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  PersonRow,
  Pill,
  SegmentedTabs,
  Sheet,
  StatTile,
  ToggleRow,
  dateOnly,
  inputClass,
  num,
  relativeTime,
  usePanelData,
} from './manageUi';

const PAGE_SIZE = 25;

export default function FollowersPanel() {
  const { spaceId, accent, counts, can, refresh } = useManage();
  const [filter, setFilter] = useState<FollowerListFilter>('all');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(0);
  const [removing, setRemoving] = useState<any | null>(null);

  const canManage = can('followers.manage');

  const list = usePanelData(
    () =>
      fetchManagedFollowers(spaceId, {
        filter,
        source: source || undefined,
        search: applied || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [spaceId, filter, source, applied, page],
  );

  const followers = list.data?.followers || [];
  const total = list.data?.total || 0;
  const sources = list.data?.sources || [];
  const stats = list.data?.stats;

  const afterChange = useCallback(async () => {
    await list.reload();
    await refresh();
  }, [list, refresh]);

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Followers"
        blurb="Who follows this Space, where they came from, and who you have restricted."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Followers" value={num(counts.followers)} icon={<Users size={15} />} accent={accent} />
        <StatTile
          label="Gained · 7 days"
          value={stats ? num(stats.gained7d) : '—'}
          hint={stats ? `${num(stats.lost7d)} left · net ${stats.net7d >= 0 ? '+' : ''}${num(stats.net7d)}` : undefined}
          accent={accent}
        />
        <StatTile label="Under a sanction" value={stats ? num(stats.sanctioned) : '—'} accent={accent} />
        <StatTile label="Shown publicly as" value={formatFollowerCount(counts.followers)} accent={accent} />
      </div>

      <SegmentedTabs
        options={FOLLOWER_LIST_FILTERS}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(0);
        }}
        accent={accent}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setApplied(search.trim());
                setPage(0);
              }
            }}
            placeholder="Search by name or @username"
            aria-label="Search followers"
            className={`${inputClass} pl-9`}
          />
        </div>
        <ActionButton
          onClick={() => {
            setApplied(search.trim());
            setPage(0);
          }}
        >
          Search
        </ActionButton>
      </div>

      {sources.length > 0 && (
        <Card>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSource('');
                setPage(0);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors ${
                source ? 'bg-muted text-muted-foreground' : 'text-primary-foreground'
              }`}
              style={source ? undefined : { background: accent }}
            >
              Every source
            </button>
            {sources
              .filter((entry) => entry.count > 0)
              .map((entry) => {
                const active = entry.id === source;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSource(active ? '' : entry.id);
                      setPage(0);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition-colors ${
                      active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    style={active ? { background: accent } : undefined}
                  >
                    {entry.label} · {num(entry.count)}
                  </button>
                );
              })}
          </div>
        </Card>
      )}

      {list.loading && !list.data ? (
        <PanelSkeleton rows={4} />
      ) : list.error ? (
        <PanelError message={list.error} onRetry={list.reload} />
      ) : followers.length === 0 ? (
        <EmptyState
          icon={<Users size={18} />}
          title={applied ? 'Nobody matches that' : filter === 'all' ? 'No followers yet' : 'Nobody in this list'}
          blurb={
            applied
              ? 'Try a username instead of a full name.'
              : 'Share your Space to start growing an audience — the Ads section can help.'
          }
        />
      ) : (
        <div className="space-y-2">
          {followers.map((follower: any) => (
            <Card key={follower.id} className="p-3">
              <PersonRow
                person={follower.user}
                accent={accent}
                meta={
                  <>
                    Followed {relativeTime(follower.followedAt)}
                    {follower.source ? ` · via ${String(follower.source).replace(/_/g, ' ')}` : ''}
                    {follower.notificationsEnabled === false ? ' · notifications off' : ''}
                  </>
                }
                right={
                  <>
                    {Array.isArray(follower.sanctions) &&
                      follower.sanctions.map((sanction: string) => <Pill key={sanction}>{sanction}</Pill>)}
                    {canManage && (
                      <IconButton label={`Remove ${follower.user?.name || 'this follower'}`} onClick={() => setRemoving(follower)}>
                        <UserMinus size={14} />
                      </IconButton>
                    )}
                  </>
                }
              />
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-extrabold text-muted-foreground tabular-nums">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {num(total)}
          </span>
          <div className="flex gap-2">
            <ActionButton size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>
              Previous
            </ActionButton>
            <ActionButton size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>
              Next
            </ActionButton>
          </div>
        </div>
      )}

      {removing && (
        <RemoveFollowerSheet
          follower={removing}
          accent={accent}
          spaceId={spaceId}
          onClose={() => setRemoving(null)}
          onDone={() => void afterChange()}
        />
      )}
    </div>
  );
}

function RemoveFollowerSheet({
  follower,
  accent,
  spaceId,
  onClose,
  onDone,
}: {
  follower: any;
  accent: string;
  spaceId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [ban, setBan] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = follower.user?.name || 'This person';

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await removeSpaceFollower(spaceId, follower.user.id, ban);
      toast.success(result.banned ? `${name} removed and banned` : `${name} removed`);
      onDone();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove them');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={`Remove ${name}?`}
      onClose={onClose}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="danger" busy={busy} onClick={confirm} full>
            Remove
          </ActionButton>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          They stop seeing this Space in their following feed. They are not told, and nothing they have already posted or
          commented is removed.
        </p>
        <div className="divide-y divide-border">
          <ToggleRow
            label="Also ban them"
            blurb="Without this they can simply follow again straight away."
            checked={ban}
            onChange={setBan}
            accent={accent}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Following since {dateOnly(follower.followedAt)}.
        </p>
      </div>
    </Sheet>
  );
}
