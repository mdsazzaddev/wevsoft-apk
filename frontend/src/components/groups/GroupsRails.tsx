import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  LayoutGrid, UserCheck, UsersRound, Bookmark, Plus, ChevronRight, PenLine, Heart, MessageCircle, Loader2, Check, Clock, Flame, Sparkles, Globe2, Lock, EyeOff, Users, Compass, Send, Images,
} from 'lucide-react';
import { useStore } from '../../store';
import { resolveAvatarUrl } from '../UserAvatar';
import {
  hubFetch, catMeta, GroupAvatar, fmtCount, plural, gradFor, card,
  type HubGroup, type HubOverview, type HubTrending,
} from './groupsApi';

export type HubView = 'all' | 'joined' | 'mine' | 'saved';

export const VIEW_META: Record<HubView, { label: string; icon: React.FC<any>; title: string; sub: string }> = {
  all: { label: 'Joined Groups', icon: UsersRound, title: 'Joined Groups', sub: 'Communities you belong to — open one to catch up or post.' },
  joined: { label: 'Your Feed', icon: UserCheck, title: 'Your Groups Feed', sub: 'Everything happening inside your communities, in one place.' },
  mine: { label: 'My Posts', icon: LayoutGrid, title: 'My Posts', sub: 'Posts you have shared across your groups.' },
  saved: { label: 'Saved Posts', icon: Bookmark, title: 'Saved Posts', sub: 'Group posts you saved for later.' },
};

