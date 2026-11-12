/**
 * Content — everything the Space has published, drafted or scheduled (MP2 §6),
 * plus the comment moderation queue (§8) as its last tab.
 *
 * The list is the *Space's* content, not the owner's: every row came from a Post
 * carrying this spaceId, so a personal post can never appear here and a Space
 * post can never be edited from the personal profile.
 *
 * Permissions decide which row actions render, but the server re-checks each one
 * (§24) — an EDITOR who can create but not publish sees Save-draft only, and the
 * publish route would refuse anyway.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  FileText,
  MessageSquareOff,
  Pencil,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Star,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SPACE_CONTENT_KINDS,
  SPACE_CONTENT_STATUSES,
  SPACE_CONTENT_STATUS_LABELS,
  spaceContentKindDef,
  type SpaceContentStatus,
} from '@wevsoft/shared/wevspace';
import {
  deleteSpacePost,
  fetchSpaceContent,
  setSpacePostFlags,
} from '../../../lib/wevspaceManageApi';
import { spaceIcon } from '../spaceIcons';
import { useManage } from './ManageContext';
import {
  ActionButton,
  Card,
  EmptyState,
  IconButton,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  SegmentedTabs,
  Select,
  dateTime,
  inputClass,
  num,
  relativeTime,
  statusTone,
  usePanelData,
  confirmAction,
} from './manageUi';

const ComposerSheet = lazy(() => import('./ComposerSheet'));
const CommentsTab = lazy(() => import('./CommentsTab'));

type ContentTab = SpaceContentStatus | 'comments';

const PAGE_SIZE = 20;

export default function ContentPanel() {
  const { spaceId, accent, can, counts, refresh } = useManage();
  const canModerate = can('comments.moderate');

  const tabs = useMemo(() => {
    const list: Array<{ id: ContentTab; label: string }> = SPACE_CONTENT_STATUSES.filter(
      (status) => status !== 'trashed',
    ).map((status) => ({ id: status as ContentTab, label: SPACE_CONTENT_STATUS_LABELS[status] }));
    if (canModerate) list.push({ id: 'comments', label: 'Comments' });
    return list;
  }, [canModerate]);

  const [tab, setTab] = useState<ContentTab>('published');
  const [kind, setKind] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [composerFor, setComposerFor] = useState<{ post: any | null } | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // Typing should not fire a request per keystroke, and the query is a real
  // database filter, so it waits for the typing to settle.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const isComments = tab === 'comments';

  const list = usePanelData(
    () =>
      fetchSpaceContent(spaceId, {
        status: tab as SpaceContentStatus,
        kind: kind || undefined,
        search: search || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [spaceId, tab, kind, search, page, isComments],
  );

  const posts = list.data?.posts || [];
  const total = list.data?.total || 0;
  const canPublish = list.data?.canPublish === true;
  const canSchedule = list.data?.canSchedule === true;
  const canDelete = list.data?.canDelete === true;

  const afterChange = useCallback(async () => {
    await list.reload();
    // Nav badges and the Overview counts are derived server-side, so they have
    // to come from the same refresh rather than being guessed locally.
    await refresh();
  }, [list, refresh]);

  const toggleFlag = async (post: any, flag: 'pinned' | 'featured' | 'commentsOff') => {
    setRowBusy(post.id);
    try {
      const next =
        flag === 'pinned' ? !post.pinned : flag === 'featured' ? !post.isFeatured : !post.commentsDisabled;
      await setSpacePostFlags(post.id, { [flag]: next } as any);
      await afterChange();
    } catch (error: any) {
      toast.error(error?.message || 'Could not update this post');
    } finally {
      setRowBusy(null);
    }
  };

  const remove = async (post: any) => {
    if (!confirmAction('Delete this post? It disappears from your Space for everyone.')) return;
    setRowBusy(post.id);
    try {
      await deleteSpacePost(post.id);
      toast.success('Post deleted');
      await afterChange();
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete this post');
    } finally {
      setRowBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Content"
        blurb="Everything published as this Space. Personal posts stay on your own profile."
        actions={
          can('content.create') ? (
            <ActionButton tone="accent" accent={accent} onClick={() => setComposerFor({ post: null })}>
              <SquarePen size={14} /> New post
            </ActionButton>
          ) : undefined
        }
      />

      <SegmentedTabs
        options={tabs}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setPage(0);
        }}
        accent={accent}
        counts={{ comments: counts.pendingComments || 0 } as Partial<Record<ContentTab, number>>}
      />

      {isComments ? (
        <Suspense fallback={<PanelSkeleton rows={3} />}>
          <CommentsTab onModerated={refresh} />
        </Suspense>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search this Space's posts"
                aria-label="Search posts"
                className={`${inputClass} pl-9`}
              />
            </div>
            <Select
              value={kind}
              aria-label="Filter by post type"
              onChange={(event) => {
                setKind(event.target.value);
                setPage(0);
              }}
              className="sm:w-44"
            >
              <option value="">All types</option>
              {SPACE_CONTENT_KINDS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
          </div>

          {list.loading && !list.data ? (
            <PanelSkeleton rows={3} />
          ) : list.error ? (
            <PanelError message={list.error} onRetry={list.reload} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<FileText size={18} />}
              title={
                search
                  ? 'Nothing matches that search'
                  : tab === 'published'
                    ? 'No published posts yet'
                    : `No ${SPACE_CONTENT_STATUS_LABELS[tab as SpaceContentStatus].toLowerCase()}`
              }
              blurb={
                search
                  ? 'Try a shorter phrase, or clear the type filter.'
                  : 'Posts you write as this Space appear here with their reach and engagement.'
              }
              action={
                can('content.create') && !search ? (
                  <ActionButton tone="accent" accent={accent} onClick={() => setComposerFor({ post: null })}>
                    <SquarePen size={14} /> Write the first post
                  </ActionButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2.5">
              {posts.map((post: any) => (
                <PostRow
                  key={post.id}
                  post={post}
                  accent={accent}
                  busy={rowBusy === post.id}
                  canEdit={can('content.edit')}
                  canPublish={canPublish}
                  canDelete={canDelete}
                  onEdit={() => setComposerFor({ post })}
                  onToggle={(flag) => toggleFlag(post, flag)}
                  onDelete={() => remove(post)}
                />
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
                <ActionButton
                  size="sm"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </ActionButton>
              </div>
            </div>
          )}
        </>
      )}

      {composerFor && (
        <Suspense fallback={null}>
          <ComposerSheet
            post={composerFor.post}
            canPublish={canPublish}
            canSchedule={canSchedule}
            onClose={() => setComposerFor(null)}
            onSaved={() => void afterChange()}
          />
        </Suspense>
      )}
    </div>
  );
}

function PostRow({
  post,
  accent,
  busy,
  canEdit,
  canPublish,
  canDelete,
  onEdit,
  onToggle,
  onDelete,
}: {
  post: any;
  accent: string;
  busy: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onToggle: (flag: 'pinned' | 'featured' | 'commentsOff') => void;
  onDelete: () => void;
}) {
  const kindDef = spaceContentKindDef(post.type);
  const KindIcon = spaceIcon(kindDef.icon);
  const thumb = post.media?.[0]?.url;
  const excerpt = String(post.content || '').trim();

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex gap-3">
        {thumb ? (
          <img src={thumb} alt="" loading="lazy" className="shrink-0 w-16 h-16 rounded-2xl object-cover bg-muted" />
        ) : (
          <span
            className="shrink-0 grid place-items-center w-16 h-16 rounded-2xl"
            style={{ background: `${accent}14`, color: accent }}
          >
            {/* eslint-disable-next-line react-hooks/static-components -- inline component kept as-is (existing behavior) */}
            <KindIcon size={20} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill accent={accent}>{kindDef.label}</Pill>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusTone(post.status)}`}>
              {post.status}
            </span>
            {post.pinned && <Pill>Pinned</Pill>}
            {post.isFeatured && <Pill>Featured</Pill>}
            {post.commentsDisabled && <Pill>Comments off</Pill>}
          </div>

          <p className="mt-1.5 text-sm font-semibold line-clamp-2 break-words">
            {excerpt || <span className="text-muted-foreground">No caption</span>}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {post.status === 'scheduled' && post.scheduledFor ? (
              <span className="inline-flex items-center gap-1 font-bold">
                <CalendarClock size={11} /> Goes out {dateTime(post.scheduledFor)}
              </span>
            ) : (
              <>
                {relativeTime(post.createdAt)} · {num(post.stats?.likes)} likes · {num(post.stats?.comments)} comments
              </>
            )}
            {post.authoredBy?.name && <> · by {post.authoredBy.name}</>}
          </p>
        </div>
      </div>

      {(canEdit || canPublish || canDelete) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
          {canEdit && (
            <IconButton label="Edit post" onClick={onEdit} busy={busy}>
              <Pencil size={14} />
            </IconButton>
          )}
          {canPublish && (
            <>
              <IconButton
                label={post.pinned ? 'Unpin from the top' : 'Pin to the top'}
                onClick={() => onToggle('pinned')}
                busy={busy}
              >
                {post.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </IconButton>
              <IconButton
                label={post.isFeatured ? 'Remove from featured' : 'Feature on the Space'}
                onClick={() => onToggle('featured')}
                busy={busy}
              >
                <Star size={14} className={post.isFeatured ? 'fill-current' : ''} />
              </IconButton>
              <IconButton
                label={post.commentsDisabled ? 'Allow comments' : 'Turn off comments'}
                onClick={() => onToggle('commentsOff')}
                busy={busy}
              >
                <MessageSquareOff size={14} />
              </IconButton>
            </>
          )}
          {canDelete && (
            <div className="ml-auto">
              <IconButton label="Delete post" tone="danger" onClick={onDelete} busy={busy}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
