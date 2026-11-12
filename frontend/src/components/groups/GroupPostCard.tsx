import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ThumbsUp, MessageCircle, Share2, Bookmark, MoreHorizontal, Globe2, Lock, EyeOff, Link2, Trash2, Send, Loader2, Pin, BarChart3, Check, BadgeCheck,
} from 'lucide-react';
import { resolveAvatarUrl } from '../UserAvatar';
import { useStore } from '../../store';
import ReactionIcon from '../reactions/ReactionIcon';
import ReactionBar from '../reactions/ReactionBar';
import { POST_REACTIONS, isReactionType } from '../../lib/reactions';
import { hubFetch, GroupAvatar, PersonAvatar, REACTION_EMOJI, fmtCount, timeAgo, feelingEmoji, card, type HubPost, type HubPoll, type HubUser } from './groupsApi';

const resolveMediaUrl = (u: string) => resolveAvatarUrl(u) || u;

const PrivacyIcon = ({ privacy }: { privacy: string }) =>
  privacy === 'public' ? <Globe2 size={12} aria-label="Public group" /> : privacy === 'secret' ? <EyeOff size={12} aria-label="Secret group" /> : <Lock size={12} aria-label="Private group" />;

interface HubComment { id: string; text: string; createdAt: string; author: HubUser | null }