const SectionHead = ({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) => (
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-[14.5px] font-bold text-foreground ">{title}</h3>
    {action}
  </div>
);

const viewAllCls = 'text-[12px] font-semibold text-primary hover:text-primary ';

export function PrivacyBadge({ privacy }: { privacy: string }) {
  const Icon = privacy === 'public' ? Globe2 : privacy === 'secret' ? EyeOff : Lock;
  return <span className="inline-flex items-center gap-1 capitalize"><Icon size={11} /> {privacy}</span>;
}

// ── Join button (handles public join vs approval request) ──
export function useJoinGroup(onDone: (groupId: string, state: 'joined' | 'pending') => void) {
  const token = useStore((s) => s.token);
  const [busy, setBusy] = useState<string | null>(null);
  const join = async (g: HubGroup) => {
    if (busy) return;
    setBusy(g.id);
    try {
      const r = await hubFetch<{ message?: string }>(token, `/api/groups/${g.id}/join`, { method: 'POST' });
      const pending = /request/i.test(r?.message || '');
      toast.success(pending ? 'Request sent to the admins' : `You joined ${g.name}`);
      onDone(g.id, pending ? 'pending' : 'joined');
    } catch (e: any) {
      toast.error(e?.message || 'Could not join');
    } finally {
      setBusy(null);
    }
  };
  return { join, busy };
}

export function JoinButton({ group, busy, onJoin, size = 'sm' }: { group: HubGroup; busy: boolean; onJoin: () => void; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'h-8 px-3 text-[12px]' : 'h-9 px-4 text-[13px]';
  if (group.joined)
    return <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400 ${pad}`}><Check size={13} /> Joined</span>;
  if (group.pending)
    return <span className={`inline-flex items-center gap-1 rounded-full bg-muted font-semibold text-muted-foreground ${pad}`}><Clock size={13} /> Requested</span>;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onJoin(); }}
      disabled={busy}
      className={`inline-flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-60 ${pad}`}
    >
      {busy && <Loader2 size={13} className="animate-spin mr-1" />}Join
    </button>
  );
}

// ── Left rail ──
export function LeftRail({
  overview,
  view,
  category,
  onView,
  onCategory: _onCategory,
  onViewAllCategories,
  onOpenGroup,
  discoverActive,
}: {
  overview: HubOverview | null;
  view: HubView | '';
  category: string | null;
  onView: (v: HubView) => void;
  onCategory: (c: string | null) => void;
  onViewAllCategories: () => void;
  onOpenGroup: (id: string) => void;
  discoverActive?: boolean;
}) {
  void _onCategory;

  const joinedGroups = overview?.myGroups || [];
  const feedActive = view === 'joined' && !category && !discoverActive;
  const joinedActive = view === 'all' && !category && !discoverActive;
  const savedActive = view === 'saved' && !category && !discoverActive;

  const navBtn = (active: boolean) =>
    `group relative flex w-full items-center gap-2 rounded-r-xl py-1.5 pl-2.5 pr-2 text-left transition ${
      active
        ? 'bg-primary/10 text-primary before:absolute before:inset-y-1 before:left-0 before:w-[2.5px] before:rounded-full before:bg-primary '
        : 'text-foreground/80 hover:bg-muted/60 '
    }`;
  const navIcon = (active: boolean) =>
    `grid h-7 w-7 shrink-0 place-items-center ${
      active ? 'text-primary ' : 'text-muted-foreground '
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <section>
          <nav className="space-y-0.5" aria-label="Groups navigation">
            <button type="button" onClick={() => onView('joined')} aria-current={feedActive ? 'page' : undefined} className={navBtn(feedActive)}>
              <span className={navIcon(feedActive)}><Images size={15} strokeWidth={feedActive ? 2.25 : 1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">Your Feed</span>
                <span className="block truncate text-[10.5px] opacity-65">Posts from groups you follow</span>
              </span>
            </button>
            <button type="button" onClick={() => onView('all')} aria-current={joinedActive ? 'page' : undefined} className={navBtn(joinedActive)}>
              <span className={navIcon(joinedActive)}><UsersRound size={15} strokeWidth={joinedActive ? 2.25 : 1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">Joined Groups</span>
                <span className="block truncate text-[10.5px] opacity-65">Manage your communities</span>
              </span>
            </button>
            <button type="button" onClick={() => onView('saved')} aria-current={savedActive ? 'page' : undefined} className={navBtn(savedActive)}>
              <span className={navIcon(savedActive)}><Bookmark size={15} strokeWidth={savedActive ? 2.25 : 1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">Saved Posts</span>
                <span className="block truncate text-[10.5px] opacity-65">Keep for later</span>
              </span>
            </button>
            <button type="button" onClick={onViewAllCategories} aria-current={discoverActive ? 'page' : undefined} className={navBtn(!!discoverActive)}>
              <span className={navIcon(!!discoverActive)}><Compass size={15} strokeWidth={discoverActive ? 2.25 : 1.9} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold">Discover Groups</span>
                <span className="block truncate text-[10.5px] opacity-65">Find new communities</span>
              </span>
            </button>
          </nav>
        </section>

        {joinedGroups.length > 0 && (
          <section className="border-t border-border pt-4 ">
            <div className="mb-2 flex items-center justify-between px-1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground ">Joined Groups</h4>
              <span className="text-[11px] font-semibold text-muted-foreground ">{joinedGroups.length}</span>
            </div>
            <div className="space-y-0.5">
              {joinedGroups.slice(0, 8).map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => onOpenGroup(group.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-muted/60 "
                >
                  <GroupAvatar group={group} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-foreground ">{group.name}</span>
                    <span className="block text-[11px] text-muted-foreground ">{fmtCount(group.memberCount)} member{group.memberCount === 1 ? '' : 's'}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-border pt-3 ">
        <button
          type="button"
          onClick={onViewAllCategories}
          className="flex w-full items-center gap-2.5 rounded-xl bg-primary/10 px-3.5 py-2.5 text-[13px] font-semibold text-primary transition hover:bg-primary/15 "
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-sm ">
            <Compass size={15} />
          </span>
          <span className="flex-1 text-left">Discover Groups</span>
          <ChevronRight size={16} className="text-primary " />
        </button>
      </div>
    </div>
  );
}

export function GroupCard({ group, active, onOpen, onJoin, joinBusy }: { group: HubGroup; active?: boolean; onOpen: () => void; onJoin: () => void; joinBusy: boolean }) {
  const cover = resolveAvatarUrl(group.coverPhoto);
  const m = catMeta(group.category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`group relative flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-md ${
        active ? 'border-primary ring-2 ring-primary/25' : 'border-border '
      }`}
    >
      <div className={`relative h-[84px] overflow-hidden ${m.grad}`}>
        {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 " /> : <m.icon size={30} className="absolute right-3 top-3 text-foreground/15" />}
      </div>
      <div className="relative flex flex-1 flex-col px-3 pb-3 pt-7">
        <GroupAvatar group={group} size={40} className="absolute -top-5 left-3 ring-[3px] ring-card " />
        <p className="line-clamp-2 min-h-[36px] text-[13.5px] font-bold leading-[18px] text-foreground ">{group.name}</p>
        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted-foreground ">
          <Users size={11} /> {fmtCount(group.memberCount)} Member{group.memberCount === 1 ? '' : 's'}
        </p>
        {!group.joined && (
          <div className="mt-2.5">
            <JoinButton group={group} busy={joinBusy} onJoin={onJoin} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CreatePostTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[172px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center transition hover:shadow-md "
    >
      <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-sm transition ">
        <PenLine size={24} />
      </span>
      <span className="mt-1 text-[13.5px] font-bold text-foreground ">Create Post</span>
    </button>
  );
}

export function GroupListRow({ group, active, onOpen, onJoin, joinBusy }: { group: HubGroup; active?: boolean; onOpen: () => void; onJoin: () => void; joinBusy: boolean }) {
  const m = catMeta(group.category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-primary/10 ' : 'hover:bg-muted/60 '}`}
    >
      <GroupAvatar group={group} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-foreground ">{group.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted-foreground ">
          <span>{plural(group.memberCount, 'member')}</span>
          <span>·</span>
          <span>{plural(group.postCount, 'post')}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><m.icon size={11} /> {m.label}</span>
          <span>·</span>
          <PrivacyBadge privacy={group.privacy} />
        </p>
      </div>
      <JoinButton group={group} busy={joinBusy} onJoin={onJoin} />
    </div>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="w-full shrink-0 animate-pulse overflow-hidden rounded-xl border border-border bg-card ">
      <div className="h-[92px] bg-muted " />
      <div className="space-y-2 p-3 pt-6">
        <div className="h-3 w-3/4 rounded bg-muted " />
        <div className="h-2.5 w-1/2 rounded bg-muted " />
      </div>
    </div>
  );
}

// ── Right rail ──
export function RightRail({
  trending,
  suggested,
  onOpenPost,
  onOpenGroup,
  onJoin,
  joinBusy,
  onDiscover,
  onCreateGroup,
}: {
  trending: HubTrending[] | null;
  suggested: HubGroup[] | null;
  onOpenPost: (t: HubTrending) => void;
  onOpenGroup: (id: string) => void;
  onJoin: (g: HubGroup) => void;
  joinBusy: string | null;
  onDiscover: () => void;
  onCreateGroup: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className={`${card} p-4`}>
        <SectionHead
          title={
            <span className="inline-flex items-center gap-2">
              <Flame size={16} className="text-muted-foreground" />
              Trending Topics
            </span>
          }
          action={<span className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground"><Clock size={13} /> Last 14 days</span>}
        />
        {trending === null && <RailSkeleton rows={3} />}
        {trending?.length === 0 && (
          <EmptyMini icon={Flame} text="No trending topics yet. Posts with enough activity will appear here." />
        )}
        <div className="space-y-3">
          {trending?.map((t) => {
            const thumb = t.thumbnail ? resolveAvatarUrl(t.thumbnail.url) : null;
            return (
              <button key={t.id} type="button" onClick={() => onOpenPost(t)} className="group flex w-full items-center gap-3 text-left">
                <span className={`relative h-14 w-16 shrink-0 overflow-hidden rounded-lg ${gradFor(t.id)}`}>
                  {thumb && (t.thumbnail?.type === 'video' ? <video src={thumb} muted preload="metadata" className="h-full w-full object-cover" /> : <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />)}
                  {!thumb && <span className="absolute inset-0 grid place-items-center text-[18px] font-semibold opacity-70">{(t.group?.name || 'G').charAt(0)}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary">{t.title}</span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground ">{t.author?.name || 'Member'}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground ">
                    <span className="flex items-center gap-1"><Heart size={11} /> {fmtCount(t.likes)}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {fmtCount(t.comments)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${card} p-4`}>
        <SectionHead
          title={
            <span className="inline-flex items-center gap-2">
              <Users size={16} className="text-primary " />
              Suggested Groups
            </span>
          }
          action={
            <button type="button" onClick={onDiscover} className={`${viewAllCls} inline-flex items-center gap-0.5`}>
              View All <ChevronRight size={14} />
            </button>
          }
        />
        {suggested === null && <RailSkeleton rows={3} />}
        {suggested?.length === 0 && <EmptyMini icon={Sparkles} text="You're in every group we know about. Create a new one!" />}
        <div className="space-y-3">
          {suggested?.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <button type="button" onClick={() => onOpenGroup(g.id)} className="shrink-0"><GroupAvatar group={g} size={42} /></button>
              <button type="button" onClick={() => onOpenGroup(g.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-semibold text-foreground hover:underline ">{g.name}</span>
                <span className="block text-[11.5px] text-muted-foreground ">{fmtCount(g.memberCount)} Member{g.memberCount === 1 ? '' : 's'}</span>
              </button>
              <JoinButton group={g} busy={joinBusy === g.id} onJoin={() => onJoin(g)} />
            </div>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={onCreateGroup}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:bg-muted/60"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Send size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-foreground">Start a New Group</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">Create a community and invite people who share your interests.</span>
        </span>
      </button>
    </div>
  );
}

export function EmptyMini({ icon: Icon, text }: { icon: React.FC<any>; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 text-[12px] leading-snug text-muted-foreground ">
      <Icon size={18} className="shrink-0 text-muted-foreground " /> {text}
    </div>
  );
}

function RailSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-12 w-14 rounded-xl bg-muted " />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-4/5 rounded bg-muted " />
            <div className="h-2.5 w-1/2 rounded bg-muted " />
          </div>
        </div>
      ))}
    </div>
  );
}
