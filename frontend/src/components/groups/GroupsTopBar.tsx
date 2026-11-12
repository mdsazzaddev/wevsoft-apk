import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Plus, PenSquare, UserPlus, X, ChevronDown } from 'lucide-react';
import { WevChatIcon } from '../../icons/WevChatIcon';
import { useStore } from '../../store';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { wevchatApi } from '../../lib/wevchatApi';
import { NotificationBadge } from '../ui/NotificationBadge';
import { PersonAvatar } from './groupsApi';
import { handleWevChatNavClick } from '../../lib/wevchatNav';

export type HubTab = 'groups' | 'discover' | 'events';

export function GroupsTopBar({
  query,
  onQuery,
  onCreatePost,
  onCreateGroup,
}: {
  query: string;
  onQuery: (q: string) => void;
  onCreatePost: () => void;
  onCreateGroup: () => void;
}) {
  const user = useStore((s) => s.user) as any;
  const token = useStore((s) => s.token);
  const { unread } = useUnreadNotifications();
  const [chatUnread, setChatUnread] = useState(0);
  const [draft, setDraft] = useState(query);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setDraft(query), [query]);
  useEffect(() => {
    if (draft === query) return;
    const t = window.setTimeout(() => onQuery(draft.trim()), 350);
    return () => window.clearTimeout(t);
     
  }, [draft]);

  useEffect(() => {
    if (!createOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setCreateOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [createOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!token) { setChatUnread(0); return; }
    let cancelled = false;
    wevchatApi
      .getConversations()
      .then((list: any) => {
        if (cancelled) return;
        const rows = Array.isArray(list) ? list : [];
        setChatUnread(rows.reduce((n: number, c: any) => n + (Number(c?.unreadCount) || 0), 0));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token]);

  const searchBox = (autoFocus = false) => (
    <label className="relative block w-full">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground " />
      <input
        type="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onQuery(draft.trim()); }}
        placeholder="Search groups, people, or posts..."
        aria-label="Search groups, people, or posts"
        className="h-11 w-full rounded-full border border-border bg-muted pl-11 pr-10 text-[13.5px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/15 "
      />
      {draft && (
        <button type="button" onClick={() => { setDraft(''); onQuery(''); }} aria-label="Clear search" className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted ">
          <X size={13} />
        </button>
      )}
    </label>
  );

  const iconBtn = 'relative grid h-10 w-10 place-items-center rounded-full text-foreground/80 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ';

  return (
    <header className="z-40 shrink-0 border-b border-border bg-card/95 ">
      <div className="mx-auto flex h-16 w-full items-center gap-3 px-3 sm:px-5 lg:gap-4 lg:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <Link to="/home" className="flex shrink-0 items-center" aria-label="Groups home">
            <span className="text-[18px] font-semibold tracking-tight text-foreground ">Groups</span>
          </Link>
        </div>

        <div className="mx-auto hidden w-full max-w-[560px] flex-1 sm:block lg:max-w-[640px]">{searchBox()}</div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => setMobileSearch((v) => !v)} aria-label="Search" className={`${iconBtn} sm:hidden`}><Search size={19} /></button>

          {/* Order: Create → WevChat → Notifications → Avatar */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              aria-label="Create"
              aria-expanded={createOpen}
              aria-haspopup="menu"
              className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-4"
            >
              <Plus size={17} strokeWidth={2.5} /> <span className="hidden sm:inline">Create</span>
            </button>
            {createOpen && (
              <div role="menu" className="absolute right-0 top-12 z-50 w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg ">
                {[
                  { label: 'Create Post', sub: 'Share to one or more groups', icon: PenSquare, tone: 'bg-primary/10 text-primary ', run: onCreatePost },
                  { label: 'Create Group', sub: 'Start a new community', icon: UserPlus, tone: 'bg-primary/10 text-primary', run: onCreateGroup },
                ].map((i) => (
                  <button
                    key={i.label}
                    type="button"
                    role="menuitem"
                    onClick={() => { setCreateOpen(false); i.run(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 "
                  >
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${i.tone}`}><i.icon size={17} /></span>
                    <span>
                      <span className="block text-[13px] font-semibold text-foreground ">{i.label}</span>
                      <span className="block text-[11.5px] text-muted-foreground ">{i.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/messages"
            aria-label="WevChat"
            title="WevChat"
            className={iconBtn}
            onClick={handleWevChatNavClick}
          >
            <WevChatIcon size={20} strokeWidth={1.8} />
            <NotificationBadge count={chatUnread} variant="rose" size="sm" className="absolute right-0 top-0" />
          </Link>
          <Link to="/notifications" aria-label="Notifications" title="Notifications" className={iconBtn}>
            <Bell size={19} />
            <NotificationBadge count={unread} variant="rose" size="sm" className="absolute right-0 top-0" />
          </Link>

          <Link
            to="/profile"
            aria-label="Open profile"
            title="Profile"
            className="ml-0.5 flex items-center gap-1 rounded-full p-0.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <PersonAvatar user={user} size={36} />
            <ChevronDown size={14} className="text-muted-foreground" />
          </Link>
        </div>
      </div>

      {mobileSearch && <div className="px-3 pb-3 sm:hidden">{searchBox(true)}</div>}
    </header>
  );
}