function MediaGrid({ media }: { media: HubPost['media'] }) {
  if (!media.length) return null;
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;
  const one = shown.length === 1;
  return (
    <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${one ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {shown.map((m, i) => {
        const src = resolveMediaUrl(m.url);
        const tall = shown.length === 3 && i === 0;
        return (
          <div
            key={`${m.url}-${i}`}
            className={`relative overflow-hidden bg-muted ${one ? 'max-h-[460px]' : 'aspect-square'} ${tall ? 'row-span-2 aspect-auto' : ''}`}
          >
            {m.type === 'video' ? (
              <video src={src} controls playsInline preload="metadata" className={`h-full w-full bg-black ${one ? 'max-h-[460px] object-contain' : 'object-cover'}`} />
            ) : (
              <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover ${one ? 'max-h-[460px]' : ''}`} />
            )}
            {extra > 0 && i === shown.length - 1 && (
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-2xl font-bold text-white">+{extra}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PollBlock({ poll, onVoted }: { poll: HubPoll; onVoted: (p: HubPoll) => void }) {
  const token = useStore((s) => s.token);
  const [busy, setBusy] = useState<string | null>(null);
  const ended = !!poll.expiresAt && new Date(poll.expiresAt) < new Date();
  const showResults = !!poll.myVote || ended;
  const vote = async (optionId: string) => {
    if (ended || busy) return;
    setBusy(optionId);
    try {
      const r = await hubFetch<{ poll: HubPoll | null }>(token, `/polls/${poll.id}/vote`, { method: 'POST', body: JSON.stringify({ optionId }) });
      if (r.poll) onVoted(r.poll);
    } catch (e: any) {
      toast.error(e?.message || 'Could not vote');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((o) => {
        const pct = poll.totalVotes ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
        const mine = poll.myVote === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={ended}
            onClick={() => vote(o.id)}
            className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl border px-3 py-2.5 text-left text-[13px] font-medium transition ${
              mine ? 'border-primary text-primary ' : 'border-border text-foreground/80 hover:border-primary/50 '
            }`}
          >
            {showResults && <span className={`absolute inset-y-0 left-0 ${mine ? 'bg-primary/15' : 'bg-muted-foreground/10'}`} style={{ width: `${pct}%` }} />}
            <span className="relative flex items-center gap-2">
              {busy === o.id ? <Loader2 size={13} className="animate-spin" /> : mine ? <Check size={14} /> : null}
              {o.text}
            </span>
            {showResults && <span className="relative text-[12px] font-semibold">{pct}%</span>}
          </button>
        );
      })}
      <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground ">
        <BarChart3 size={12} /> {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
        {poll.expiresAt && <> · {ended ? 'Poll ended' : `Ends ${new Date(poll.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}</>}
      </p>
    </div>
  );
}

export function GroupPostCard({
  post,
  onChange,
  onRemove,
  onOpenGroup,
}: {
  post: HubPost;
  onChange: (p: HubPost) => void;
  onRemove: (id: string) => void;
  onOpenGroup?: (groupId: string) => void;
}) {
  const token = useStore((s) => s.token);
  const me = useStore((s) => s.user) as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<HubComment[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const primary = post.groups[0];
  const extraGroups = post.groups.slice(1);
  const long = (post.content || '').length > 320;

  const applyReaction = (reaction: string | null) => {
    const wasLiked = post.likedByMe;
    const prevType = post.myReaction;
    const likes = post.counts.likes + (reaction && !wasLiked ? 1 : !reaction && wasLiked ? -1 : 0);
    let reactions = post.reactions.map((r) => ({ ...r }));
    if (prevType) reactions = reactions.map((r) => (r.type === prevType ? { ...r, count: r.count - 1 } : r));
    if (reaction) {
      const found = reactions.find((r) => r.type === reaction);
      if (found) found.count += 1;
      else reactions.push({ type: reaction, count: 1 });
    }
    reactions = reactions.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
    onChange({ ...post, likedByMe: !!reaction, myReaction: reaction, counts: { ...post.counts, likes: Math.max(0, likes) }, reactions });
  };

  const toggleLike = async () => {
    const snapshot = post;
    applyReaction(post.likedByMe ? null : 'like');
    try {
      await hubFetch(token, `/api/posts/${post.id}/like`, { method: 'POST' });
    } catch {
      onChange(snapshot);
      toast.error('Could not update reaction');
    }
  };

  const react = async (type: string) => {
    setPickerOpen(false);
    const snapshot = post;
    applyReaction(post.myReaction === type ? null : type);
    try {
      await hubFetch(token, `/api/posts/${post.id}/react`, { method: 'POST', body: JSON.stringify({ type }) });
    } catch {
      onChange(snapshot);
      toast.error('Could not update reaction');
    }
  };

  const toggleSave = async () => {
    setMenuOpen(false);
    const snapshot = post;
    onChange({ ...post, savedByMe: !post.savedByMe });
    try {
      const r = await hubFetch<{ saved: boolean }>(token, `/api/posts/${post.id}/save`, { method: 'POST' });
      onChange({ ...snapshot, savedByMe: !!r.saved });
      toast.success(r.saved ? 'Saved to your collection' : 'Removed from saved');
    } catch {
      onChange(snapshot);
      toast.error('Could not save post');
    }
  };

  const shareLink = `${window.location.origin}/posts/${post.id}`;
  const shareToMainFeed = async () => {
    setMenuOpen(false);
    try {
      await hubFetch(token, `/api/posts/${post.id}/share`, {
        method: 'POST',
        body: JSON.stringify({ shareType: 'feed', privacy: 'friends' }),
      });
      onChange({ ...post, counts: { ...post.counts, shares: (post.counts.shares || 0) + 1 } });
      toast.success('Shared to your main feed');
    } catch (e: any) {
      toast.error(e?.message || 'Could not share to feed');
    }
  };
  const copyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };
  const share = async () => {
    // Primary action: share outward to main feed (reshare Post).
    await shareToMainFeed();
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this post from all of its groups?')) return;
    try {
      await hubFetch(token, `/posts/${post.id}`, { method: 'DELETE' });
      onRemove(post.id);
      toast.success('Post moved to trash');
    } catch (e: any) {
      toast.error(e?.message || 'Could not delete');
    }
  };

  const openComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      try {
        const r = await hubFetch<{ comments: HubComment[] }>(token, `/posts/${post.id}/comments`);
        setComments(r.comments);
      } catch {
        setComments([]);
      }
    }
  };

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const r = await hubFetch<{ comment: HubComment }>(token, `/posts/${post.id}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
      setComments((c) => [...(c || []), r.comment]);
      setCommentText('');
      onChange({ ...post, counts: { ...post.counts, comments: post.counts.comments + 1 } });
    } catch (err: any) {
      toast.error(err?.message || 'Could not comment');
    } finally {
      setSending(false);
    }
  };

  const reactionLabel = post.myReaction && post.myReaction !== 'like' ? (post.myReaction === 'sad' ? 'crying' : post.myReaction) : 'Like';
  const actionBtn = 'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-[13px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground ';

  return (
    <article className={`${card} p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)] sm:p-5`}>
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          {primary ? (
            <button type="button" onClick={() => onOpenGroup?.(primary.id)} aria-label={`Open ${primary.name}`}>
              <GroupAvatar group={primary} size={44} />
            </button>
          ) : (
            <PersonAvatar user={post.author} size={44} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 text-[14.5px] font-bold text-foreground ">
            {primary ? (
              <button type="button" className="truncate hover:underline" onClick={() => onOpenGroup?.(primary.id)}>{primary.name}</button>
            ) : 'Group post'}
            {primary && (
              <BadgeCheck size={16} className="shrink-0 fill-sky-500 text-white dark:fill-sky-400" aria-label="Verified group" />
            )}
            {extraGroups.length > 0 && (
              <span className="group/more relative text-[12px] font-medium text-muted-foreground ">
                + {extraGroups.length} more
                <span className="pointer-events-none absolute left-0 top-5 z-20 hidden min-w-[180px] rounded-xl border border-border bg-card p-2 text-[12px] shadow-sm group-hover/more:block ">
                  {extraGroups.map((g) => <span key={g.id} className="block truncate py-0.5 text-foreground/80 ">{g.name}</span>)}
                </span>
              </span>
            )}
            {post.groups.some((g) => g.pinned) && <Pin size={12} className="text-amber-500" aria-label="Pinned" />}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground ">
            <Link to={post.author?.username ? `/u/${post.author.username}` : '#'} className="font-medium text-foreground/70 hover:underline ">
              {post.isMine ? 'You' : post.author?.name || 'Member'}
            </Link>
            {post.feeling && <span>is {feelingEmoji(post.feeling)} feeling {post.feeling}</span>}
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>{timeAgo(post.createdAt)}</time>
            <span aria-hidden>·</span>
            <PrivacyIcon privacy={primary?.privacy || 'private'} />
            {post.shareToFeed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary ">
                <Globe2 size={10} /> On feed
              </span>
            )}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label="Post options" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted ">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-border bg-card p-1.5 shadow-sm ">
              <button type="button" onClick={toggleSave} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground/80 hover:bg-muted/60 ">
                <Bookmark size={15} /> {post.savedByMe ? 'Unsave post' : 'Save post'}
              </button>
              <button type="button" onClick={shareToMainFeed} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground/80 hover:bg-muted/60 ">
                <Share2 size={15} /> Share to main feed
              </button>
              <button type="button" onClick={copyLink} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-foreground/80 hover:bg-muted/60 ">
                <Link2 size={15} /> Copy link
              </button>
              {post.isMine && (
                <button type="button" onClick={remove} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                  <Trash2 size={15} /> Delete post
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      {post.content && !post.poll && (
        <div className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground ">
          {long && !expanded ? `${post.content.slice(0, 320).trimEnd()}... ` : post.content}
          {long && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="font-semibold text-primary hover:underline ">
              {expanded ? ' Show less' : 'See more'}
            </button>
          )}
        </div>
      )}
      {post.poll && (
        <>
          <p className="mt-3 text-[15px] font-semibold text-foreground ">{post.poll.question || post.content}</p>
          <PollBlock poll={post.poll} onVoted={(poll) => onChange({ ...post, poll })} />
        </>
      )}
      <MediaGrid media={post.media} />

      {/* Stats */}
      {(post.counts.likes > 0 || post.counts.comments > 0 || post.counts.shares > 0) && (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-muted-foreground ">
          <span className="flex items-center gap-1.5">
            {post.counts.likes > 0 && (
              <>
                <span className="flex -space-x-1">
                  {(post.reactions.length ? post.reactions : [{ type: 'like', count: post.counts.likes }]).map((r) => (
                    <span key={r.type} className="grid h-5 w-5 place-items-center rounded-full bg-card text-[12px] ring-2 ring-card ">{r.type !== 'like' && isReactionType(r.type) ? <ReactionIcon type={r.type} size={18} staticImage /> : (REACTION_EMOJI[r.type] || REACTION_EMOJI.like)}</span>
                  ))}
                </span>
                {fmtCount(post.counts.likes)}
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            {post.counts.comments > 0 && (
              <button type="button" onClick={openComments} className="hover:underline">{fmtCount(post.counts.comments)} Comment{post.counts.comments === 1 ? '' : 's'}</button>
            )}
            {post.counts.comments > 0 && post.counts.shares > 0 && <span aria-hidden>•</span>}
            {post.counts.shares > 0 && <span>{fmtCount(post.counts.shares)} Share{post.counts.shares === 1 ? '' : 's'}</span>}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-1 border-t border-border pt-2 text-foreground/70 ">
        <div
          className="relative flex flex-1"
          onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; if (hoverTimer.current) window.clearTimeout(hoverTimer.current); if (!pickerOpen) hoverTimer.current = window.setTimeout(() => setPickerOpen(true), 500); }}
          onPointerLeave={(e) => { if (e.pointerType !== 'mouse') return; if (hoverTimer.current) window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setPickerOpen(false), 300); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setPickerOpen(false); }}
        >
          {pickerOpen && (
            <div className="absolute bottom-full left-0 z-20 pb-2">
              <ReactionBar options={POST_REACTIONS.map((r) => r.id)} value={isReactionType(post.myReaction) ? post.myReaction : null} onPick={(t) => react(t)} onEscape={() => setPickerOpen(false)} />
            </div>
          )}
          <button type="button" onClick={toggleLike} aria-pressed={post.likedByMe} className={`${actionBtn} ${post.likedByMe ? 'text-primary ' : ''}`}>
            {post.myReaction && post.myReaction !== 'like' && isReactionType(post.myReaction) ? <ReactionIcon type={post.myReaction} size={20} /> : post.myReaction && post.myReaction !== 'like' ? <span className="text-[16px]">{REACTION_EMOJI[post.myReaction]}</span> : <ThumbsUp size={17} className={post.likedByMe ? 'fill-current' : ''} />}
            <span className="capitalize">{reactionLabel}</span>
          </button>
        </div>
        <button type="button" onClick={openComments} className={actionBtn}><MessageCircle size={17} /> Comment</button>
        <button type="button" onClick={share} className={actionBtn}><Share2 size={17} /> Share</button>
        <button type="button" onClick={toggleSave} aria-pressed={post.savedByMe} className={`${actionBtn} ${post.savedByMe ? 'text-amber-500' : ''}`}>
          <Bookmark size={17} className={post.savedByMe ? 'fill-current' : ''} /> {post.savedByMe ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-2 space-y-3 border-t border-border pt-3 ">
          {comments === null && <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Loading comments...</p>}
          {comments?.length === 0 && <p className="text-[12px] text-muted-foreground ">No comments yet. Start the conversation.</p>}
          {comments?.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <PersonAvatar user={c.author} size={30} />
              <div className="min-w-0">
                <div className="rounded-xl bg-muted px-3 py-2 ">
                  <p className="text-[12.5px] font-semibold text-foreground ">{c.author?.name || 'Member'}</p>
                  <p className="whitespace-pre-wrap break-words text-[13px] text-foreground/80 ">{c.text}</p>
                </div>
                <p className="mt-0.5 pl-3 text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</p>
              </div>
            </div>
          ))}
          <form onSubmit={sendComment} className="flex items-center gap-2.5">
            <PersonAvatar user={me} size={30} />
            <div className="flex flex-1 items-center rounded-full bg-muted pr-1 ">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                aria-label="Write a comment"
                maxLength={2000}
                className="flex-1 bg-transparent px-3.5 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground "
              />
              <button type="submit" disabled={!commentText.trim() || sending} aria-label="Send comment" className="grid h-8 w-8 place-items-center rounded-full text-primary disabled:opacity-40 ">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}

export function PostMediaTile({
  post,
  onOpen,
}: {
  post: HubPost;
  onOpen?: () => void;
}) {
  const g = post.groups[0];
  const media = post.media[0];
  const src = media ? (resolveAvatarUrl(media.url) || media.url) : null;
  const text = (post.content || '').trim();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${card} group relative flex aspect-[4/5] w-full flex-col overflow-hidden text-left transition hover:shadow-md`}
    >
      <div className="relative min-h-0 flex-1 bg-muted">
        {src ? (
          media?.type === 'video' ? (
            <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 " />
          )
        ) : (
          <div className="flex h-full items-end p-3">
            <p className="line-clamp-6 text-[13px] font-medium leading-snug text-foreground ">{text || 'Post'}</p>
          </div>
        )}
        {media?.type === 'video' && (
          <span className="absolute right-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Video</span>
        )}
        {src && text && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-[12px] font-medium text-white">{text}</p>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-2.5 py-2 ">
        {g ? <GroupAvatar group={g} size={22} /> : <PersonAvatar user={post.author} size={22} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold text-foreground ">{g?.name || post.author?.name || 'Group post'}</p>
          <p className="truncate text-[10.5px] text-muted-foreground ">{timeAgo(post.createdAt)}</p>
        </div>
      </div>
    </button>
  );
}

export function PostSkeleton() {
  return (
    <div className={`${card} animate-pulse p-5`}>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-muted " />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 rounded bg-muted " />
          <div className="h-2.5 w-24 rounded bg-muted " />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-muted " />
        <div className="h-3 w-4/5 rounded bg-muted " />
      </div>
      <div className="mt-4 h-52 rounded-xl bg-muted " />
    </div>
  );
}
